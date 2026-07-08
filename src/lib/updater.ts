import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "@tauri-apps/api/core";
import { logError } from "@/lib/log";
import { useUpdatesStore } from "@/store/updates";

/**
 * In-app auto-update. Talks to the GitHub Releases `latest.json` (configured in
 * `tauri.conf.json`), verifies the download's minisign signature against the
 * embedded public key, installs, and restarts.
 *
 * The prompt is fully in-app: the startup check records its result in the
 * updates store, which drives a branded in-app notice (`UpdateNotice`) rather
 * than a native OS dialog.
 *
 * The updater only exists in a bundled desktop app; in the browser dev server
 * (`isTauri()` is false) every entry point is a no-op so nothing throws.
 */

// Guard against overlapping checks (startup tick racing a manual click).
let inFlight = false;

/**
 * Ask the update server whether a newer version exists.
 *
 * Returns the `Update` (with `.version`, `.currentVersion`, `.body`) when one is
 * available, or `null` when already up to date. In the browser dev server
 * (`!isTauri()`) there is no updater, so this resolves to `null` - callers that
 * need to tell "up to date" apart from "no updater" should check `isTauri()`
 * themselves.
 */
export async function findUpdate(): Promise<Update | null> {
  if (!isTauri()) return null;
  const update = await check();
  return update ?? null;
}

/**
 * Download and install an update, reporting progress, then restart into it.
 *
 * @param update      The `Update` returned by {@link findUpdate}.
 * @param onProgress  Called with a 0-100 percentage as bytes arrive. When the
 *                    release doesn't advertise a content length, percent stays
 *                    at 0 until the download finishes (then 100).
 */
export async function installUpdate(
  update: Update,
  onProgress?: (percent: number) => void,
): Promise<void> {
  let total = 0;
  let downloaded = 0;
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? 0;
        onProgress?.(0);
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        if (total > 0) onProgress?.(Math.min(100, Math.round((downloaded / total) * 100)));
        break;
      case "Finished":
        onProgress?.(100);
        break;
    }
  });
  // Restart into the freshly installed version.
  await relaunch();
}

/**
 * Run an update check and record the outcome in the updates store, so the
 * in-app prompt (`UpdateNotice`) and the About "last check failed" indicator
 * stay in sync. Returns the `Update` when one is available, else `null`.
 *
 * Failures are logged and reflected in the store (`lastCheckFailed`). They are
 * rethrown only when `rethrow` is set, which the manual checker uses to render
 * its own inline error state.
 */
export async function runUpdateCheck({ rethrow = false }: { rethrow?: boolean } = {}): Promise<Update | null> {
  if (inFlight) return null;
  inFlight = true;
  const store = useUpdatesStore.getState();
  try {
    const update = await findUpdate();
    if (update) store.setAvailable(update);
    else store.setUpToDate();
    return update;
  } catch (e) {
    await logError("updater", e);
    store.setFailed();
    if (rethrow) throw e;
    return null;
  } finally {
    inFlight = false;
  }
}

/**
 * Fire-and-forget update check for app startup. Records the result in the
 * updates store; the in-app `UpdateNotice` surfaces an available update.
 */
export function checkForUpdatesOnStartup(): void {
  void runUpdateCheck();
}
