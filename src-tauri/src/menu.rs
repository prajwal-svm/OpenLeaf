use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Runtime};

/// Build the application menu. We replace Tauri's default menu (File / Edit /
/// View / Window / Help) with a trimmed menu: an app menu holding the three
/// actions that make sense for OpenLeaf (About, Check for Updates, Quit) and a
/// standard Edit menu.
///
/// The Edit menu is not decoration: on macOS the native Copy / Paste / Cut /
/// Select All / Undo / Redo items are what carry the ⌘C / ⌘V / ⌘X / ⌘A / ⌘Z
/// accelerators into the WKWebView. Without them the whole app (including the
/// CodeMirror editor) gets no clipboard, because our custom menu replaced the
/// default one that used to provide them.
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

    // Standard editing commands. The predefined items bind the OS clipboard
    // shortcuts; without this menu, ⌘C/⌘V/⌘X do nothing in the webview on macOS.
    let edit_menu = SubmenuBuilder::new(handle, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    MenuBuilder::new(handle)
        .item(&app_menu)
        .item(&edit_menu)
        .build()
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
