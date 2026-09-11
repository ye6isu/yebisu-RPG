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

fn data_definition_config(category: &str) -> Result<(&'static str, &'static str), String> {
    match category {
        "entityvars" => Ok(("java/net/ye6isu/yebisuRPG/entityvar/ModAttachments.java", "YCS_Entity_Attachments")),
        "attributes" => Ok(("java/net/ye6isu/yebisuRPG/attribute/ModAttributes.java", "YCS_Attributes")),
        "components" => Ok(("java/net/ye6isu/yebisuRPG/component/ModDataComponents.java", "YCS_Data_Components")),
        _ => Err(format!("Unsupported data definition category: {}", category)),
    }
}

fn validate_data_definition_id(id: &str) -> Result<(), String> {
    if id.is_empty() || !id.chars().all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '_') {
        return Err("Name must contain only lowercase letters, digits, and underscores".to_string());
    }
    Ok(())
}

fn data_definition_number(value: Option<&Value>, fallback: f64) -> f64 {
    value.and_then(Value::as_f64)
        .or_else(|| value.and_then(Value::as_str).and_then(|text| text.parse().ok()))
        .unwrap_or(fallback)
}

#[tauri::command]
fn save_data_definition(category: &str, previous_id: Option<&str>, content: &str) -> Result<String, String> {
    let (file, marker) = data_definition_config(category)?;
    let submitted: Value = serde_json::from_str(content)
        .map_err(|error| format!("Invalid data definition: {}", error))?;
    let submitted = submitted.as_object().ok_or_else(|| "Data definition must be an object".to_string())?;
    let name = submitted.get("name").and_then(Value::as_str).unwrap_or("").trim()
        .to_ascii_lowercase().replace(char::is_whitespace, "_");
    validate_data_definition_id(&name)?;
    let id = previous_id.filter(|value| !value.is_empty()).unwrap_or(&name).to_string();
    validate_data_definition_id(&id)?;

    let directory = ycs_data_dir().join(category);
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let path = directory.join(format!("{}.json", id));
    let previous: Option<Value> = if path.is_file() {
        Some(serde_json::from_str(&fs::read_to_string(&path).map_err(|error| error.to_string())?)
            .map_err(|error| format!("Invalid existing {} data: {}", category, error))?)
    } else { None };
    if previous_id.is_none() && previous.is_some() {
        return Err(format!("{} '{}' already exists", category, id));
    }

    let const_name: String = name.chars().map(|ch| if ch.is_ascii_alphanumeric() { ch.to_ascii_uppercase() } else { '_' }).collect();
    let mut payload = previous.as_ref().and_then(Value::as_object).cloned().unwrap_or_default();
    let line = match category {
        "attributes" => {
            let minimum = data_definition_number(submitted.get("min"), 0.0);
            let base = data_definition_number(submitted.get("base"), 0.0);
            let maximum = data_definition_number(submitted.get("max"), 100.0);
            if minimum > base || base > maximum {
                return Err("Attribute must satisfy Min <= Base <= Max".to_string());
            }
            let title_text = submitted.get("titleText").and_then(Value::as_str).unwrap_or("");
            let sync_to_client = submitted.get("syncToClient").and_then(Value::as_bool).unwrap_or(true);
            payload.insert("name".to_string(), Value::String(name.clone()));
            payload.insert("titleText".to_string(), Value::String(title_text.to_string()));
            payload.insert("min".to_string(), json!(minimum));
            payload.insert("base".to_string(), json!(base));
            payload.insert("max".to_string(), json!(maximum));
            payload.insert("syncToClient".to_string(), Value::Bool(sync_to_client));
            format!("    public static final DeferredHolder<Attribute, Attribute> {} = registerAttribute(\"{}\", {}D, {}D, {}D, {});", const_name, name, minimum, base, maximum, sync_to_client)
        }
        "entityvars" | "components" => {
            let kind = submitted.get("type").and_then(Value::as_str).unwrap_or("double");
            let (method, java_type) = match kind {
                "boolean" => ("registerBoolean", "Boolean"),
                "string" => ("registerString", "String"),
                "double" => ("registerDouble", "Double"),
                _ => return Err("Type must be Number, Boolean, or Text".to_string()),
            };
            let default_value = submitted.get("defaultValue").cloned().unwrap_or(Value::String(String::new()));
            payload.insert("name".to_string(), Value::String(name.clone()));
            payload.insert("type".to_string(), Value::String(kind.to_string()));
            payload.insert("defaultValue".to_string(), default_value.clone());
            if category == "components" {
                format!("    public static final DeferredHolder<DataComponentType<?>, DataComponentType<{}>> {} = {}(\"{}\");", java_type, const_name, method, name)
            } else {
                let literal = match kind {
                    "boolean" => if default_value.as_bool().unwrap_or(false) { "true".to_string() } else { "false".to_string() },
                    "string" => serde_json::to_string(default_value.as_str().unwrap_or("")).map_err(|error| error.to_string())?,
                    _ => data_definition_number(Some(&default_value), 0.0).to_string(),
                };
                format!("    public static final DeferredHolder<AttachmentType<?>, AttachmentType<{}>> {} = {}(\"{}\", {});", java_type, const_name, method, name, literal)
            }
        }
        _ => unreachable!(),
    };

    if let Some(previous) = &previous { remove_item_injections(previous)?; }
    inject_marker_content(file, marker, &line)?;
    payload.insert("_injections".to_string(), json!([{
        "type": "java-marker", "file": file, "marker": marker, "content": line,
    }]));
    fs::write(&path, serde_json::to_string_pretty(&Value::Object(payload)).map_err(|error| error.to_string())?)
        .map_err(|error| format!("Failed to save {}: {}", category, error))?;
    Ok(id)
}

#[tauri::command]
fn delete_data_definition(category: &str, id: &str) -> Result<(), String> {
    data_definition_config(category)?;
    validate_data_definition_id(id)?;
    let path = ycs_data_dir().join(category).join(format!("{}.json", id));
    if !path.is_file() { return Ok(()); }
    let previous: Value = serde_json::from_str(&fs::read_to_string(&path).map_err(|error| error.to_string())?)
        .map_err(|error| format!("Invalid existing {} data: {}", category, error))?;
    remove_item_injections(&previous)?;
    fs::remove_file(path).map_err(|error| format!("Failed to delete {}: {}", category, error))
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

fn detected_image_extension(data: &[u8]) -> Option<&'static str> {
    if data.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("png")
    } else if data.starts_with(b"\xff\xd8\xff") {
        Some("jpeg")
    } else if data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a") {
        Some("gif")
    } else if data.len() >= 12 && &data[..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        Some("webp")
    } else {
        None
    }
}

fn validate_image_data(extension: &str, data: &[u8]) -> Result<(), String> {
    let declared = if extension == "jpg" { "jpeg" } else { extension };
    let detected = detected_image_extension(data)
        .ok_or_else(|| "Image data is not a supported PNG, JPEG, GIF, or WebP file".to_string())?;
    if declared != detected {
        return Err(format!(
            "Image extension '{}' does not match its {} file data",
            extension,
            detected.to_ascii_uppercase(),
        ));
    }
    Ok(())
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

fn json_references_texture(value: &Value, texture_id: &str) -> bool {
    match value {
        Value::Object(object) => object.iter().any(|(key, child)| {
            let is_texture_field = key.to_ascii_lowercase().contains("texture");
            (is_texture_field && child.as_str() == Some(texture_id))
                || json_references_texture(child, texture_id)
        }),
        Value::Array(values) => values.iter().any(|child| json_references_texture(child, texture_id)),
        _ => false,
    }
}

#[tauri::command]
fn find_texture_usage(texture_id: &str) -> Result<Vec<String>, String> {
    let root = ycs_data_dir();
    if !root.is_dir() {
        return Ok(Vec::new());
    }

    let mut usages = Vec::new();
    for category_entry in fs::read_dir(&root).map_err(|error| error.to_string())? {
        let category_entry = category_entry.map_err(|error| error.to_string())?;
        let category_path = category_entry.path();
        let category = category_entry.file_name().to_string_lossy().to_string();
        if category == "textures" || !category_path.is_dir() {
            continue;
        }
        for object_entry in fs::read_dir(&category_path).map_err(|error| error.to_string())? {
            let object_entry = object_entry.map_err(|error| error.to_string())?;
            let object_path = object_entry.path();
            if object_path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            let Ok(source) = fs::read_to_string(&object_path) else { continue; };
            let Ok(object) = serde_json::from_str::<Value>(&source) else { continue; };
            if !json_references_texture(&object, texture_id) {
                continue;
            }
            let id = object_path.file_stem().and_then(|value| value.to_str()).unwrap_or("unknown");
            let label = object.get("displayName")
                .or_else(|| object.get("name"))
                .and_then(Value::as_str)
                .filter(|value| !value.trim().is_empty())
                .unwrap_or(id);
            usages.push(format!("{}/{} ({})", category, id, label));
        }
    }
    usages.sort();
    usages.dedup();
    Ok(usages)
}

fn refresh_item_outputs_for_texture(
    texture_id: &str,
    texture_extension: &str,
    texture_data: &[u8],
    write_outputs: bool,
) -> Result<Vec<String>, String> {
    let items_directory = ycs_data_dir().join("items");
    if !items_directory.is_dir() {
        return Ok(Vec::new());
    }

    let mut affected_items = Vec::new();
    for entry in fs::read_dir(&items_directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        let source = fs::read_to_string(&path)
            .map_err(|error| format!("Failed to read Item dependency: {}", error))?;
        let item: Value = serde_json::from_str(&source)
            .map_err(|error| format!("Invalid Item dependency JSON: {}", error))?;
        if item.get("texture").and_then(Value::as_str) != Some(texture_id) {
            continue;
        }

        let id = item.get("id")
            .and_then(Value::as_str)
            .or_else(|| path.file_stem().and_then(|value| value.to_str()))
            .ok_or_else(|| "Dependent Item is missing its ID".to_string())?;
        if texture_extension != "png" {
            return Err(format!(
                "Texture '{}' is used by Item '{}' and must remain a PNG",
                texture_id,
                id,
            ));
        }

        let generated_texture = format!("resources/assets/yebisurpg/textures/item/{}.png", id);
        let owns_generated_texture = item.get("_injections")
            .and_then(Value::as_array)
            .map(|injections| injections.iter().any(|injection| {
                injection.get("type").and_then(Value::as_str) == Some("created-file")
                    && injection.get("file").and_then(Value::as_str) == Some(generated_texture.as_str())
            }))
            .unwrap_or(false);
        if owns_generated_texture && write_outputs {
            let destination = safe_source_path(&generated_texture)?;
            if let Some(parent) = destination.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            fs::write(destination, texture_data)
                .map_err(|error| format!("Failed to refresh Item '{}' texture: {}", id, error))?;
        }
        affected_items.push(id.to_string());
    }
    affected_items.sort();
    affected_items.dedup();
    Ok(affected_items)
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

fn add_source_json_array_value(file: &str, key: &str, value: &str) -> Result<(), String> {
    let path = safe_source_path(file)?;
    let mut root: Value = if path.is_file() {
        serde_json::from_str(&fs::read_to_string(&path).map_err(|error| error.to_string())?)
            .map_err(|error| format!("Invalid JSON in {}: {}", file, error))?
    } else {
        json!({ "replace": false, "values": [] })
    };
    let object = root.as_object_mut().ok_or_else(|| format!("{} must contain a JSON object", file))?;
    object.entry("replace".to_string()).or_insert(Value::Bool(false));
    let values = object.entry(key.to_string()).or_insert_with(|| Value::Array(Vec::new()))
        .as_array_mut().ok_or_else(|| format!("{}.{} must be an array", file, key))?;
    if !values.iter().any(|entry| entry.as_str() == Some(value)) {
        values.push(Value::String(value.to_string()));
    }
    if let Some(parent) = path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
    fs::write(path, serde_json::to_string_pretty(&root).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())
}

fn remove_source_json_array_value(file: &str, key: &str, value: &str) -> Result<bool, String> {
    let path = safe_source_path(file)?;
    if !path.is_file() { return Ok(true); }
    let mut root: Value = serde_json::from_str(&fs::read_to_string(&path).map_err(|error| error.to_string())?)
        .map_err(|error| format!("Invalid JSON in {}: {}", file, error))?;
    let empty = if let Some(values) = root.get_mut(key).and_then(Value::as_array_mut) {
        values.retain(|entry| entry.as_str() != Some(value));
        values.is_empty()
    } else { true };
    fs::write(path, serde_json::to_string_pretty(&root).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    Ok(empty)
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
            "json-array-value" => {
                let empty = remove_source_json_array_value(
                    file,
                    injection.get("key").and_then(Value::as_str).unwrap_or("values"),
                    injection.get("value").and_then(Value::as_str).unwrap_or(""),
                )?;
                if empty && injection.get("removeFileWhenEmpty").and_then(Value::as_bool).unwrap_or(false) {
                    let path = safe_source_path(file)?;
                    if path.is_file() { fs::remove_file(path).map_err(|error| error.to_string())?; }
                }
            },
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
        "java-marker" => matches!(marker, "YCS_Mod_Items" | "YCS_Mod_Item_Imports" | "YCS_Tab_Contents" | "YCS_Mod_Item_Model" | "YCS_Mod_Fuel" | "YCS_Geo_Collect"),
        "json-key" => file.ends_with("/lang/en_us.json") && (key == format!("item.yebisurpg.{}", id) || key.starts_with(&format!("tooltip.yebisurpg.{}.", id))),
        "json-array-value" => injection.get("value").and_then(Value::as_str) == Some(format!("yebisurpg:{}", id).as_str()),
        "created-file" => {
            file == format!("resources/assets/yebisurpg/textures/item/{}.png", id)
                || file == format!("resources/assets/yebisurpg/textures/item/{}.png.mcmeta", id)
                || file == format!("resources/assets/yebisurpg/models/item/{}.json", id)
                || file.starts_with(&format!("resources/assets/yebisurpg/textures/item/{}_frame", id))
                || file.starts_with(&format!("resources/assets/yebisurpg/models/item/{}_frame", id))
                || file.starts_with(&format!("resources/assets/yebisurpg/textures/item/{}_state", id))
                || file.starts_with(&format!("resources/assets/yebisurpg/models/item/{}_state", id))
                || file.starts_with(&format!("resources/assets/yebisurpg/textures/geo/item/{}_state", id))
                || file.starts_with(&format!("resources/assets/yebisurpg/geo/item/{}_state", id))
                || file == format!("resources/assets/yebisurpg/textures/geo/item/{}.png", id)
                || file == format!("resources/assets/yebisurpg/geo/item/{}.geo.json", id)
                || file.starts_with(&format!("resources/data/yebisurpg/recipe/{}_shaped_", id))
                || file.starts_with(&format!("resources/data/yebisurpg/recipe/{}_shapeless_", id))
                || file.starts_with(&format!("resources/data/yebisurpg/recipe/{}_smelting_", id))
                || file.starts_with(&format!("resources/data/yebisurpg/recipe/{}_blasting_", id))
                || file.starts_with(&format!("resources/data/yebisurpg/recipe/{}_smoking_", id))
                || file.starts_with(&format!("resources/data/yebisurpg/recipe/{}_campfire_", id))
                || file.starts_with(&format!("resources/data/yebisurpg/recipe/{}_stonecutting_", id))
        }
        _ => false,
    }
}

fn build_shaped_recipe_outputs(id: &str, authoring_fields: &Value) -> Result<Vec<(String, Value)>, String> {
    let recipes = authoring_fields.get("recipes").and_then(Value::as_array).cloned().unwrap_or_default();
    let mut outputs = Vec::new();
    let mut shaped_number = 0usize;
    for recipe in recipes {
        if recipe.get("type").and_then(Value::as_str) != Some("shaped") { continue; }
        shaped_number += 1;
        let ingredients = recipe.get("ingredients").and_then(Value::as_array)
            .ok_or_else(|| format!("Shaped Crafting {} has no ingredient list", shaped_number))?;
        let pattern_values = recipe.get("pattern").and_then(Value::as_array)
            .ok_or_else(|| format!("Shaped Crafting {} has no 3x3 pattern", shaped_number))?;
        if pattern_values.len() != 9 {
            return Err(format!("Shaped Crafting {} must contain exactly 9 grid slots", shaped_number));
        }
        let mut pattern = Vec::with_capacity(3);
        let mut key = Map::new();
        let mut has_ingredient = false;
        for row in 0..3 {
            let mut pattern_row = String::with_capacity(3);
            for column in 0..3 {
                let value = &pattern_values[row * 3 + column];
                if value.is_null() {
                    pattern_row.push(' ');
                    continue;
                }
                let index = value.as_u64()
                    .ok_or_else(|| format!("Shaped Crafting {} has an invalid grid ingredient", shaped_number))?
                    as usize;
                let ingredient = ingredients.get(index).and_then(Value::as_str).unwrap_or("").trim();
                if ingredient.is_empty() {
                    return Err(format!("Shaped Crafting {} uses an empty ingredient brush", shaped_number));
                }
                if index >= 9 {
                    return Err(format!("Shaped Crafting {} supports at most 9 ingredient brushes", shaped_number));
                }
                let symbol = char::from(b'A' + index as u8);
                pattern_row.push(symbol);
                has_ingredient = true;
                key.entry(symbol.to_string()).or_insert_with(|| {
                    if let Some(tag) = ingredient.strip_prefix('#') {
                        json!({ "tag": tag })
                    } else {
                        json!({ "item": ingredient })
                    }
                });
            }
            pattern.push(Value::String(pattern_row));
        }
        if !has_ingredient {
            return Err(format!("Shaped Crafting {} must use at least one ingredient", shaped_number));
        }
        let yield_count = recipe.get("yield").and_then(Value::as_u64).unwrap_or(1).clamp(1, 99);
        let recipe_json = json!({
            "type": "minecraft:crafting_shaped",
            "pattern": pattern,
            "key": key,
            "result": { "id": format!("yebisurpg:{}", id), "count": yield_count }
        });
        outputs.push((
            format!("resources/data/yebisurpg/recipe/{}_shaped_{}.json", id, shaped_number),
            recipe_json,
        ));
    }
    Ok(outputs)
}

fn build_shapeless_recipe_outputs(id: &str, authoring_fields: &Value) -> Result<Vec<(String, Value)>, String> {
    let recipes = authoring_fields.get("recipes").and_then(Value::as_array).cloned().unwrap_or_default();
    let mut outputs = Vec::new();
    let mut shapeless_number = 0usize;
    for recipe in recipes {
        if recipe.get("type").and_then(Value::as_str) != Some("shapeless") { continue; }
        shapeless_number += 1;
        let authored_ingredients = recipe.get("ingredients").and_then(Value::as_array)
            .ok_or_else(|| format!("Shapeless Crafting {} has no ingredient list", shapeless_number))?;
        let mut ingredients = Vec::new();
        for (index, authored) in authored_ingredients.iter().enumerate() {
            let (value, count) = if let Some(value) = authored.as_str() {
                (value.trim(), 1u64)
            } else {
                (authored.get("value").and_then(Value::as_str).unwrap_or("").trim(), authored.get("count").and_then(Value::as_u64).unwrap_or(1).clamp(1, 9))
            };
            if value.is_empty() { return Err(format!("Shapeless Crafting {} ingredient {} is empty", shapeless_number, index + 1)); }
            let generated = if let Some(tag) = value.strip_prefix('#') { json!({ "tag": tag }) } else { json!({ "item": value }) };
            for _ in 0..count { ingredients.push(generated.clone()); }
        }
        if ingredients.is_empty() { return Err(format!("Shapeless Crafting {} must use at least one ingredient", shapeless_number)); }
        if ingredients.len() > 9 { return Err(format!("Shapeless Crafting {} requires {} slots; Minecraft supports at most 9", shapeless_number, ingredients.len())); }
        let yield_count = recipe.get("yield").and_then(Value::as_u64).unwrap_or(1).clamp(1, 99);
        outputs.push((format!("resources/data/yebisurpg/recipe/{}_shapeless_{}.json", id, shapeless_number), json!({
            "type": "minecraft:crafting_shapeless",
            "ingredients": ingredients,
            "result": { "id": format!("yebisurpg:{}", id), "count": yield_count }
        })));
    }
    Ok(outputs)
}

fn build_processing_recipe_outputs(id: &str, authoring_fields: &Value) -> Result<Vec<(String, Value)>, String> {
    let recipes = authoring_fields.get("recipes").and_then(Value::as_array).cloned().unwrap_or_default();
    let mut outputs = Vec::new();
    let mut type_numbers = std::collections::HashMap::<String, usize>::new();
    for recipe in recipes {
        let Some(kind) = recipe.get("type").and_then(Value::as_str) else { continue; };
        if !matches!(kind, "smelting" | "blasting" | "smoking" | "campfire" | "stonecutting") { continue; }
        let number = type_numbers.entry(kind.to_string()).or_insert(0);
        *number += 1;
        let ingredient = recipe.get("ingredient").and_then(Value::as_str).unwrap_or("").trim();
        if ingredient.is_empty() { return Err(format!("{} recipe {} requires an input ingredient", kind, number)); }
        let input = if let Some(tag) = ingredient.strip_prefix('#') { json!({ "tag": tag }) } else { json!({ "item": ingredient }) };
        let yield_count = recipe.get("yield").and_then(Value::as_u64)
            .ok_or_else(|| format!("{} recipe {} requires a yield", kind, number))?
            .clamp(1, 99);
        let recipe_json = if kind == "stonecutting" {
            json!({
                "type": "minecraft:stonecutting",
                "ingredient": input,
                "result": { "id": format!("yebisurpg:{}", id), "count": yield_count }
            })
        } else {
            let cooking_time = recipe.get("cookingTime").and_then(Value::as_u64)
                .ok_or_else(|| format!("{} recipe {} requires a cooking time", kind, number))?
                .max(1);
            let serializer = if kind == "campfire" { "campfire_cooking" } else { kind };
            json!({
                "type": format!("minecraft:{}", serializer),
                "ingredient": input,
                "result": { "id": format!("yebisurpg:{}", id), "count": yield_count },
                "experience": 0.0,
                "cookingtime": cooking_time
            })
        };
        outputs.push((format!("resources/data/yebisurpg/recipe/{}_{}_{}.json", id, kind, number), recipe_json));
    }
    Ok(outputs)
}

fn remove_basic_item_injections(item: &Value, id: &str) -> Result<Vec<Value>, String> {
    let injections = item.get("_injections").and_then(Value::as_array).cloned().unwrap_or_default();
    for injection in injections.iter().rev().filter(|entry| is_basic_item_injection(entry, id)) {
        let wrapper = json!({ "_injections": [injection] });
        remove_item_injections(&wrapper)?;
    }
    Ok(injections.into_iter().filter(|entry| !is_basic_item_injection(entry, id)).collect())
}

fn java_float(value: f64) -> String {
    let mut rendered = value.to_string();
    if !rendered.contains('.') && !rendered.contains('e') && !rendered.contains('E') { rendered.push_str(".0"); }
    format!("{}f", rendered)
}

fn build_basic_item_registration(id: &str, stack_size: u32, authored: &Map<String, Value>) -> Result<(String, Vec<String>), String> {
    let constant = id.to_ascii_uppercase();
    let tool_enabled = authored.get("toolEnabled").and_then(Value::as_bool).unwrap_or(false);
    let tool_type = authored.get("toolType").and_then(Value::as_str).unwrap_or("sword");
    let tool_class = match tool_type {
        "sword" => "SwordItem", "pickaxe" => "PickaxeItem", "axe" => "AxeItem",
        "shovel" => "ShovelItem", "hoe" => "HoeItem",
        _ => return Err(format!("Unsupported tool type '{}'", tool_type)),
    };
    let tier = match authored.get("toolTier").and_then(Value::as_str).unwrap_or("iron") {
        "wood" => "Tiers.WOOD", "stone" => "Tiers.STONE", "iron" => "Tiers.IRON",
        "gold" => "Tiers.GOLD", "diamond" => "Tiers.DIAMOND", "netherite" => "Tiers.NETHERITE",
        value => return Err(format!("Unsupported tool tier '{}'", value)),
    };
    let mut imports = Vec::<String>::new();
    let mut properties = if !tool_enabled && stack_size != 64 { format!(".stacksTo({})", stack_size.clamp(1, 99)) } else { String::new() };

    if authored.get("foodEnabled").and_then(Value::as_bool).unwrap_or(false) {
        let nutrition = authored.get("nutrition").and_then(Value::as_i64).unwrap_or(4).max(0);
        let saturation = authored.get("saturation").and_then(Value::as_f64).unwrap_or(0.3).max(0.0);
        let mut food = format!("new FoodProperties.Builder().nutrition({}).saturationModifier({})", nutrition, java_float(saturation));
        if authored.get("canAlwaysEat").and_then(Value::as_bool).unwrap_or(false) { food.push_str(".alwaysEdible()"); }
        if authored.get("fastFood").and_then(Value::as_bool).unwrap_or(false) { food.push_str(".fast()"); }
        properties.push_str(&format!(".food({}.build())", food));
    }

    let attack_damage = authored.get("attackDamage").and_then(Value::as_f64);
    let attack_speed = authored.get("attackSpeed").and_then(Value::as_f64);
    if attack_damage.is_some() || attack_speed.is_some() {
        if tool_enabled {
            let default_damage = match tool_type { "sword" => 3.0, "axe" => 5.0, "pickaxe" => 1.0, "shovel" => 1.5, _ => 0.0 };
            let default_speed = match tool_type { "sword" => -2.4, "axe" => -3.1, "pickaxe" => -2.8, "shovel" | "hoe" => -3.0, _ => 0.0 };
            let helper = if tool_type == "sword" { "SwordItem" } else { "DiggerItem" };
            properties.push_str(&format!(".attributes({}::createAttributes({}, {}, {}))", helper, tier, java_float(attack_damage.unwrap_or(default_damage)), java_float(attack_speed.unwrap_or(default_speed))).replace("::", "."));
            imports.push(if tool_type == "sword" { "import net.minecraft.world.item.SwordItem;" } else { "import net.minecraft.world.item.DiggerItem;" }.to_string());
        } else {
            let mut modifiers = Vec::new();
            if let Some(value) = attack_damage { modifiers.push(format!(".add(Attributes.ATTACK_DAMAGE, new AttributeModifier(Item.BASE_ATTACK_DAMAGE_ID, {}, AttributeModifier.Operation.ADD_VALUE), EquipmentSlotGroup.MAINHAND)", value)); }
            if let Some(value) = attack_speed { modifiers.push(format!(".add(Attributes.ATTACK_SPEED, new AttributeModifier(Item.BASE_ATTACK_SPEED_ID, {}, AttributeModifier.Operation.ADD_VALUE), EquipmentSlotGroup.MAINHAND)", value)); }
            properties.push_str(&format!(".attributes(ItemAttributeModifiers.builder(){}.build())", modifiers.join("")));
            imports.extend([
                "import net.minecraft.world.item.component.ItemAttributeModifiers;",
                "import net.minecraft.world.entity.ai.attributes.AttributeModifier;",
                "import net.minecraft.world.entity.ai.attributes.Attributes;",
                "import net.minecraft.world.entity.EquipmentSlotGroup;",
            ].into_iter().map(str::to_string));
        }
    }

    let tooltip_enabled = authored.get("tooltipEnabled").and_then(Value::as_bool).unwrap_or(false);
    let base_class = if tool_enabled { tool_class } else { "Item" };
    let args = if tool_enabled { format!("{}, new Item.Properties(){}", tier, properties) } else { format!("new Item.Properties(){}", properties) };
    let constructor = if tooltip_enabled {
        let normal = authored.get("tooltipNormal").and_then(Value::as_str).unwrap_or("").trim();
        let hidden = authored.get("tooltipHidden").and_then(Value::as_str).unwrap_or("").trim();
        let shift = authored.get("tooltipShift").and_then(Value::as_bool).unwrap_or(false);
        let default_hint = authored.get("tooltipUseDefaultHint").and_then(Value::as_bool).unwrap_or(true);
        let custom_hint = authored.get("tooltipShiftHint").and_then(Value::as_str).unwrap_or("").trim();
        let mut lines = Vec::new();
        if !normal.is_empty() { lines.push(format!("                tooltipData.add(Component.translatable(\"tooltip.yebisurpg.{}.normal\"));", id)); }
        if shift {
            if default_hint || !custom_hint.is_empty() {
                let key = if default_hint { "tooltip.yebisurpg.shift_hint".to_string() } else { format!("tooltip.yebisurpg.{}.shift_hint", id) };
                lines.push(format!("                if (!flag.hasShiftDown()) tooltipData.add(Component.translatable(\"{}\").withStyle(net.minecraft.ChatFormatting.GRAY));", key));
            }
            if !hidden.is_empty() { lines.push(format!("                if (flag.hasShiftDown()) tooltipData.add(Component.translatable(\"tooltip.yebisurpg.{}.hidden\"));", id)); }
        }
        lines.push("                super.appendHoverText(stack, context, tooltipData, flag);".to_string());
        imports.extend([
            "import java.util.List;", "import net.minecraft.network.chat.Component;",
            "import net.minecraft.world.item.ItemStack;", "import net.minecraft.world.item.TooltipFlag;",
            "import net.minecraft.world.item.Item.TooltipContext;",
        ].into_iter().map(str::to_string));
        format!("new {}({}) {{\n            @Override\n            public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltipData, TooltipFlag flag) {{\n{}\n            }}\n        }}", base_class, args, lines.join("\n"))
    } else {
        format!("new {}({})", base_class, args)
    };
    imports.sort(); imports.dedup();
    let registered_type = if tool_enabled { base_class } else { "Item" };
    Ok((format!("    public static final DeferredItem<{}> {} = ITEMS.register(\"{}\",\n            () -> {});", registered_type, constant, id, constructor), imports))
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
    authoring_fields: Value,
) -> Result<String, String> {
    validate_texture_id(id)?;
    if texture_id.is_empty() { return Err("Select a Texture before saving".to_string()); }
    if !matches!(holding_mode, "generated" | "handheld" | "3d") {
        return Err("Unsupported Holding Mode".to_string());
    }
    let authored = authoring_fields.as_object()
        .ok_or_else(|| "Item authoring fields must be an object".to_string())?;
    let (registration, item_imports) = build_basic_item_registration(id, stack_size, authored)?;
    let shaped_recipe_outputs = build_shaped_recipe_outputs(id, &authoring_fields)?;
    let shapeless_recipe_outputs = build_shapeless_recipe_outputs(id, &authoring_fields)?;
    let processing_recipe_outputs = build_processing_recipe_outputs(id, &authoring_fields)?;
    let (texture_extension, texture_data) = read_texture_sidecar(
        &ycs_data_dir().join("textures"),
        texture_id,
    )?.ok_or_else(|| format!("Texture '{}' was not found", texture_id))?;
    if texture_extension != "png" {
        return Err("Minecraft Item textures must use PNG files".to_string());
    }
    validate_image_data("png", &texture_data)
        .map_err(|error| format!("Selected Item Texture is invalid: {}", error))?;
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
    inject_marker_content(java_file, "YCS_Mod_Items", &registration)?;
    let mut injections = retained_injections;
    injections.push(json!({
        "type": "java-marker", "file": java_file, "marker": "YCS_Mod_Items", "content": registration,
    }));
    for import_line in item_imports {
        inject_marker_content(java_file, "YCS_Mod_Item_Imports", &import_line)?;
        injections.push(json!({ "type": "java-marker", "file": java_file, "marker": "YCS_Mod_Item_Imports", "content": import_line }));
    }

    let lang_file = "resources/assets/yebisurpg/lang/en_us.json";
    let lang_key = format!("item.yebisurpg.{}", id);
    set_source_json_key(lang_file, &lang_key, if display_name.is_empty() { id } else { display_name })?;
    injections.push(json!({ "type": "json-key", "file": lang_file, "key": lang_key }));
    for (suffix, field) in [("normal", "tooltipNormal"), ("shift_hint", "tooltipShiftHint"), ("hidden", "tooltipHidden")] {
        let value = authored.get(field).and_then(Value::as_str).unwrap_or("").trim();
        if value.is_empty() { continue; }
        let key = format!("tooltip.yebisurpg.{}.{}", id, suffix);
        set_source_json_key(lang_file, &key, value)?;
        injections.push(json!({ "type": "json-key", "file": lang_file, "key": key }));
    }

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

    if authored.get("fuelEnabled").and_then(Value::as_bool).unwrap_or(false) {
        let burn_time = authored.get("fuel").and_then(Value::as_i64).filter(|value| *value > 0)
            .ok_or_else(|| "Fuel requires a positive Burn Time".to_string())?;
        let fuel_file = "java/net/ye6isu/yebisuRPG/item/ModFuelEvents.java";
        let fuel_line = format!("        if (event.getItemStack().is(ModItems.{}.get())) {{ event.setBurnTime({}); }}", constant, burn_time);
        inject_marker_content(fuel_file, "YCS_Mod_Fuel", &fuel_line)?;
        injections.push(json!({ "type": "java-marker", "file": fuel_file, "marker": "YCS_Mod_Fuel", "content": fuel_line }));
    }

    let item_value = format!("yebisurpg:{}", id);
    for tag in authored.get("tags").and_then(Value::as_array).into_iter().flatten().filter_map(Value::as_str) {
        let Some((namespace, path)) = tag.trim_start_matches('#').split_once(':') else {
            return Err(format!("Invalid item tag '{}'", tag));
        };
        if namespace.is_empty() || path.is_empty() || path.contains("..") || path.starts_with('/') || path.starts_with('\\') {
            return Err(format!("Invalid item tag '{}'", tag));
        }
        let tag_file = format!("resources/data/{}/tags/item/{}.json", namespace, path);
        let tag_file_was_created = !safe_source_path(&tag_file)?.is_file();
        add_source_json_array_value(&tag_file, "values", &item_value)?;
        injections.push(json!({ "type": "json-array-value", "file": tag_file, "key": "values", "value": item_value, "removeFileWhenEmpty": tag_file_was_created }));
    }

    let texture_destination = format!("resources/assets/yebisurpg/textures/item/{}.png", id);
    let texture_path = safe_source_path(&texture_destination)?;
    if let Some(parent) = texture_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
    fs::write(texture_path, texture_data).map_err(|error| error.to_string())?;
    injections.push(json!({ "type": "created-file", "file": texture_destination }));

    let model_destination = format!("resources/assets/yebisurpg/models/item/{}.json", id);
    let additional_states = authored.get("states").and_then(Value::as_array).cloned().unwrap_or_default();
    if additional_states.is_empty() && holding_mode != "3d" {
        let parent = if holding_mode == "handheld" { "minecraft:item/handheld" } else { "minecraft:item/generated" };
        let model = json!({ "parent": parent, "textures": { "layer0": format!("yebisurpg:item/{}", id) } });
        let model_path = safe_source_path(&model_destination)?;
        if let Some(parent) = model_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
        fs::write(model_path, serde_json::to_string_pretty(&model).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
        injections.push(json!({ "type": "created-file", "file": model_destination }));
    } else {
        let mut states = vec![json!({
            "holdingMode": holding_mode,
            "texture": texture_id,
            "geoTexture": authored.get("geoTexture").and_then(Value::as_str).unwrap_or(texture_id),
            "geoModelData": authored.get("geoModelData").cloned().unwrap_or(Value::Null),
            "displayModelData": authored.get("displayModelData").cloned().unwrap_or(Value::Null),
        })];
        states.extend(additional_states);
        let mut specs = Vec::new();
        let mut overrides = Vec::new();
        let mut has_geo = false;
        for (index, state) in states.iter().enumerate() {
            let state_mode = state.get("holdingMode").and_then(Value::as_str).unwrap_or("generated");
            let state_id = format!("{}_state{}", id, index);
            let state_model_destination = format!("resources/assets/yebisurpg/models/item/{}.json", state_id);
            if state_mode == "3d" {
                has_geo = true;
                let geo_bytes = state.get("geoModelData").and_then(Value::as_array)
                    .ok_or_else(|| format!("State {} requires imported Model data", index + 1))?
                    .iter().map(|value| value.as_u64().filter(|byte| *byte <= 255).map(|byte| byte as u8).ok_or_else(|| "Invalid model byte data".to_string())).collect::<Result<Vec<_>, _>>()?;
                serde_json::from_slice::<Value>(&geo_bytes).map_err(|error| format!("State {} Model is invalid JSON: {}", index + 1, error))?;
                let geo_destination = format!("resources/assets/yebisurpg/geo/item/{}.geo.json", state_id);
                let geo_path = safe_source_path(&geo_destination)?;
                if let Some(parent) = geo_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
                fs::write(geo_path, geo_bytes).map_err(|error| error.to_string())?;
                injections.push(json!({ "type": "created-file", "file": geo_destination }));
                let state_texture = state.get("geoTexture").and_then(Value::as_str).unwrap_or("");
                if state_texture.is_empty() { return Err(format!("State {} requires a Texture", index + 1)); }
                let (extension, bytes) = read_texture_sidecar(&ycs_data_dir().join("textures"), state_texture)?
                    .ok_or_else(|| format!("State {} Texture '{}' was not found", index + 1, state_texture))?;
                if extension != "png" { return Err(format!("State {} Texture must be PNG", index + 1)); }
                let geo_texture_destination = format!("resources/assets/yebisurpg/textures/geo/item/{}.png", state_id);
                let geo_texture_path = safe_source_path(&geo_texture_destination)?;
                if let Some(parent) = geo_texture_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
                fs::write(geo_texture_path, bytes).map_err(|error| error.to_string())?;
                injections.push(json!({ "type": "created-file", "file": geo_texture_destination }));
                let display = state.get("displayModelData").and_then(Value::as_array)
                    .map(|values| values.iter().filter_map(|value| value.as_u64().filter(|byte| *byte <= 255).map(|byte| byte as u8)).collect::<Vec<_>>());
                let display_bytes = display.filter(|bytes| !bytes.is_empty()).unwrap_or_else(|| b"{\n  \"parent\": \"minecraft:builtin/entity\"\n}".to_vec());
                serde_json::from_slice::<Value>(&display_bytes).map_err(|error| format!("State {} Display Model is invalid JSON: {}", index + 1, error))?;
                let state_model_path = safe_source_path(&state_model_destination)?;
                if let Some(parent) = state_model_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
                fs::write(state_model_path, display_bytes).map_err(|error| error.to_string())?;
                injections.push(json!({ "type": "created-file", "file": state_model_destination }));
                specs.push(format!("new GeoItemRegistry.StateSpec(\"geo\", \"{}\", 0, false, 0, 0)", state_id));
            } else {
                let state_texture = state.get("texture").and_then(Value::as_str).unwrap_or("");
                if state_texture.is_empty() { return Err(format!("State {} requires a Texture", index + 1)); }
                let (extension, bytes) = read_texture_sidecar(&ycs_data_dir().join("textures"), state_texture)?
                    .ok_or_else(|| format!("State {} Texture '{}' was not found", index + 1, state_texture))?;
                if extension != "png" { return Err(format!("State {} Texture must be PNG", index + 1)); }
                let state_texture_destination = format!("resources/assets/yebisurpg/textures/item/{}.png", state_id);
                let state_texture_path = safe_source_path(&state_texture_destination)?;
                if let Some(parent) = state_texture_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
                fs::write(state_texture_path, bytes).map_err(|error| error.to_string())?;
                injections.push(json!({ "type": "created-file", "file": state_texture_destination }));
                let parent = if state_mode == "handheld" { "minecraft:item/handheld" } else { "minecraft:item/generated" };
                let state_model = json!({ "parent": parent, "textures": { "layer0": format!("yebisurpg:item/{}", state_id) } });
                let state_model_path = safe_source_path(&state_model_destination)?;
                if let Some(parent) = state_model_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
                fs::write(state_model_path, serde_json::to_string_pretty(&state_model).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
                injections.push(json!({ "type": "created-file", "file": state_model_destination }));
                specs.push(format!("new GeoItemRegistry.StateSpec(\"flat\", \"{}\", 0, false, 0, 0)", state_id));
            }
            overrides.push(json!({ "predicate": { "custom_model_data": index }, "model": format!("yebisurpg:item/{}", state_id) }));
        }
        let base_model = json!({ "parent": if has_geo { "minecraft:builtin/entity" } else { "minecraft:item/generated" }, "overrides": overrides });
        let base_model_path = safe_source_path(&model_destination)?;
        if let Some(parent) = base_model_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
        fs::write(base_model_path, serde_json::to_string_pretty(&base_model).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
        injections.push(json!({ "type": "created-file", "file": model_destination }));
        if has_geo {
            let registry_file = "java/net/ye6isu/yebisuRPG/client/renderer/GeoItemRegistry.java";
            let collect_line = format!("        tryRegisterMixedStates(items, ModItems.{}, java.util.List.of({}));", constant, specs.join(", "));
            inject_marker_content(registry_file, "YCS_Geo_Collect", &collect_line)?;
            injections.push(json!({ "type": "java-marker", "file": registry_file, "marker": "YCS_Geo_Collect", "content": collect_line }));
        }
    }

    for (recipe_destination, recipe) in shaped_recipe_outputs {
        let recipe_path = safe_source_path(&recipe_destination)?;
        if let Some(parent) = recipe_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
        fs::write(recipe_path, serde_json::to_string_pretty(&recipe).map_err(|error| error.to_string())?)
            .map_err(|error| error.to_string())?;
        injections.push(json!({ "type": "created-file", "file": recipe_destination }));
    }
    for (recipe_destination, recipe) in shapeless_recipe_outputs {
        let recipe_path = safe_source_path(&recipe_destination)?;
        if let Some(parent) = recipe_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
        fs::write(recipe_path, serde_json::to_string_pretty(&recipe).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
        injections.push(json!({ "type": "created-file", "file": recipe_destination }));
    }
    for (recipe_destination, recipe) in processing_recipe_outputs {
        let recipe_path = safe_source_path(&recipe_destination)?;
        if let Some(parent) = recipe_path.parent() { fs::create_dir_all(parent).map_err(|error| error.to_string())?; }
        fs::write(recipe_path, serde_json::to_string_pretty(&recipe).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
        injections.push(json!({ "type": "created-file", "file": recipe_destination }));
    }

    let object = item.as_object_mut().ok_or_else(|| "Existing Item JSON must be an object".to_string())?;
    for (key, value) in authored {
        if matches!(key.as_str(), "id" | "displayName" | "texture" | "holdingMode" | "stackSize" | "creativeTab" | "_injections") {
            continue;
        }
        object.insert(key.clone(), value.clone());
    }
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
) -> Result<Vec<String>, String> {
    validate_texture_id(id)?;
    let texture_ext = validate_image_extension(texture_ext)?;
    if texture_data.is_empty() {
        return Err("Texture image is empty".to_string());
    }
    validate_image_data(texture_ext, &texture_data)?;
    if let (Some(extension), Some(data)) = (mask_ext.as_deref(), mask_data.as_deref()) {
        let extension = validate_image_extension(extension)?;
        if !data.is_empty() {
            validate_image_data(extension, data)?;
        }
    }
    if let (Some(extension), Some(data)) = (emissive_ext.as_deref(), emissive_data.as_deref()) {
        let extension = validate_image_extension(extension)?;
        if !data.is_empty() {
            validate_image_data(extension, data)?;
        }
    }
    let affected_items = refresh_item_outputs_for_texture(id, texture_ext, &texture_data, false)?;

    let directory = ycs_data_dir().join("textures");
    fs::create_dir_all(&directory).map_err(|error| format!("Failed to create texture directory: {}", error))?;

    clear_texture_sidecar(&directory, id)?;
    clear_texture_sidecar(&directory, &format!("{}_mask", id))?;
    clear_texture_sidecar(&directory, &format!("{}_emissive", id))?;

    fs::write(directory.join(format!("{}.{}", id, texture_ext)), &texture_data)
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
    refresh_item_outputs_for_texture(id, texture_ext, &texture_data, true)?;
    Ok(affected_items)
}

#[tauri::command]
fn delete_texture_bundle(id: &str) -> Result<String, String> {
    validate_texture_id(id)?;
    let usages = find_texture_usage(id)?;
    if !usages.is_empty() {
        return Err(format!(
            "Texture '{}' is still used by: {}",
            id,
            usages.join(", "),
        ));
    }

    let directory = ycs_data_dir().join("textures");
    let metadata_path = directory.join(format!("{}.json", id));
    if metadata_path.is_file() {
        fs::remove_file(&metadata_path)
            .map_err(|error| format!("Failed to delete texture metadata: {}", error))?;
    }
    clear_texture_sidecar(&directory, id)?;
    clear_texture_sidecar(&directory, &format!("{}_mask", id))?;
    clear_texture_sidecar(&directory, &format!("{}_emissive", id))?;
    Ok(format!("Deleted texture {}", id))
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
              save_data_definition,
              delete_data_definition,
              load_ycs_data,
                load_texture_bundle,
                find_texture_usage,
                delete_texture_bundle,
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
