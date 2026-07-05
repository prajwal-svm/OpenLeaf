use tauri::async_runtime::Mutex;

/// Process-wide app state.
pub struct AppState {
    /// Serializes compiles so only one Tectonic run is active at a time.
    pub compile_lock: Mutex<()>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            compile_lock: Mutex::new(()),
        }
    }
}
