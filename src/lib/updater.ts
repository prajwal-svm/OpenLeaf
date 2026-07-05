import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { logError } from "@/lib/log";

/**
 * In-app auto-update. Talks to the GitHub Releases `latest.json` (configured in
 * `tauri.conf.json`), verifies the download's minisign signature against the
 * embedded public key, installs, and restarts.
 *
 * The updater only exists in a bundled desktop app; in the browser dev server
 * (`isTauri()` is false) every entry point is a no-op so nothing throws.
 */

// Guard against overlapping checks (startup tick racing a manual click).
let inFlight = false;

async function findUpdate(): Promise<Update | null> {
  if (!isTauri()) return null;
  const update = await check();
  return update ?? null;
}

/**
 * Check for an update and, if one is available, prompt to install it.
 *
 * @param silent  When true (startup check), stay quiet if the app is already
 *                up to date or the check fails - only surface UI when there is
 *                actually an update to offer. When false (manual "Check for
 *                updates"), always give the user feedback.
 */
export async function checkForUpdates({ silent }: { silent: boolean }): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const update = await findUpdate();

    if (!update) {
      if (!silent) {
        await message("You're on the latest version of OpenLeaf.", {
          title: "No updates available",
          kind: "info",
        });
      }
      return;
    }

    const notes = update.body?.trim();
    const proceed = await ask(
      `OpenLeaf ${update.version} is available (you have ${update.currentVersion}).` +
        (notes ? `\n\n${notes}` : "") +
        `\n\nDownload and install it now? OpenLeaf will restart to finish.`,
      {
        title: "Update available",
        kind: "info",
        okLabel: "Update now",
        cancelLabel: "Later",
      },
    );
    if (!proceed) return;

    await update.downloadAndInstall();
    // Restart into the freshly installed version.
    await relaunch();
  } catch (e) {
    await logError("updater", e);
    if (!silent) {
      await message(
        "Could not check for updates right now. Please try again later, or " +
          "download the latest version from GitHub.",
        { title: "Update check failed", kind: "error" },
      );
    }
  } finally {
    inFlight = false;
  }
}

/**
 * Fire-and-forget update check for app startup. Silent unless an update exists.
 */
export function checkForUpdatesOnStartup(): void {
  void checkForUpdates({ silent: true });
}
