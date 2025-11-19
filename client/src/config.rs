

pub const URL: &str = "http://127.0.0.1:8000";
pub const DEBUG: bool = false;
pub const TIME: u64 = 3;

pub fn debug_log(msg: &str) {
    if DEBUG {
        println!("{}", msg)
    } 
}

