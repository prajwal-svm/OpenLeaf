//! GitHub OAuth device-flow transport.
//!
//! The device-flow endpoints (`github.com/login/device/code` and
//! `/login/oauth/access_token`) are not CORS-enabled, so they cannot be called
//! from the webview. These commands perform the HTTP on the Rust side (where
//! CORS does not apply) and return JSON to the frontend.
//!
//! Both commands are `async` and single-shot. Tauri runs synchronous commands
//! on the webview thread, so a long/blocking sync command would freeze the UI.
//! The poll loop lives in the frontend (cancellable, non-blocking); each tick
//! calls `gh_check_device_token` once.

use serde::Serialize;

const DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
/// `repo` = read/write public + private repos (push, pull, create).
/// `read:user` = show the connected account's login/avatar.
const OAUTH_SCOPE: &str = "repo read:user";

#[derive(Serialize)]
pub struct DeviceCode {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

/// Result of one token poll. The frontend loops, calling this each tick.
#[derive(Serialize)]
pub struct TokenPoll {
    /// `"token"` | `"pending"` | `"slow_down"`
    pub status: String,
    pub token: Option<String>,
    pub interval: Option<u64>,
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("OpenLeaf")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("could not build HTTP client: {e}"))
}

/// Step 1: request a user code.
#[tauri::command]
pub async fn gh_request_device_code(client_id: String) -> Result<DeviceCode, String> {
    let client = http_client()?;
    let resp = client
        .post(DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .form(&[("client_id", client_id.as_str()), ("scope", OAUTH_SCOPE)])
        .send()
        .await
        .map_err(|e| format!("network error: {e}"))?;

    let status = resp.status();
    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("invalid response ({status}): {e}"))?;

    if body.get("error").is_some() {
        let desc = body
            .get("error_description")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let err = body.get("error").and_then(|v| v.as_str()).unwrap_or("error");
        let msg = if desc.is_empty() { err.to_string() } else { desc.to_string() };
        return Err(format!("GitHub: {}", msg.trim()));
    }

    Ok(DeviceCode {
        device_code: body.get("device_code").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        user_code: body.get("user_code").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        verification_uri: body.get("verification_uri").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        expires_in: body.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(900),
        interval: body.get("interval").and_then(|v| v.as_u64()).unwrap_or(5),
    })
}

/// Step 2 (one tick): check whether the user has authorized yet. The frontend
/// calls this repeatedly. Returns `token` on success, `pending` while waiting,
/// `slow_down` to increase the interval; errors on `expired_token`/denied.
#[tauri::command]
pub async fn gh_check_device_token(
    client_id: String,
    device_code: String,
) -> Result<TokenPoll, String> {
    let client = http_client()?;
    let resp = client
        .post(TOKEN_URL)
        .header("Accept", "application/json")
        .form(&[
            ("client_id", client_id.as_str()),
            ("device_code", device_code.as_str()),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .await
        .map_err(|e| format!("network error: {e}"))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("invalid response: {e}"))?;

    if let Some(t) = body.get("access_token").and_then(|v| v.as_str()) {
        return Ok(TokenPoll {
            status: "token".into(),
            token: Some(t.to_string()),
            interval: None,
        });
    }

    match body.get("error").and_then(|v| v.as_str()) {
        Some("authorization_pending") => Ok(TokenPoll {
            status: "pending".into(),
            token: None,
            interval: None,
        }),
        Some("slow_down") => Ok(TokenPoll {
            status: "slow_down".into(),
            token: None,
            interval: Some(body.get("interval").and_then(|v| v.as_u64()).unwrap_or(5)),
        }),
        Some("expired_token") => Err("The sign-in code expired. Try again.".into()),
        Some("access_denied") => Err("GitHub authorization was cancelled.".into()),
        Some(other) => Err(format!("GitHub sign-in error: {other}")),
        None => Ok(TokenPoll {
            status: "pending".into(),
            token: None,
            interval: None,
        }),
    }
}
