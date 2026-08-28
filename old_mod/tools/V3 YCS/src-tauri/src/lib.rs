use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Mutex, OnceLock};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

static GRADLE_TASKS: OnceLock<Mutex<HashMap<String, Child>>> = OnceLock::new();

fn gradle_tasks() -> &'static Mutex<HashMap<String, Child>> {
    GRADLE_TASKS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn mod_root() -> PathBuf {
    let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if path.ends_with("src-tauri") {
        path.pop();
    }
    if path.ends_with("ycs") {
        path.pop();
    }
    path
}

fn ycs_data_dir() -> PathBuf {
    mod_root().join("ycs-data")
}

fn src_root() -> PathBuf {
    mod_root().join("src").join("main")
}

// ── YCS Data (JSON per object) ──────────────────────────────────────

#[tauri::command]
fn save_ycs_data(category: &str, id: &str, content: &str) -> Result<String, String> {
    let mut path = ycs_data_dir().join(category);
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
    path.push(format!("{}.json", id));
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(format!("Saved to {:?}", path))
}

#[tauri::command]
fn load_ycs_data(category: &str, id: &str) -> Result<String, String> {
    let path = ycs_data_dir().join(category).join(format!("{}.json", id));
    fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))
}

#[tauri::command]
fn delete_ycs_data(category: &str, id: &str) -> Result<String, String> {
    let path = ycs_data_dir().join(category).join(format!("{}.json", id));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete: {}", e))?;
    }
    Ok(format!("Deleted {}", id))
}

#[tauri::command]
fn list_ycs_data(category: &str) -> Result<Vec<String>, String> {
    let dir = ycs_data_dir().join(category);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut ids = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| format!("Failed to list: {}", e))? {
        let entry = entry.map_err(|e| format!("{}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(".json") {
            ids.push(name.trim_end_matches(".json").to_string());
        }
    }
    ids.sort();
    Ok(ids)
}

// ── Texture management ──────────────────────────────────────────────

#[tauri::command]
fn save_texture(id: &str, metadata: &str) -> Result<String, String> {
    let dir = ycs_data_dir().join("textures");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    let path = dir.join(format!("{}.json", id));
    fs::write(&path, metadata).map_err(|e| format!("Failed to write: {}", e))?;
    Ok(format!("Saved texture {}", id))
}

#[tauri::command]
fn import_texture_image(id: &str, source_path: &str) -> Result<String, String> {
    let dir = ycs_data_dir().join("textures");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    let ext = source_path.rsplit('.').next().unwrap_or("png").to_lowercase();
    let dest = dir.join(format!("{}.{}", id, ext));
    fs::copy(source_path, &dest).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
fn load_texture(id: &str) -> Result<String, String> {
    let path = ycs_data_dir().join("textures").join(format!("{}.json", id));
    fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))
}

#[tauri::command]
fn load_texture_image(id: &str) -> Result<String, String> {
    let dir = ycs_data_dir().join("textures");
    let extensions = ["png", "jpg", "jpeg", "gif", "webp"];
    for ext in &extensions {
        let path = dir.join(format!("{}.{}", id, ext));
        if path.exists() {
            return read_image_base64(&path.to_string_lossy());
        }
    }
    Err(format!("No image file found for texture {}", id))
}

#[tauri::command]
fn delete_texture(id: &str) -> Result<String, String> {
    let dir = ycs_data_dir().join("textures");
    let json_path = dir.join(format!("{}.json", id));
    if json_path.exists() {
        fs::remove_file(&json_path).map_err(|e| format!("Failed to delete json: {}", e))?;
    }
    let extensions = ["png", "jpg", "jpeg", "gif", "webp"];
    for ext in &extensions {
        let img_path = dir.join(format!("{}.{}", id, ext));
        if img_path.exists() {
            fs::remove_file(&img_path).ok();
        }
    }
    Ok(format!("Deleted texture {}", id))
}

#[tauri::command]
fn list_textures() -> Result<Vec<String>, String> {
    let dir = ycs_data_dir().join("textures");
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut ids = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| format!("{}", e))? {
        let entry = entry.map_err(|e| format!("{}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(".json") {
            ids.push(name.trim_end_matches(".json").to_string());
        }
    }
    ids.sort();
    Ok(ids)
}

#[tauri::command]
fn find_texture_usage(texture_id: &str) -> Result<Vec<String>, String> {
    let items_dir = ycs_data_dir().join("items");
    if !items_dir.exists() {
        return Ok(vec![]);
    }
    let mut usages = Vec::new();
    for entry in fs::read_dir(&items_dir).map_err(|e| format!("{}", e))? {
        let entry = entry.map_err(|e| format!("{}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".json") { continue; }
        let content = fs::read_to_string(entry.path()).unwrap_or_default();
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            let matches = val.get("texture").and_then(|v| v.as_str()) == Some(texture_id)
                || val.get("geoTexture").and_then(|v| v.as_str()) == Some(texture_id);
            if matches {
                let item_id = name.trim_end_matches(".json").to_string();
                let display = val.get("displayName")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&item_id)
                    .to_string();
                usages.push(display);
            }
        }
    }
    Ok(usages)
}

#[tauri::command]
fn find_component_usage(component_id: &str) -> Result<Vec<String>, String> {
    let items_dir = ycs_data_dir().join("items");
    if !items_dir.exists() {
        return Ok(vec![]);
    }
    let mut usages = Vec::new();
    for entry in fs::read_dir(&items_dir).map_err(|e| format!("{}", e))? {
        let entry = entry.map_err(|e| format!("{}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".json") { continue; }
        let content = fs::read_to_string(entry.path()).unwrap_or_default();
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            let uses_component = val.get("dataComponents")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().any(|dc| dc.get("ref").and_then(|r| r.as_str()) == Some(component_id)))
                .unwrap_or(false);
            if uses_component {
                let item_id = name.trim_end_matches(".json").to_string();
                let display = val.get("displayName")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&item_id)
                    .to_string();
                usages.push(display);
            }
        }
    }
    Ok(usages)
}

#[tauri::command]
fn read_image_base64(path: &str) -> Result<String, String> {
    use std::io::Read;
    let mut file = fs::File::open(path).map_err(|e| format!("Failed to open: {}", e))?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf).map_err(|e| format!("Failed to read: {}", e))?;

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);

    let ext = path.rsplit('.').next().unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/png",
    };
    Ok(format!("data:{};base64,{}", mime, b64))
}

// ── Geo model management ───────────────────────────────────────────
//
// Models are grouped by owning object type — ycs-data/models/<kind>/<id>.* —
// instead of one flat pool, so items and entities (and any future model-owning
// type) don't sit mixed together on disk. `kind` is caller-supplied ("items",
// "entities", etc.) since every call site already knows which editor it's in.

fn models_dir(kind: &str) -> PathBuf {
    ycs_data_dir().join("models").join(kind)
}

#[tauri::command]
fn import_geo_model(kind: &str, id: &str, source_path: &str) -> Result<String, String> {
    let dir = models_dir(kind);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    let dest = dir.join(format!("{}.geo.json", id));
    fs::copy(source_path, &dest).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
fn load_geo_model_path(kind: &str, id: &str) -> Result<String, String> {
    let path = models_dir(kind).join(format!("{}.geo.json", id));
    if path.exists() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Err(format!("No geo model found for {}", id))
    }
}

#[tauri::command]
fn load_geo_model_content(kind: &str, id: &str) -> Result<String, String> {
    let path = models_dir(kind).join(format!("{}.geo.json", id));
    fs::read_to_string(&path).map_err(|e| format!("Failed to read geo model: {}", e))
}

#[tauri::command]
fn delete_geo_model(kind: &str, id: &str) -> Result<String, String> {
    let dir = models_dir(kind);
    let geo = dir.join(format!("{}.geo.json", id));
    if geo.exists() {
        fs::remove_file(&geo).map_err(|e| format!("Failed to delete geo: {}", e))?;
    }
    let display = dir.join(format!("{}.display.json", id));
    if display.exists() {
        fs::remove_file(&display).map_err(|e| format!("Failed to delete display: {}", e))?;
    }
    Ok(format!("Deleted model files for {}", id))
}

#[tauri::command]
fn list_geo_models(kind: &str) -> Result<Vec<String>, String> {
    let dir = models_dir(kind);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut ids = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| format!("{}", e))? {
        let entry = entry.map_err(|e| format!("{}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(".geo.json") {
            ids.push(name.trim_end_matches(".geo.json").to_string());
        }
    }
    ids.sort();
    Ok(ids)
}

#[tauri::command]
fn copy_geo_model_to_mod(kind: &str, model_id: &str, dest_file: &str) -> Result<String, String> {
    let src = models_dir(kind).join(format!("{}.geo.json", model_id));
    if !src.exists() {
        return Err(format!("No geo model found for {}", model_id));
    }
    let dest = src_root().join(dest_file);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    fs::copy(&src, &dest).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(format!("Copied to {:?}", dest))
}

#[tauri::command]
fn rename_geo_model(kind: &str, old_id: &str, new_id: &str) -> Result<String, String> {
    let dir = models_dir(kind);
    let geo_src = dir.join(format!("{}.geo.json", old_id));
    if geo_src.exists() {
        let geo_dest = dir.join(format!("{}.geo.json", new_id));
        fs::rename(&geo_src, &geo_dest).map_err(|e| format!("Failed to rename geo: {}", e))?;
    }
    let display_src = dir.join(format!("{}.display.json", old_id));
    if display_src.exists() {
        let display_dest = dir.join(format!("{}.display.json", new_id));
        fs::rename(&display_src, &display_dest).map_err(|e| format!("Failed to rename display: {}", e))?;
    }
    Ok(format!("Renamed model files from {} to {}", old_id, new_id))
}

// ── Animation file management (Entities) ───────────────────────────

#[tauri::command]
fn import_animation_file(kind: &str, id: &str, source_path: &str) -> Result<String, String> {
    let dir = models_dir(kind);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    let dest = dir.join(format!("{}.animation.json", id));
    fs::copy(source_path, &dest).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
fn load_animation_file_path(kind: &str, id: &str) -> Result<String, String> {
    let path = models_dir(kind).join(format!("{}.animation.json", id));
    if path.exists() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Err(format!("No animation file found for {}", id))
    }
}

#[tauri::command]
fn delete_animation_file(kind: &str, id: &str) -> Result<String, String> {
    let path = models_dir(kind).join(format!("{}.animation.json", id));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete animation file: {}", e))?;
    }
    Ok(format!("Deleted animation file for {}", id))
}

#[tauri::command]
fn copy_animation_file_to_mod(kind: &str, id: &str, dest_file: &str) -> Result<String, String> {
    let src = models_dir(kind).join(format!("{}.animation.json", id));
    if !src.exists() {
        return Err(format!("No animation file found for {}", id));
    }
    let dest = src_root().join(dest_file);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    fs::copy(&src, &dest).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(format!("Copied to {:?}", dest))
}

#[tauri::command]
fn rename_animation_file(kind: &str, old_id: &str, new_id: &str) -> Result<String, String> {
    let dir = models_dir(kind);
    let src = dir.join(format!("{}.animation.json", old_id));
    if src.exists() {
        let dest = dir.join(format!("{}.animation.json", new_id));
        fs::rename(&src, &dest).map_err(|e| format!("Failed to rename animation file: {}", e))?;
    }
    Ok(format!("Renamed animation file from {} to {}", old_id, new_id))
}

#[tauri::command]
fn import_display_model(kind: &str, id: &str, source_path: &str) -> Result<String, String> {
    let dir = models_dir(kind);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    let dest = dir.join(format!("{}.display.json", id));
    fs::copy(source_path, &dest).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
fn load_display_model(kind: &str, id: &str) -> Result<String, String> {
    let path = models_dir(kind).join(format!("{}.display.json", id));
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))
    } else {
        Err(format!("No display model found for {}", id))
    }
}

#[tauri::command]
fn copy_display_model_to_mod(kind: &str, model_id: &str, dest_file: &str) -> Result<String, String> {
    let src = models_dir(kind).join(format!("{}.display.json", model_id));
    if !src.exists() {
        return Err(format!("No display model found for {}", model_id));
    }
    let dest = src_root().join(dest_file);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    fs::copy(&src, &dest).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(format!("Copied to {:?}", dest))
}

// ── Injection engine ────────────────────────────────────────────────

#[tauri::command]
fn inject_marker(file: &str, marker: &str, content: &str) -> Result<String, String> {
    let path = src_root().join(file);
    let source = fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", file, e))?;

    let marker_comment = format!("// {}", marker);
    if let Some(pos) = source.find(&marker_comment) {
        let insert_pos = source[..pos].rfind('\n').map(|p| p + 1).unwrap_or(pos);
        let mut result = String::with_capacity(source.len() + content.len() + 1);
        result.push_str(&source[..insert_pos]);
        result.push_str(content);
        result.push('\n');
        result.push_str(&source[insert_pos..]);
        fs::write(&path, &result).map_err(|e| format!("Failed to write: {}", e))?;
        Ok("Injected".to_string())
    } else {
        Err(format!("Marker '{}' not found in {}", marker, file))
    }
}

#[tauri::command]
fn remove_marker_content(file: &str, _marker: &str, content: &str) -> Result<String, String> {
    let path = src_root().join(file);
    let source = fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))?;

    let search = format!("{}\n", content);
    if let Some(pos) = source.find(&search) {
        let mut result = String::with_capacity(source.len());
        result.push_str(&source[..pos]);
        result.push_str(&source[pos + search.len()..]);
        fs::write(&path, &result).map_err(|e| format!("Failed to write: {}", e))?;
        return Ok("Removed".to_string());
    }

    let search_no_newline = content.trim();
    if let Some(pos) = source.find(search_no_newline) {
        let start = source[..pos].rfind('\n').map(|p| p + 1).unwrap_or(pos);
        let end_offset = pos + search_no_newline.len();
        let end = source[end_offset..].find('\n').map(|p| end_offset + p + 1).unwrap_or(source.len());
        let mut result = String::with_capacity(source.len());
        result.push_str(&source[..start]);
        result.push_str(&source[end..]);
        fs::write(&path, &result).map_err(|e| format!("Failed to write: {}", e))?;
        return Ok("Removed".to_string());
    }

    Err(format!("Content not found in {}", file))
}

#[tauri::command]
fn set_json_key(file: &str, key: &str, value: &str) -> Result<String, String> {
    let path = src_root().join(file);
    let mut obj: serde_json::Map<String, Value> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
        }
        serde_json::Map::new()
    };

    obj.insert(key.to_string(), Value::String(value.to_string()));

    let mut sorted: Vec<_> = obj.into_iter().collect();
    sorted.sort_by(|a, b| a.0.cmp(&b.0));
    let sorted_map: serde_json::Map<String, Value> = sorted.into_iter().collect();

    let json = serde_json::to_string_pretty(&sorted_map).map_err(|e| format!("{}", e))?;
    fs::write(&path, &json).map_err(|e| format!("Failed to write: {}", e))?;
    Ok("Set key".to_string())
}

#[tauri::command]
fn delete_json_key(file: &str, key: &str) -> Result<String, String> {
    let path = src_root().join(file);
    if !path.exists() {
        return Ok("File doesn't exist".to_string());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))?;
    let mut obj: serde_json::Map<String, Value> =
        serde_json::from_str(&content).unwrap_or_default();
    obj.remove(key);
    let json = serde_json::to_string_pretty(&obj).map_err(|e| format!("{}", e))?;
    fs::write(&path, &json).map_err(|e| format!("Failed to write: {}", e))?;
    Ok("Deleted key".to_string())
}

#[tauri::command]
fn mod_file_exists(file: &str) -> Result<bool, String> {
    Ok(src_root().join(file).exists())
}

#[tauri::command]
fn write_mod_file(file: &str, content: &str) -> Result<String, String> {
    let path = src_root().join(file);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write: {}", e))?;
    Ok(format!("Wrote {:?}", path))
}

#[tauri::command]
fn write_mod_file_base64(file: &str, data: &str) -> Result<String, String> {
    let path = src_root().join(file);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
    }

    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("Base64 decode error: {}", e))?;
    fs::write(&path, &bytes).map_err(|e| format!("Failed to write: {}", e))?;
    Ok(format!("Wrote binary {:?}", path))
}

#[tauri::command]
fn delete_mod_file(file: &str) -> Result<String, String> {
    let path = src_root().join(file);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete: {}", e))?;
    }
    Ok(format!("Deleted {:?}", path))
}

#[tauri::command]
fn rename_texture_image(old_id: &str, new_id: &str) -> Result<String, String> {
    let dir = ycs_data_dir().join("textures");
    let extensions = ["png", "jpg", "jpeg", "gif", "webp"];
    for ext in &extensions {
        let src = dir.join(format!("{}.{}", old_id, ext));
        if src.exists() {
            let dest = dir.join(format!("{}.{}", new_id, ext));
            fs::rename(&src, &dest).map_err(|e| format!("Failed to rename: {}", e))?;
            return Ok(format!("Renamed to {:?}", dest));
        }
    }
    Err(format!("No image file found for texture {}", old_id))
}

#[tauri::command]
fn copy_texture_to_mod(texture_id: &str, dest_file: &str) -> Result<String, String> {
    let tex_dir = ycs_data_dir().join("textures");
    let extensions = ["png", "jpg", "jpeg", "gif", "webp"];
    for ext in &extensions {
        let src = tex_dir.join(format!("{}.{}", texture_id, ext));
        if src.exists() {
            let dest = src_root().join(dest_file);
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
            }
            fs::copy(&src, &dest).map_err(|e| format!("Failed to copy: {}", e))?;
            return Ok(format!("Copied to {:?}", dest));
        }
    }
    Err(format!("No image file found for texture {}", texture_id))
}

/// Slices a spritesheet texture (single column, N rows, one frame per row) into
/// individual per-frame PNGs and writes them into the mod at `<dest_dir>/<dest_stem>_frame<N>.png`.
/// Returns the list of relative dest_file paths written (frame 0 first), for `_injections` tracking.
#[tauri::command]
fn write_item_frame_textures(texture_id: &str, rows: u32, dest_dir: &str, dest_stem: &str) -> Result<Vec<String>, String> {
    let tex_dir = ycs_data_dir().join("textures");
    let extensions = ["png", "jpg", "jpeg", "gif", "webp"];
    let src = extensions
        .iter()
        .map(|ext| tex_dir.join(format!("{}.{}", texture_id, ext)))
        .find(|p| p.exists())
        .ok_or_else(|| format!("No image file found for texture {}", texture_id))?;

    let img = image::open(&src).map_err(|e| format!("Failed to decode image: {}", e))?;
    let (width, height) = (img.width(), img.height());
    if rows == 0 || height % rows != 0 {
        return Err(format!("Image height {} is not evenly divisible by {} rows", height, rows));
    }
    let frame_height = height / rows;

    let dest_dir_path = src_root().join(dest_dir);
    fs::create_dir_all(&dest_dir_path).map_err(|e| format!("Failed to create dir: {}", e))?;

    let mut written = Vec::new();
    for row in 0..rows {
        let frame = img.crop_imm(0, row * frame_height, width, frame_height);
        let dest_rel = format!("{}/{}_frame{}.png", dest_dir, dest_stem, row);
        let dest_path = src_root().join(&dest_rel);
        frame.save(&dest_path).map_err(|e| format!("Failed to write frame {}: {}", row, e))?;
        written.push(dest_rel);
    }
    Ok(written)
}

#[tauri::command]
fn get_mod_root() -> String {
    mod_root().to_string_lossy().to_string()
}

fn supported_gradle_task(task: &str) -> Result<&'static str, String> {
    let task = match task {
        "runClient" => "runClient",
        "runData" => "runData",
        _ => return Err(format!("Unsupported Gradle task: {}", task)),
    };
    Ok(task)
}

fn start_gradle_task(task: &str) -> Result<Child, String> {
    let root = mod_root();

    #[cfg(target_os = "windows")]
    let mut command = {
        const CREATE_NEW_CONSOLE: u32 = 0x00000010;
        let wrapper = root.join("gradlew.bat");
        if !wrapper.exists() {
            return Err(format!("Gradle wrapper not found at {:?}", wrapper));
        }
        let mut command = Command::new("cmd.exe");
        command
            .arg("/C")
            .arg(wrapper)
            .arg(task)
            .creation_flags(CREATE_NEW_CONSOLE);
        command
    };

    #[cfg(not(target_os = "windows"))]
    let mut command = {
        let wrapper = root.join("gradlew");
        if !wrapper.exists() {
            return Err(format!("Gradle wrapper not found at {:?}", wrapper));
        }
        let mut command = Command::new(wrapper);
        command.arg(task);
        command
    };

    command
        .current_dir(&root)
        .spawn()
        .map_err(|e| format!("Failed to start Gradle {}: {}", task, e))
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
            .map_err(|e| format!("Failed to close Gradle process tree: {}", e))?;
        if !status.success() && child.try_wait().map_err(|e| e.to_string())?.is_none() {
            child.kill().map_err(|e| format!("Failed to stop Gradle task: {}", e))?;
        }
    }

    #[cfg(not(target_os = "windows"))]
    child.kill().map_err(|e| format!("Failed to stop Gradle task: {}", e))?;

    let _ = child.wait();
    Ok(())
}

#[tauri::command]
fn toggle_gradle_task(task: &str) -> Result<bool, String> {
    let task = supported_gradle_task(task)?;
    let mut tasks = gradle_tasks()
        .lock()
        .map_err(|_| "Gradle task state is unavailable".to_string())?;

    if let Some(mut child) = tasks.remove(task) {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() {
            stop_gradle_task(&mut child)?;
            return Ok(false);
        }
    }

    tasks.insert(task.to_string(), start_gradle_task(task)?);
    Ok(true)
}

#[tauri::command]
fn gradle_task_running(task: &str) -> Result<bool, String> {
    let task = supported_gradle_task(task)?;
    let mut tasks = gradle_tasks()
        .lock()
        .map_err(|_| "Gradle task state is unavailable".to_string())?;
    let running = if let Some(child) = tasks.get_mut(task) {
        child.try_wait().map_err(|e| e.to_string())?.is_none()
    } else {
        false
    };
    if !running {
        tasks.remove(task);
    }
    Ok(running)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            save_ycs_data,
            load_ycs_data,
            delete_ycs_data,
            list_ycs_data,
            save_texture,
            import_texture_image,
            load_texture,
            load_texture_image,
            delete_texture,
            list_textures,
            find_texture_usage,
            find_component_usage,
            rename_texture_image,
            copy_texture_to_mod,
            write_item_frame_textures,
            read_image_base64,
            inject_marker,
            remove_marker_content,
            set_json_key,
            delete_json_key,
            mod_file_exists,
            write_mod_file,
            write_mod_file_base64,
            delete_mod_file,
            import_geo_model,
            load_geo_model_path,
            load_geo_model_content,
            delete_geo_model,
            list_geo_models,
            copy_geo_model_to_mod,
            rename_geo_model,
            import_display_model,
            load_display_model,
            copy_display_model_to_mod,
            import_animation_file,
            load_animation_file_path,
            delete_animation_file,
            copy_animation_file_to_mod,
            rename_animation_file,
            get_mod_root,
            toggle_gradle_task,
            gradle_task_running,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
