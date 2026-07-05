use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use tauri::{Emitter, State};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::paths;
use crate::state::AppState;

/// Returns the OpenLeaf projects root (`~/.openleaf/projects`).
#[tauri::command]
pub fn library_root() -> Result<std::path::PathBuf, String> {
    paths::projects_root()
}

/// Returns the compiled-in app version (from Cargo.toml).
#[tauri::command]
pub fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[derive(Serialize, Clone)]
pub struct CompileError {
    pub line: Option<u32>,
    pub file: Option<String>,
    pub message: String,
    pub kind: String,
}

#[derive(Serialize, Default)]
pub struct CompileResult {
    pub ok: bool,
    pub pdf_base64: Option<String>,
    pub log: String,
    pub errors: Vec<CompileError>,
    pub synctex_path: Option<String>,
    pub out_dir: Option<String>,
    pub compile_time_ms: u64,
}

/// Compile a project's main document from disk via the Tectonic sidecar.
///
/// Reads `<project>/<main_doc>` so that `\input`, `\includegraphics`, and
/// `.bib` files resolve relative to the project directory.
#[tauri::command]
pub async fn compile_project(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    project_id: String,
    main_doc: String,
    offline: Option<bool>,
) -> Result<CompileResult, String> {
    // Only one compile at a time; concurrent callers wait here.
    let _guard = state.compile_lock.lock().await;

    let project_dir = paths::project_dir(&project_id)?;
    let build_dir = paths::build_dir(&project_id)?;
    // Validate `main_doc` stays inside the project (rejects absolute paths / `..`).
    let tex_path = crate::project::resolve_in_project(&project_id, &main_doc)?;

    if !tex_path.exists() {
        return Err(format!(
            "main document not found: {main_doc} (in project {project_id})"
        ));
    }

    // Write a compile wrapper that neutralizes pdfLaTeX-only primitives so
    // documents written for pdfLaTeX (e.g. `\input{glyphtounicode}`,
    // `\pdfgentounicode`) compile cleanly under Tectonic's XeTeX engine.
    // XeTeX emits selectable Unicode text natively, so those ATS hacks are
    // unnecessary here.
    let entry_path = build_dir.join(paths::ENTRY_TEX);
    let wrapper = format!(
        "\\ifdefined\\pdfglyphtounicode\\else\\def\\pdfglyphtounicode#1#2{{}}\\fi\n\
         \\ifdefined\\pdfgentounicode\\else\\newcount\\pdfgentounicode\\fi\n\
         \\input{{{main_doc}}}\n"
    );
    std::fs::write(&entry_path, wrapper)
        .map_err(|e| format!("failed to write compile entry: {e}"))?;

    let entry_str = entry_path.to_string_lossy().to_string();
    let out_str = build_dir.to_string_lossy().to_string();
    let project_str = project_dir.to_string_lossy().to_string();
    let search_opt = format!("search-path={project_str}");

    let sidecar = app
        .shell()
        .sidecar("tectonic")
        .map_err(|e| format!("sidecar lookup failed: {e}"))?;

    let compile_start = std::time::Instant::now();

    let mut args: Vec<String> = vec![
        "-X".into(),
        "compile".into(),
        "--synctex".into(),
        "--keep-logs".into(),
        "--print".into(),
        "--outdir".into(),
        out_str.clone(),
        "-Z".into(),
        search_opt,
        entry_str.clone(),
    ];
    if offline.unwrap_or(false) {
        args.insert(1, "--only-cached".into());
    }
    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    let (mut rx, _child) = sidecar
        .args(arg_refs)
        .spawn()
        .map_err(|e| format!("failed to spawn tectonic: {e}"))?;

    let mut stdout_buf = String::new();
    let mut exit_code: Option<i32> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                let s = String::from_utf8_lossy(&bytes).into_owned();
                let _ = app.emit("compile:log", &s);
                stdout_buf.push_str(&s);
            }
            CommandEvent::Stderr(bytes) => {
                let s = String::from_utf8_lossy(&bytes).into_owned();
                let _ = app.emit("compile:log", &s);
                stdout_buf.push_str(&s);
            }
            CommandEvent::Error(err) => {
                let _ = app.emit("compile:log", &err);
            }
            CommandEvent::Terminated(payload) => {
                exit_code = payload.code;
            }
            _ => {}
        }
    }

    // Outputs are named after the wrapper stem (`_openleaf_entry`).
    let stem = paths::ENTRY_STEM;
    let log = std::fs::read_to_string(build_dir.join(format!("{stem}.log")))
        .unwrap_or_else(|_| stdout_buf.clone());

    let pdf_path = build_dir.join(format!("{stem}.pdf"));
    let synctex_path = build_dir.join(format!("{stem}.synctex.gz"));

    let pdf_base64 = if pdf_path.exists() {
        let bytes = std::fs::read(&pdf_path).map_err(|e| format!("failed to read pdf: {e}"))?;
        Some(STANDARD.encode(&bytes))
    } else {
        None
    };

    let errors = parse_log_errors(&log);

    Ok(CompileResult {
        ok: pdf_base64.is_some() && exit_code.unwrap_or(-1) == 0,
        pdf_base64,
        log,
        errors,
        synctex_path: synctex_path
            .exists()
            .then(|| synctex_path.to_string_lossy().into_owned()),
        out_dir: Some(out_str),
        compile_time_ms: compile_start.elapsed().as_millis() as u64,
    })
}

/// Parse a TeX `.log` for error/warning lines and their source line numbers.
fn parse_log_errors(log: &str) -> Vec<CompileError> {
    let mut out = Vec::new();
    let lines: Vec<&str> = log.lines().collect();
    let n = lines.len();
    let mut i = 0;
    while i < n {
        let line = lines[i];
        if let Some(msg) = line.strip_prefix("! ") {
            let mut line_no = None;
            let lookahead = (4).min(n.saturating_sub(i + 1));
            for j in 1..=lookahead {
                let l = lines[i + j];
                if l.starts_with('!') {
                    break;
                }
                if let Some(rest) = l.strip_prefix("l.") {
                    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
                    if let Ok(num) = digits.parse::<u32>() {
                        line_no = Some(num);
                        break;
                    }
                }
            }
            out.push(CompileError {
                line: line_no,
                file: None,
                message: msg.to_string(),
                kind: "error".to_string(),
            });
        }
        i += 1;
    }
    out
}
