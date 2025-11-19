use std::ffi::CString;
use std::path::Path;
use std::ptr;
use winapi::shared::minwindef::{DWORD, HKEY};
use winapi::um::debugapi::IsDebuggerPresent;
use winapi::um::winnt::{KEY_READ, REG_SZ};
use winapi::um::winreg::{RegCloseKey, RegOpenKeyExA, RegQueryValueExA, HKEY_LOCAL_MACHINE};
use crate::config::debug_log;


pub fn is_running_in_vm() -> bool {

    if !raw_cpuid::CpuId::new().get_feature_info().is_some() {
        return false;
    }

    let cpuid = raw_cpuid::CpuId::new();

    // Verifica o hypervisor bit (bit 31 do ECX quando EAX=1)
    if let Some(feature_info) = cpuid.get_feature_info() {
        if feature_info.has_hypervisor() {
            return true;
        }
    }

    // Verifica o vendor ID do hypervisor (EAX=0x40000000)
    if let Some(hypervisor_info) = cpuid.get_hypervisor_info() {
        let vendor_id = hypervisor_info.identify();
        
        match vendor_id {
            raw_cpuid::Hypervisor::Xen
            | raw_cpuid::Hypervisor::VMware
            | raw_cpuid::Hypervisor::HyperV
            | raw_cpuid::Hypervisor::KVM
            | raw_cpuid::Hypervisor::QEMU
            | raw_cpuid::Hypervisor::Bhyve
            | raw_cpuid::Hypervisor::QNX
            | raw_cpuid::Hypervisor::ACRN
            | raw_cpuid::Hypervisor::Unknown(_, _, _) => return true,
        }
    }

    false
}

/// Verifica artefatos específicos de VMs no sistema
pub fn check_vm_artifacts() -> bool {
    // Lista de arquivos típicos de VMs
    let vm_files = [
        "C:\\Windows\\System32\\drivers\\vmmouse.sys",       // VMware
        "C:\\Windows\\System32\\drivers\\vm3dgl.dll",        // VMware
        "C:\\Windows\\System32\\drivers\\vmtray.dll",        // VMware
        "C:\\Windows\\System32\\drivers\\VBoxMouse.sys",     // VirtualBox
        "C:\\Windows\\System32\\drivers\\VBoxGuest.sys",     // VirtualBox
        "C:\\Windows\\System32\\drivers\\xenservice.sys",    // Xen
        "C:\\Windows\\System32\\drivers\\qemupciserial.sys", // QEMU
    ];

    // Verifica se algum arquivo de VM existe
    for file in &vm_files {
        if Path::new(file).exists() {
            debug_log("[!] VM artifact detected (file)");
            return true;
        }
    }

    // Lista de chaves de registro suspeitas
    let vm_reg_keys = [
        "HARDWARE\\ACPI\\DSDT\\VBOX__",
        "HARDWARE\\ACPI\\FADT\\VBOX__",
        "SYSTEM\\CurrentControlSet\\Enum\\PCI\\VEN_80EE",
    ];

    // Verifica chaves de registro
    for reg_key in &vm_reg_keys {
        if check_registry_key(reg_key) {
            debug_log("[!] VM registry key detected");
            return true;
        }
    }

    // Verifica o fabricante do sistema
    if let Some(manufacturer) = get_system_manufacturer() {
        let manufacturer_lower = manufacturer.to_lowercase();
        if manufacturer_lower.contains("vmware")
            || manufacturer_lower.contains("virtualbox")
            || manufacturer_lower.contains("qemu")
            || manufacturer_lower.contains("xen")
        {
            debug_log("[!] VM manufacturer detected");
            return true;
        }
    }

    false
}

/// Verifica se uma chave de registro existe
fn check_registry_key(key_path: &str) -> bool {
    let c_key = CString::new(key_path).unwrap();
    let mut h_key: HKEY = ptr::null_mut();

    unsafe {
        let result = RegOpenKeyExA(
            HKEY_LOCAL_MACHINE,
            c_key.as_ptr(),
            0,
            KEY_READ,
            &mut h_key,
        );

        if result == 0 {
            RegCloseKey(h_key);
            return true;
        }
    }

    false
}

/// Obtém o fabricante do sistema através do registro
fn get_system_manufacturer() -> Option<String> {
    let key_path = "SYSTEM\\CurrentControlSet\\Control\\SystemInformation";
    let value_name = "SystemManufacturer";

    let c_key = CString::new(key_path).unwrap();
    let c_value = CString::new(value_name).unwrap();
    let mut h_key: HKEY = ptr::null_mut();

    unsafe {
        let result = RegOpenKeyExA(
            HKEY_LOCAL_MACHINE,
            c_key.as_ptr(),
            0,
            KEY_READ,
            &mut h_key,
        );

        if result != 0 {
            return None;
        }

        let mut buffer = [0u8; 256];
        let mut buffer_size = buffer.len() as DWORD;
        let mut reg_type: DWORD = 0;

        let result = RegQueryValueExA(
            h_key,
            c_value.as_ptr(),
            ptr::null_mut(),
            &mut reg_type,
            buffer.as_mut_ptr(),
            &mut buffer_size,
        );

        RegCloseKey(h_key);

        if result == 0 && reg_type == REG_SZ && buffer_size > 0 {
            // Converte bytes para string, removendo terminador nulo
            let end = buffer_size as usize - 1;
            let manufacturer = String::from_utf8_lossy(&buffer[..end]).into_owned();
            return Some(manufacturer);
        }
    }

    None
}

/// Função principal que executa todas as verificações anti-VM
pub fn check() -> bool {
    // Verifica se há um debugger anexado
    unsafe {
        if IsDebuggerPresent() != 0 {
            debug_log("[!] Debugger detected");
            return true;
        }
    }

    // Verifica se está em VM usando CPUID
    if is_running_in_vm() {
        debug_log("[!] Detected VM environment. Exiting...");
        return true;
    }

    // Verifica artefatos de VM
    if check_vm_artifacts() {
        debug_log("[!] Detected VM artifacts. Exiting...");
        return true;
    }

    return false;
}
