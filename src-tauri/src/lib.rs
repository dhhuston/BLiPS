#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|_app| {
      Ok(())
    })
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_geolocation::init())
    .plugin(tauri_plugin_shell::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
