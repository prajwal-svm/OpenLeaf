use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::paths;

/// App-wide config stored at `~/.openleaf/config.json`.
///
/// NOTE: the GitHub token is stored locally on disk (0600 on Unix). For a
/// future release this should move to the OS keychain (e.g. via
/// `tauri-plugin-keyring`).
#[derive(Serialize, Deserialize, Default, Clone)]
pub struct AppConfig {
    #[serde(default)]
    pub github_token: String,
    #[serde(default)]
    pub github_user: String,
    /// Legacy single AI key (kept for backward compat; `ai_keys` is preferred).
    #[serde(default)]
    pub ai_api_key: String,
    /// Active AI provider id (e.g. "openai", "anthropic", "ollama").
    #[serde(default)]
    pub ai_provider: String,
    /// Active AI model id.
    #[serde(default)]
    pub ai_model: String,
    /// Per-provider credentials: provider id -> API key (or host URL for Ollama).
    #[serde(default)]
    pub ai_keys: HashMap<String, String>,
}

pub fn config_path() -> Result<PathBuf, String> {
    Ok(paths::openleaf_root()?.join("config.json"))
}

pub fn read_config() -> Result<AppConfig, String> {
    let p = config_path()?;
    if !p.exists() {
        return Ok(AppConfig::default());
    }
    let s = std::fs::read_to_string(&p).map_err(|e| e.to_string())?;
    Ok(serde_json::from_str(&s).unwrap_or_default())
}

pub fn write_config(config: &AppConfig) -> Result<(), String> {
    let p = config_path()?;
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let s = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&p, s).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&p, std::fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    read_config()
}

#[tauri::command]
pub fn set_config(config: AppConfig) -> Result<(), String> {
    write_config(&config)
}
