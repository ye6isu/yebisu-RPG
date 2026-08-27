use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex, OnceLock};
use serde_json::{json, Map, Value};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

struct TaskState {
    child: Option<Child>,
    output: Arc<Mutex<String>>,
}

static GRADLE_TASKS: OnceLock<Mutex<HashMap<String, TaskState>>> = OnceLock::new();

fn gradle_tasks() -> &'static Mutex<HashMap<String, TaskState>> {
    GRADLE_TASKS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn search_starts() -> Vec<PathBuf> {
    let mut starts = Vec::new();
    if let Ok(current_dir) = std::env::current_dir() {
        starts.push(current_dir);
    }
    if let Ok(executable) = std::env::current_exe() {
        if let Some(parent) = executable.parent() {
            starts.push(parent.to_path_buf());
        }
    }
    starts
}

fn mod_root() -> PathBuf {
    let starts = search_starts();
    for start in &starts {
        for ancestor in start.ancestors() {
            if ancestor.join("gradlew.bat").is_file() || ancestor.join("gradlew").is_file() {
                return ancestor.to_path_buf();
            }
        }
    }
    starts
        .into_iter()
        .next()
        .unwrap_or_else(|| PathBuf::from("."))
}

fn ycs_data_dir() -> PathBuf {
    let starts = search_starts();

    for start in &starts {
        for ancestor in start.ancestors() {
            let candidate = ancestor.join("ycs-data");
            if candidate.is_dir() {
                return candidate;
            }
        }
    }

    starts
        .into_iter()
        .next()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ycs-data")
}

fn source_root() -> PathBuf {
    mod_root().join("src").join("main")
}

fn safe_source_path(relative: &str) -> Result<PathBuf, String> {
    let relative_path = Path::new(relative);
    if relative_path.is_absolute()
        || relative_path.components().any(|component| matches!(
            component,
            std::path::Component::ParentDir | std::path::Component::RootDir | std::path::Component::Prefix(_)
        ))
    {
        return Err(format!("Unsafe generated path: {}", relative));
    }
    Ok(source_root().join(relative_path))
}

fn supported_gradle_task(task: &str) -> Result<&'static str, String> {
    match task {
        "runClient" => Ok("runClient"),
        "runData" => Ok("runData"),
        _ => Err(format!("Unsupported Gradle task: {}", task)),
    }
}

fn append_task_output(output: &Arc<Mutex<String>>, text: &str) {
    const MAX_OUTPUT_BYTES: usize = 1_000_000;
    if let Ok(mut current) = output.lock() {
        current.push_str(text);
        if current.len() > MAX_OUTPUT_BYTES {
            let mut remove = current.len() - MAX_OUTPUT_BYTES;
            while !current.is_char_boundary(remove) {
                remove += 1;
            }
            current.drain(..remove);
        }
    }
}

fn read_task_output<R: Read + Send + 'static>(reader: R, output: Arc<Mutex<String>>) {
    std::thread::spawn(move || {
        let mut reader = BufReader::new(reader);
        let mut bytes = Vec::new();
        loop {
            bytes.clear();
            match reader.read_until(b'\n', &mut bytes) {
                Ok(0) => break,
                Ok(_) => append_task_output(&output, &String::from_utf8_lossy(&bytes)),
                Err(error) => {
                    append_task_output(&output, &format!("\n[output error: {}]\n", error));
                    break;
                }
            }
        }
    });
}

fn start_gradle_task(task: &str, output: Arc<Mutex<String>>) -> Result<Child, String> {
    let root = mod_root();

    #[cfg(target_os = "windows")]
    let mut command = {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let wrapper = root.join("gradlew.bat");
        if !wrapper.exists() {
            return Err(format!("Gradle wrapper not found at {:?}", wrapper));
        }
        let mut command = Command::new("cmd.exe");
        command
            .arg("/D")
            .arg("/C")
            .arg(wrapper)
            .arg(task)
            .arg("--console=plain")
            .creation_flags(CREATE_NO_WINDOW);
        command
    };

    #[cfg(not(target_os = "windows"))]
    let mut command = {
        let wrapper = root.join("gradlew");
        if !wrapper.exists() {
            return Err(format!("Gradle wrapper not found at {:?}", wrapper));
        }
        let mut command = Command::new(wrapper);
        command.arg(task).arg("--console=plain");
        command
    };

    let mut child = command
        .current_dir(&root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start Gradle {}: {}", task, error))?;

    if let Some(stdout) = child.stdout.take() {
        read_task_output(stdout, Arc::clone(&output));
    }
    if let Some(stderr) = child.stderr.take() {
        read_task_output(stderr, output);
    }
    Ok(child)
}

fn stop_gradle_task(child: &mut Child) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let pid = child.id().to_string();
        let status = Command::new("taskkill.exe")
            .args(["/PID", pid.as_str(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|error| format!("Failed to close Gradle process tree: {}", error))?;
        if !status.success()
            && child
                .try_wait()
                .map_err(|error| error.to_string())?
                .is_none()
        {
            child
                .kill()
                .map_err(|error| format!("Failed to stop Gradle task: {}", error))?;
        }
    }

    #[cfg(not(target_os = "windows"))]
    child
        .kill()
        .map_err(|error| format!("Failed to stop Gradle task: {}", error))?;

    let _ = child.wait();
    Ok(())
}

#[tauri::command]
fn toggle_gradle_task(task: &str) -> Result<bool, String> {
    let task = supported_gradle_task(task)?;
    let mut tasks = gradle_tasks()
        .lock()
        .map_err(|_| "Gradle task state is unavailable".to_string())?;
    let state = tasks.entry(task.to_string()).or_insert_with(|| TaskState {
        child: None,
        output: Arc::new(Mutex::new(String::new())),
    });

    if let Some(mut child) = state.child.take() {
        if child
            .try_wait()
            .map_err(|error| error.to_string())?
            .is_none()
        {
            stop_gradle_task(&mut child)?;
            append_task_output(&state.output, "\n[stopped]\n");
            return Ok(false);
        }
    }

    let output = Arc::new(Mutex::new(format!("> gradlew {} --console=plain\n", task)));
    let child = start_gradle_task(task, Arc::clone(&output))?;
    state.output = output;
    state.child = Some(child);
    Ok(true)
}

#[tauri::command]
fn gradle_task_snapshot(task: &str) -> Result<(bool, String), String> {
    let task = supported_gradle_task(task)?;
    let mut tasks = gradle_tasks()
        .lock()
        .map_err(|_| "Gradle task state is unavailable".to_string())?;
    let state = tasks.entry(task.to_string()).or_insert_with(|| TaskState {
        child: None,
        output: Arc::new(Mutex::new(String::new())),
    });

    let finished = if let Some(child) = state.child.as_mut() {
        child.try_wait().map_err(|error| error.to_string())?
    } else {
        None
    };
    if let Some(status) = finished {
        state.child = None;
        append_task_output(&state.output, &format!("\n[process exited: {}]\n", status));
    }

    let running = state.child.is_some();
    let output = state
        .output
        .lock()
        .map_err(|_| "Gradle task output is unavailable".to_string())?
        .clone();
    Ok((running, output))
}

fn stop_all_gradle_tasks() {
    if let Ok(mut tasks) = gradle_tasks().lock() {
        for state in tasks.values_mut() {
            if let Some(mut child) = state.child.take() {
                let _ = stop_gradle_task(&mut child);
            }
        }
    }
}

#[tauri::command]
fn load_ycs_data(category: &str, id: &str) -> Result<String, String> {
    let path = ycs_data_dir().join(category).join(format!("{}.json", id));
    fs::read_to_string(&path).map_err(|error| format!("Failed to read: {}", error))
}

#[tauri::command]
fn list_ycs_data(category: &str) -> Result<Vec<String>, String> {
    let directory = ycs_data_dir().join(category);
    if !directory.exists() {
        return Ok(Vec::new());
    }

    let mut ids = Vec::new();
    for entry in fs::read_dir(&directory).map_err(|error| format!("Failed to list: {}", error))? {
        let entry = entry.map_err(|error| error.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if let Some(id) = name.strip_suffix(".json") {
            ids.push(id.to_string());
        }
    }
    ids.sort();
    Ok(ids)
}

fn validate_texture_id(id: &str) -> Result<(), String> {
    if id.is_empty() || !id.chars().all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '_') {
        return Err("Texture ID must contain only lowercase letters, digits, and underscores".to_string());
    }
    Ok(())
}

fn validate_image_extension(extension: &str) -> Result<&str, String> {
    match extension {
        "png" | "jpg" | "jpeg" | "gif" | "webp" => Ok(extension),
        _ => Err("Unsupported texture image extension".to_string()),
    }
}

fn clear_texture_sidecar(directory: &Path, id: &str) -> Result<(), String> {
    for extension in ["png", "jpg", "jpeg", "gif", "webp"] {
        let path = directory.join(format!("{}.{}", id, extension));
        if path.exists() {
            fs::remove_file(&path).map_err(|error| format!("Failed to replace texture image: {}", error))?;
        }
    }
    Ok(())
}

fn read_texture_sidecar(directory: &Path, id: &str) -> Result<Option<(String, Vec<u8>)>, String> {
    for extension in ["png", "jpg", "jpeg", "gif", "webp"] {
        let path = directory.join(format!("{}.{}", id, extension));
        if path.is_file() {
            let data = fs::read(&path)
                .map_err(|error| format!("Failed to read texture image: {}", error))?;
            return Ok(Some((extension.to_string(), data)));
        }
    }
    Ok(None)
}

#[tauri::command]
fn load_texture_bundle(
    id: &str,
) -> Result<(
    String,
    String,
    Vec<u8>,
    Option<String>,
    Option<Vec<u8>>,
    Option<String>,
    Option<Vec<u8>>,
), String> {
    validate_texture_id(id)?;
    let directory = ycs_data_dir().join("textures");
    let metadata = fs::read_to_string(directory.join(format!("{}.json", id)))
        .map_err(|error| format!("Failed to read texture metadata: {}", error))?;
    let (texture_ext, texture_data) = read_texture_sidecar(&directory, id)?
        .ok_or_else(|| format!("Texture image not found for {}", id))?;
    let mask = read_texture_sidecar(&directory, &format!("{}_mask", id))?;
    let emissive = read_texture_sidecar(&directory, &format!("{}_emissive", id))?;
    let (mask_ext, mask_data) = mask.map_or((None, None), |(extension, data)| {
        (Some(extension), Some(data))
    });
    let (emissive_ext, emissive_data) = emissive.map_or((None, None), |(extension, data)| {
        (Some(extension), Some(data))
    });
    Ok((
        metadata,
        texture_ext,
        texture_data,
        mask_ext,
        mask_data,
        emissive_ext,
        emissive_data,
    ))
}

fn inject_marker_content(file: &str, marker: &str, content: &str) -> Result<(), String> {
    let path = safe_source_path(file)?;
    let source = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read {}: {}", file, error))?;
    let marker_comment = format!("// {}", marker);
    let marker_position = source.find(&marker_comment)
        .ok_or_else(|| format!("Marker '{}' not found in {}", marker, file))?;
    let insert_position = source[..marker_position].rfind('\n').map(|position| position + 1)
        .unwrap_or(marker_position);
    let result = format!("{}{}\n{}", &source[..insert_position], content, &source[insert_position..]);
    fs::write(path, result).map_err(|error| format!("Failed to inject {}: {}", file, error))
}

fn remove_marker_content_value(file: &str, content: &str) -> Result<(), String> {
    let path = safe_source_path(file)?;
    let source = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read {}: {}", file, error))?;
    let with_newline = format!("{}\n", content);
    let result = if let Some(position) = source.find(&with_newline) {
        format!("{}{}", &source[..position], &source[position + with_newline.len()..])
    } else if let Some(position) = source.find(content.trim()) {
        let start = source[..position].rfind('\n').map(|value| value + 1).unwrap_or(position);
        let content_end = position + content.trim().len();
        let end = source[content_end..].find('\n').map(|value| content_end + value + 1)
            .unwrap_or(source.len());
        format!("{}{}", &source[..start], &source[end..])
    } else {
        return Ok(());
    };
    fs::write(path, result).map_err(|error| format!("Failed to clean {}: {}", file, error))
}

fn set_source_json_key(file: &str, key: &str, value: &str) -> Result<(), String> {
    let path = safe_source_path(file)?;
    let mut object: Map<String, Value> = if path.is_file() {
        serde_json::from_str(&fs::read_to_string(&path).map_err(|error| error.to_string())?)
            .unwrap_or_default()
    } else {
        Map::new()
    };
    object.insert(key.to_string(), Value::String(value.to_string()));
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, serde_json::to_string_pretty(&object).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())
}

fn delete_source_json_key(file: &str, key: &str) -> Result<(), String> {
    let path = safe_source_path(file)?;
    if !path.is_file() { return Ok(()); }
    let mut object: Map<String, Value> = serde_json::from_str(
        &fs::read_to_string(&path).map_err(|error| error.to_string())?,
    ).unwrap_or_default();
    object.remove(key);
    fs::write(path, serde_json::to_string_pretty(&object).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())
}

fn remove_item_injections(item: &Value) -> Result<(), String> {
    let Some(injections) = item.get("_injections").and_then(Value::as_array) else { return Ok(()); };
    for injection in injections.iter().rev() {
        let kind = injection.get("type").and_then(Value::as_str).unwrap_or("");
        let file = injection.get("file").and_then(Value::as_str).unwrap_or("");
        match kind {
            "java-marker" => remove_marker_content_value(
                file,
                injection.get("content").and_then(Value::as_str).unwrap_or(""),
            )?,
            "json-key" => delete_source_json_key(
                file,
                injection.get("key").and_then(Value::as_str).unwrap_or(""),
            )?,
            "created-file" => {
                let path = safe_source_path(file)?;
                if path.is_file() { fs::remove_file(path).map_err(|error| error.to_string())?; }
            }
            _ => {}
        }
    }
    Ok(())
}

fn is_basic_item_injection(injection: &Value, id: &str) -> bool {
    let kind = injection.get("type").and_then(Value::as_str).unwrap_or("");
    let file = injection.get("file").and_then(Value::as_str).unwrap_or("");
    let marker = injection.get("marker").and_then(Value::as_str).unwrap_or("");
    let key = injection.get("key").and_then(Value::as_str).unwrap_or("");
    match kind {
        "java-marker" => matches!(marker, "YCS_Mod_Items" | "YCS_Tab_Contents" | "YCS_Mod_Item_Model"),
        "json-key" => file.ends_with("/lang/en_us.json") && key == format!("item.yebisurpg.{}", id),
        "created-file" => {
            file == format!("resources/assets/yebisurpg/textures/item/{}.png", id)
                || file == format!("resources/assets/yebisurpg/textures/item/{}.png.mcmeta", id)
                || file == format!("resources/assets/yebisurpg/models/item/{}.json", id)
                || file.starts_with(&format!("resources/assets/yebisurpg/textures/item/{}_frame", id))
                || file.starts_with(&format!("resources/assets/yebisurpg/models/item/{}_frame", id))
        }
        _ => false,
    }
}

fn remove_basic_item_injections(item: &Value, id: &str) -> Result<Vec<Value>, String> {
    let injections = item.get("_injections").and_then(Value::as_array).cloned().unwrap_or_default();
    for injection in injections.iter().rev().filter(|entry| is_basic_item_injection(entry, id)) {
        let wrapper = json!({ "_injections": [injection] });
        remove_item_injections(&wrapper)?;
    }
    Ok(injections.into_iter().filter(|entry| !is_basic_item_injection(entry, id)).collect())
}

#[tauri::command]
fn save_basic_item(
    id: &str,
    last_saved_id: Option<String>,
    display_name: &str,
    texture_id: &str,
    holding_mode: &str,
    stack_size: u32,
    creative_tab: &str,
) -> Result<String, String> {
    validate_texture_id(id)?;
    if texture_id.is_empty() { return Err("Select a Texture before saving".to_string()); }
    if !matches!(holding_mode, "generated" | "handheld" | "3d") {
        return Err("Unsupported Holding Mode".to_string());
    }
    if holding_mode == "3d" {
        return Err("3D Model requires the geo model, geo texture, and display model fields".to_string());
    }
    let (texture_extension, texture_data) = read_texture_sidecar(
        &ycs_data_dir().join("textures"),
        texture_id,
    )?.ok_or_else(|| format!("Texture '{}' was not found", texture_id))?;
    if texture_extension != "png" {
        return Err("Minecraft Item textures must use PNG files".to_string());
    }
    let items_directory = ycs_data_dir().join("items");
    let previous_id = last_saved_id.as_deref().filter(|value| !value.is_empty()).unwrap_or(id);
    let previous_item_path = items_directory.join(format!("{}.json", previous_id));
    let item_path = items_directory.join(format!("{}.json", id));
    if previous_id != id && item_path.is_file() {
        return Err(format!("An Item with ID '{}' already exists", id));
    }
    let mut item = if previous_item_path.is_file() {
        serde_json::from_str::<Value>(&fs::read_to_string(&previous_item_path).map_err(|error| error.to_string())?)
            .unwrap_or_else(|_| json!({}))
    } else {
        json!({})
    };
    let retained_preview: Vec<Value> = item.get("_injections")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|entry| !is_basic_item_injection(entry, previous_id))
        .collect();
    if previous_id != id && !retained_preview.is_empty() {
        return Err("This Item has injections for fields not yet available in YCS4; keep its current ID until those fields are ported".to_string());
    }
    let retained_injections = remove_basic_item_injections(&item, previous_id)?;
    if previous_id != id && previous_item_path.is_file() {
        fs::remove_file(&previous_item_path)
            .map_err(|error| format!("Failed to remove old Item JSON: {}", error))?;
    }

    let java_file = "java/net/ye6isu/yebisuRPG/item/ModItems.java";
    let constant = id.to_ascii_uppercase();
    let properties = if stack_size == 64 { String::new() } else { format!(".stacksTo({})", stack_size.clamp(1, 99)) };
    let registration = format!(
        "    public static final DeferredItem<Item> {} = ITEMS.register(\"{}\",\n            () -> new Item(new Item.Properties(){}));",
        constant, id, properties,
    );
    inject_marker_content(java_file, "YCS_Mod_Items", &registration)?;
    let mut injections = retained_injections;
    injections.push(json!({
        "type": "java-marker", "file": java_file, "marker": "YCS_Mod_Items", "content": registration,
    }));

    let lang_file = "resources/assets/yebisurpg/lang/en_us.json";
    let lang_key = format!("item.yebisurpg.{}", id);
    set_source_json_key(lang_file, &lang_key, if display_name.is_empty() { id } else { display_name })?;
    injections.push(json!({ "type": "json-key", "file": lang_file, "key": lang_key }));

    if !creative_tab.is_empty() {
        let tab_file = "java/net/ye6isu/yebisuRPG/item/ModCreativeTabContents.java";
        let tab_line = if let Some(path) = creative_tab.strip_prefix("minecraft:") {
            format!("        if (event.getTabKey() == net.minecraft.world.item.CreativeModeTabs.{}) event.accept(ModItems.{}.get());", path.to_ascii_uppercase(), constant)
        } else {
            format!("        if (event.getTabKey() == ModCreativeModeTabs.{}.getKey()) event.accept(ModItems.{}.get());", creative_tab.to_ascii_uppercase(), constant)
        };
        inject_marker_content(tab_file, "YCS_Tab_Contents", &tab_line)?;
        injections.push(json!({ "type": "java-marker", "file": tab_file, "marker": "YCS_Tab_Contents", "content": tab_line }));
    }

    let texture_destination = format!("resources/assets/yebisurpg/textures/item/{}.png", id);
    let texture_path = safe_source_path(&texture_destination)?;
    if let Some(parent) = texture_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
    fs::write(texture_path, texture_data).map_err(|error| error.to_string())?;
    injections.push(json!({ "type": "created-file", "file": texture_destination }));

    let model_destination = format!("resources/assets/yebisurpg/models/item/{}.json", id);
    let parent = if holding_mode == "handheld" { "minecraft:item/handheld" } else { "minecraft:item/generated" };
    let model = json!({ "parent": parent, "textures": { "layer0": format!("yebisurpg:item/{}", id) } });
    let model_path = safe_source_path(&model_destination)?;
    if let Some(parent) = model_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
    fs::write(model_path, serde_json::to_string_pretty(&model).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    injections.push(json!({ "type": "created-file", "file": model_destination }));

    let object = item.as_object_mut().ok_or_else(|| "Existing Item JSON must be an object".to_string())?;
    object.insert("id".to_string(), Value::String(id.to_string()));
    object.insert("displayName".to_string(), Value::String(display_name.to_string()));
    object.insert("texture".to_string(), Value::String(texture_id.to_string()));
    object.insert("holdingMode".to_string(), Value::String(holding_mode.to_string()));
    object.insert("stackSize".to_string(), Value::from(stack_size.clamp(1, 99)));
    object.insert("creativeTab".to_string(), Value::String(creative_tab.to_string()));
    object.insert("_injections".to_string(), Value::Array(injections));
    if let Some(parent) = item_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
    fs::write(item_path, serde_json::to_string_pretty(&item).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    Ok(format!("Saved and injected item {}", id))
}

#[tauri::command]
fn delete_basic_item(id: &str) -> Result<String, String> {
    validate_texture_id(id)?;
    let item_path = ycs_data_dir().join("items").join(format!("{}.json", id));
    if !item_path.is_file() { return Ok(format!("Item {} is already removed", id)); }
    let item: Value = serde_json::from_str(
        &fs::read_to_string(&item_path).map_err(|error| format!("Failed to read Item JSON: {}", error))?,
    ).map_err(|error| format!("Invalid Item JSON: {}", error))?;
    remove_item_injections(&item)?;
    fs::remove_file(item_path).map_err(|error| format!("Failed to remove Item JSON: {}", error))?;
    Ok(format!("Removed item {} and its injections", id))
}

#[tauri::command]
fn save_texture_bundle(
    id: &str,
    metadata: &str,
    texture_ext: &str,
    texture_data: Vec<u8>,
    mask_ext: Option<String>,
    mask_data: Option<Vec<u8>>,
    emissive_ext: Option<String>,
    emissive_data: Option<Vec<u8>>,
) -> Result<String, String> {
    validate_texture_id(id)?;
    let texture_ext = validate_image_extension(texture_ext)?;
    if texture_data.is_empty() {
        return Err("Texture image is empty".to_string());
    }

    let directory = ycs_data_dir().join("textures");
    fs::create_dir_all(&directory).map_err(|error| format!("Failed to create texture directory: {}", error))?;

    clear_texture_sidecar(&directory, id)?;
    clear_texture_sidecar(&directory, &format!("{}_mask", id))?;
    clear_texture_sidecar(&directory, &format!("{}_emissive", id))?;

    fs::write(directory.join(format!("{}.{}", id, texture_ext)), texture_data)
        .map_err(|error| format!("Failed to save texture image: {}", error))?;

    if let (Some(extension), Some(data)) = (mask_ext.as_deref(), mask_data) {
        let extension = validate_image_extension(extension)?;
        if !data.is_empty() {
            fs::write(directory.join(format!("{}_mask.{}", id, extension)), data)
                .map_err(|error| format!("Failed to save texture mask: {}", error))?;
        }
    }

    if let (Some(extension), Some(data)) = (emissive_ext.as_deref(), emissive_data) {
        let extension = validate_image_extension(extension)?;
        if !data.is_empty() {
            fs::write(directory.join(format!("{}_emissive.{}", id, extension)), data)
                .map_err(|error| format!("Failed to save emissive texture: {}", error))?;
        }
    }

    fs::write(directory.join(format!("{}.json", id)), metadata)
        .map_err(|error| format!("Failed to save texture metadata: {}", error))?;
    Ok(format!("Saved texture {}", id))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(tauri_plugin_window_state::StateFlags::SIZE)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            list_ycs_data,
              load_ycs_data,
              load_texture_bundle,
              delete_basic_item,
              save_basic_item,
              save_texture_bundle,
            toggle_gradle_task,
            gradle_task_snapshot,
        ])
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                stop_all_gradle_tasks();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running YCS4");
}
