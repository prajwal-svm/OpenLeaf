import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauri } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

const PREVIEW_WINDOW_LABEL = "preview";

/**
 * Open (or focus) a separate OS window showing only the compiled PDF preview for
 * a project. It renders `?view=preview` in its own JS context (see main.tsx) and
 * stays in sync via the `preview:refresh` / `preview:project` events the main
 * window emits (on compile and on project switch).
 */
export async function openPreviewWindow(projectId: string, title: string): Promise<void> {
  if (!isTauri()) return;
  const existing = await WebviewWindow.getByLabel(PREVIEW_WINDOW_LABEL);
  if (existing) {
    // Point an already-open preview window at this project, then focus it.
    await emit("preview:project", { projectId });
    await existing.setFocus();
    return;
  }
  new WebviewWindow(PREVIEW_WINDOW_LABEL, {
    url: `index.html?view=preview&project=${encodeURIComponent(projectId)}`,
    title: `Preview — ${title || "OpenLeaf"}`,
    width: 720,
    height: 960,
    resizable: true,
    center: true,
    focus: true,
  });
}

/** Tell an open preview window to reload the PDF (call after a compile). */
export function refreshPreviewWindow(): void {
  if (!isTauri()) return;
  void emit("preview:refresh").catch(() => {});
}

/** Tell an open preview window which project to show (call on project switch). */
export function retargetPreviewWindow(projectId: string): void {
  if (!isTauri()) return;
  void emit("preview:project", { projectId }).catch(() => {});
}
