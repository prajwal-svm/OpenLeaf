//! Project-relative path sandboxing.
//!
//! Every file path that crosses the IPC boundary is resolved through
//! `resolve_within` so absolute paths, `..` traversal, drive prefixes, and
//! symlink escapes cannot leave a project's root.

use std::path::{Component, Path, PathBuf};

use crate::paths;

/// Resolve a project-relative path, rejecting traversal escapes.
pub fn resolve(project_id: &str, rel: &str) -> Result<PathBuf, String> {
    let root = paths::project_dir(project_id)?;
    resolve_within(&root, rel)
}

/// Public resolver for other modules (e.g. compile/export) so a user-supplied
/// `main_doc` can't escape the project via an absolute path or `..`.
pub fn resolve_in_project(project_id: &str, rel: &str) -> Result<PathBuf, String> {
    resolve(project_id, rel)
}

/// Join `rel` onto `root`, rejecting anything that would escape `root`.
///
/// Guards against three escape vectors:
///   1. Absolute paths (`/etc/passwd`) - `Path::join` would discard `root`.
///   2. `..` traversal and drive prefixes (`C:\`).
///   3. Symlinks inside the project pointing outside - the resolved real path
///      (or its nearest existing ancestor, for not-yet-created files) must stay
///      within `root`.
pub fn resolve_within(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let rel_path = Path::new(rel);
    if rel_path.is_absolute() {
        return Err(format!("illegal path: {rel}"));
    }
    if rel_path.components().any(|c| {
        matches!(
            c,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    }) {
        return Err(format!("illegal path: {rel}"));
    }
    let joined = root.join(rel_path);
    let real_root = root.canonicalize().map_err(|e| e.to_string())?;
    if let Some(anchor) = nearest_existing(&joined) {
        let real = anchor.canonicalize().map_err(|e| e.to_string())?;
        if !real.starts_with(&real_root) {
            return Err(format!("illegal path: {rel}"));
        }
    }
    Ok(joined)
}

/// The deepest ancestor of `path` (including itself) that exists on disk.
fn nearest_existing(path: &Path) -> Option<PathBuf> {
    let mut cur = Some(path);
    while let Some(p) = cur {
        if p.exists() {
            return Some(p.to_path_buf());
        }
        cur = p.parent();
    }
    None
}

/// Whether `rel` resolves to the project root itself (must never be deleted).
pub fn is_root_delete(root: &Path, rel: &str) -> bool {
    if rel.is_empty() || rel == "." {
        return true;
    }
    let p = match resolve_within(root, rel) {
        Ok(p) => p,
        // A path that fails to resolve is refused elsewhere; not a root delete.
        Err(_) => return false,
    };
    match (p.canonicalize(), root.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => p == root,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root() -> PathBuf {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let base =
            std::env::temp_dir().join(format!("openleaf-sandbox-{}-{n}", std::process::id()));
        std::fs::create_dir_all(&base).unwrap();
        base
    }

    #[test]
    fn rejects_absolute_paths() {
        let root = temp_root();
        assert!(resolve_within(&root, "/etc/passwd").is_err());
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn rejects_parent_traversal() {
        let root = temp_root();
        assert!(resolve_within(&root, "../secret").is_err());
        assert!(resolve_within(&root, "a/../../secret").is_err());
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn allows_normal_relative_paths() {
        let root = temp_root();
        let p = resolve_within(&root, "sub/dir/file.tex").unwrap();
        assert!(p.starts_with(&root));
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn refuses_delete_of_project_root() {
        let root = temp_root();
        assert!(is_root_delete(&root, ""));
        assert!(is_root_delete(&root, "."));
        assert!(is_root_delete(&root, "./"));
        assert!(is_root_delete(&root, "././"));
        assert!(!is_root_delete(&root, "main.tex"));
        std::fs::remove_dir_all(&root).ok();
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlink_escape() {
        let root = temp_root();
        let outside = temp_root();
        std::os::unix::fs::symlink(&outside, root.join("escape")).unwrap();
        assert!(resolve_within(&root, "escape/x.tex").is_err());
        std::fs::remove_dir_all(&outside).ok();
        std::fs::remove_dir_all(&root).ok();
    }
}
