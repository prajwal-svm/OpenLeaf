use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Runtime};

/// Build the application menu. We replace Tauri's default menu (File / Edit /
/// View / Window / Help) with a single app menu holding only the three actions
/// that make sense for OpenLeaf: About, Check for Updates, and Quit.
///
/// "About OpenLeaf" and "Check for Updates" are custom items that emit an event
/// to the webview so they open our own in-app surfaces (the About dialog and
/// the update window) instead of native panels. "Quit OpenLeaf" is the standard
/// predefined item.
pub fn build<R: Runtime>(handle: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let about = MenuItemBuilder::with_id("about", "About OpenLeaf").build(handle)?;
    let check_updates =
        MenuItemBuilder::with_id("check_updates", "Check for Updates…").build(handle)?;

    let app_menu = SubmenuBuilder::new(handle, "OpenLeaf")
        .item(&about)
        .separator()
        .item(&check_updates)
        .separator()
        .quit()
        .build()?;

    MenuBuilder::new(handle).item(&app_menu).build()
}

/// Route a menu click to the webview. The frontend listens for these events and
/// opens the matching in-app surface.
pub fn on_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    match id {
        "about" => {
            let _ = app.emit("menu://about", ());
        }
        "check_updates" => {
            let _ = app.emit("menu://check-updates", ());
        }
        _ => {}
    }
}
