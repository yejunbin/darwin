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
            get_outputs_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
