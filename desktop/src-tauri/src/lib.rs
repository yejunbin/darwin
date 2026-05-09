use once_cell::sync::OnceCell;
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout};
use tokio::sync::mpsc;

static RPC_HANDLE: OnceCell<Mutex<Option<tokio::task::JoinHandle<()>>>> = OnceCell::new();

#[derive(Default)]
pub struct RpcProcess {
    stdin_sender: Mutex<Option<mpsc::UnboundedSender<String>>>,
}

#[derive(serde::Serialize, Clone)]
struct RpcEvent {
    event_type: String,
    payload: serde_json::Value,
}

#[tauri::command]
async fn spawn_darwin_rpc(
    app: AppHandle,
    _state: State<'_, RpcProcess>,
) -> Result<String, String> {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| format!("Cannot determine home directory: {}", e))?;

    let darwin_home = std::path::PathBuf::from(&home).join(".darwin");
    let darwin_bin = std::path::PathBuf::from("/Disk1/development/darwin/bin/darwin.js");

    if !darwin_bin.exists() {
        return Err(format!("Darwin binary not found at: {:?}", darwin_bin));
    }

    let mut child: Child = tokio::process::Command::new("node")
        .arg(&darwin_bin)
        .arg("--mode")
        .arg("rpc")
        .env("DARWIN_HOME", &darwin_home)
        .env("HOME", &home)
        .current_dir("/Disk1/development/darwin")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Darwin RPC: {}", e))?;

    let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
    let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to get stderr")?;

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    {
        let mut sender = _state.stdin_sender.lock().map_err(|e| e.to_string())?;
        *sender = Some(tx);
    }

    let app_clone = app.clone();
    let handle = tokio::spawn(async move {
        let mut stdin = stdin;

        let stdin_task = tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                if let Err(e) = stdin.write_all(msg.as_bytes()).await {
                    let _ = app_clone.emit("rpc-error", format!("stdin write error: {}", e));
                    break;
                }
                if let Err(e) = stdin.write_all(b"\n").await {
                    let _ = app_clone.emit("rpc-error", format!("stdin write error: {}", e));
                    break;
                }
                if let Err(e) = stdin.flush().await {
                    let _ = app_clone.emit("rpc-error", format!("stdin flush error: {}", e));
                    break;
                }
            }
        });

        let app_stdout = app.clone();
        let stdout_task = tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if line.trim().is_empty() {
                    continue;
                }
                let event = RpcEvent {
                    event_type: "stdout".to_string(),
                    payload: serde_json::Value::String(line.clone()),
                };
                let _ = app_stdout.emit("rpc-event", event);
            }
        });

        let app_stderr = app.clone();
        let stderr_task = tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let event = RpcEvent {
                    event_type: "stderr".to_string(),
                    payload: serde_json::Value::String(line.clone()),
                };
                let _ = app_stderr.emit("rpc-event", event);
            }
        });

        tokio::select! {
            _ = stdin_task => {},
            _ = stdout_task => {},
            _ = stderr_task => {},
        }

        let _ = child.wait().await;
        let _ = app.emit("rpc-disconnected", ());
    });

    let _ = RPC_HANDLE.set(Mutex::new(Some(handle)));

    Ok("Darwin RPC spawned successfully".to_string())
}

#[tauri::command]
fn send_rpc_message(state: State<'_, RpcProcess>, message: String) -> Result<(), String> {
    let sender = state.stdin_sender.lock().map_err(|e| e.to_string())?;
    if let Some(tx) = sender.as_ref() {
        tx.send(message).map_err(|e| format!("Send error: {}", e))?;
        Ok(())
    } else {
        Err("RPC process not running".to_string())
    }
}

#[tauri::command]
fn stop_darwin_rpc() -> Result<(), String> {
    if let Ok(handle) = RPC_HANDLE.get().unwrap().lock() {
        if let Some(h) = handle.as_ref() {
            h.abort();
        }
    }
    Ok(())
}

#[tauri::command]
fn get_darwin_home() -> Result<String, String> {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| format!("Cannot determine home directory: {}", e))?;
    let darwin_home = std::path::PathBuf::from(&home).join(".darwin");
    Ok(darwin_home.to_string_lossy().to_string())
}

#[tauri::command]
fn get_outputs_dir() -> Result<String, String> {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| format!("Cannot determine home directory: {}", e))?;
    let outputs = std::path::PathBuf::from(&home).join(".darwin").join("outputs");
    Ok(outputs.to_string_lossy().to_string())
}

fn darwin_agent_dir() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| format!("Cannot determine home directory: {}", e))?;
    Ok(std::path::PathBuf::from(&home).join(".darwin").join("agent"))
}

#[tauri::command]
fn read_settings() -> Result<serde_json::Value, String> {
    let path = darwin_agent_dir()?.join("settings.json");
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings.json: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings.json: {}", e))
}

#[tauri::command]
fn write_settings(settings: serde_json::Value) -> Result<(), String> {
    let path = darwin_agent_dir()?.join("settings.json");
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(&path, content + "\n")
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;
    Ok(())
}

#[tauri::command]
fn read_models_config() -> Result<serde_json::Value, String> {
    let path = darwin_agent_dir()?.join("models.json");
    if !path.exists() {
        return Ok(serde_json::json!({"providers": {}}));
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read models.json: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse models.json: {}", e))
}

#[tauri::command]
fn write_models_config(config: serde_json::Value) -> Result<(), String> {
    let path = darwin_agent_dir()?.join("models.json");
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize models config: {}", e))?;
    std::fs::write(&path, content + "\n")
        .map_err(|e| format!("Failed to write models.json: {}", e))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&path).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o600);
        let _ = std::fs::set_permissions(&path, perms);
    }
    Ok(())
}

#[tauri::command]
fn read_auth_config() -> Result<serde_json::Value, String> {
    let path = darwin_agent_dir()?.join("auth.json");
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read auth.json: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse auth.json: {}", e))
}

#[tauri::command]
fn write_auth_config(config: serde_json::Value) -> Result<(), String> {
    let path = darwin_agent_dir()?.join("auth.json");
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize auth config: {}", e))?;
    std::fs::write(&path, content + "\n")
        .map_err(|e| format!("Failed to write auth.json: {}", e))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&path).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o600);
        let _ = std::fs::set_permissions(&path, perms);
    }
    Ok(())
}

#[tauri::command]
fn list_sessions() -> Result<Vec<serde_json::Value>, String> {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| format!("Cannot determine home directory: {}", e))?;
    let sessions_dir = std::path::PathBuf::from(&home).join(".darwin").join("sessions");
    if !sessions_dir.exists() {
        return Ok(vec![]);
    }
    let mut sessions = Vec::new();
    for entry in std::fs::read_dir(&sessions_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        if name.ends_with(".jsonl") {
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let modified = metadata.modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            sessions.push(serde_json::json!({
                "name": name,
                "path": path.to_string_lossy().to_string(),
                "modified": modified,
                "size": metadata.len(),
            }));
        }
    }
    sessions.sort_by(|a, b| {
        let a_mod = a.get("modified").and_then(|v| v.as_i64()).unwrap_or(0);
        let b_mod = b.get("modified").and_then(|v| v.as_i64()).unwrap_or(0);
        b_mod.cmp(&a_mod)
    });
    Ok(sessions)
}

fn darwin_home_dir() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| format!("Cannot determine home directory: {}", e))?;
    Ok(std::path::PathBuf::from(&home).join(".darwin"))
}

#[tauri::command]
fn list_directory(dir_path: String) -> Result<Vec<serde_json::Value>, String> {
    let path = std::path::PathBuf::from(&dir_path);
    if !path.exists() {
        return Ok(vec![]);
    }
    let mut entries = Vec::new();
    for entry in std::fs::read_dir(&path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let name = entry_path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let is_dir = metadata.is_dir();
        let modified = metadata.modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        entries.push(serde_json::json!({
            "name": name,
            "path": entry_path.to_string_lossy().to_string(),
            "is_dir": is_dir,
            "size": metadata.len(),
            "modified": modified,
        }));
    }
    entries.sort_by(|a, b| {
        let a_dir = a.get("is_dir").and_then(|v| v.as_bool()).unwrap_or(false);
        let b_dir = b.get("is_dir").and_then(|v| v.as_bool()).unwrap_or(false);
        if a_dir != b_dir {
            return b_dir.cmp(&a_dir);
        }
        let a_name = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let b_name = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
        a_name.cmp(b_name)
    });
    Ok(entries)
}

#[tauri::command]
fn read_file(file_path: String) -> Result<String, String> {
    let path = std::path::PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    let size = path.metadata().map_err(|e| e.to_string())?.len();
    if size > 5 * 1024 * 1024 {
        return Err("File too large (>5MB)".to_string());
    }
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn list_outputs() -> Result<Vec<serde_json::Value>, String> {
    let home = darwin_home_dir()?;
    let dirs = vec![
        ("outputs", home.join("outputs")),
        ("manuscripts", home.join("manuscripts")),
        ("protocols", home.join("protocols")),
        ("pipelines", home.join("pipelines")),
    ];
    let mut results = Vec::new();
    for (category, path) in dirs {
        if path.exists() {
            let mut files = Vec::new();
            for entry in std::fs::read_dir(&path).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let entry_path = entry.path();
                let name = entry_path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
                let metadata = entry.metadata().map_err(|e| e.to_string())?;
                let is_dir = metadata.is_dir();
                let modified = metadata.modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);
                files.push(serde_json::json!({
                    "name": name,
                    "path": entry_path.to_string_lossy().to_string(),
                    "is_dir": is_dir,
                    "size": metadata.len(),
                    "modified": modified,
                }));
            }
            files.sort_by(|a, b| {
                let a_mod = a.get("modified").and_then(|v| v.as_i64()).unwrap_or(0);
                let b_mod = b.get("modified").and_then(|v| v.as_i64()).unwrap_or(0);
                b_mod.cmp(&a_mod)
            });
            if !files.is_empty() {
                results.push(serde_json::json!({
                    "category": category,
                    "path": path.to_string_lossy().to_string(),
                    "files": files,
                }));
            }
        }
    }
    Ok(results)
}

#[tauri::command]
fn run_darwin_doctor() -> Result<Vec<serde_json::Value>, String> {
    let mut checks = Vec::new();

    // Check Node.js version
    let node_version = std::process::Command::new("node")
        .arg("--version")
        .output();
    match node_version {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let major = version.trim_start_matches('v').split('.').next()
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);
            let ok = major >= 20;
            checks.push(serde_json::json!({
                "name": "Node.js",
                "status": if ok { "pass" } else { "fail" },
                "message": format!("{} (requires >= v20)", version),
            }));
        }
        _ => {
            checks.push(serde_json::json!({
                "name": "Node.js",
                "status": "fail",
                "message": "Node.js not found in PATH",
            }));
        }
    }

    // Check Darwin home directory
    let darwin_home = darwin_agent_dir()?.parent().unwrap().to_path_buf();
    let ok = darwin_home.exists();
    checks.push(serde_json::json!({
        "name": "Darwin Home",
        "status": if ok { "pass" } else { "fail" },
        "message": format!("{}", darwin_home.display()),
    }));

    // Check settings.json
    let settings_path = darwin_agent_dir()?.join("settings.json");
    let ok = settings_path.exists();
    checks.push(serde_json::json!({
        "name": "Settings",
        "status": if ok { "pass" } else { "warn" },
        "message": if ok { "settings.json found" } else { "settings.json not found — run darwin setup first" },
    }));

    // Check models.json
    let models_path = darwin_agent_dir()?.join("models.json");
    let ok = models_path.exists();
    checks.push(serde_json::json!({
        "name": "Model Providers",
        "status": if ok { "pass" } else { "warn" },
        "message": if ok { "models.json found" } else { "No model providers configured — run darwin setup first" },
    }));

    // Check auth.json
    let auth_path = darwin_agent_dir()?.join("auth.json");
    let ok = auth_path.exists();
    checks.push(serde_json::json!({
        "name": "Authentication",
        "status": if ok { "pass" } else { "warn" },
        "message": if ok { "Auth credentials found" } else { "No auth credentials — configure a model provider" },
    }));

    Ok(checks)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(RpcProcess::default())
        .invoke_handler(tauri::generate_handler![
            spawn_darwin_rpc,
            send_rpc_message,
            stop_darwin_rpc,
            get_darwin_home,
            get_outputs_dir,
            read_settings,
            write_settings,
            read_models_config,
            write_models_config,
            read_auth_config,
            write_auth_config,
            list_sessions,
            run_darwin_doctor,
            list_directory,
            read_file,
            list_outputs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
