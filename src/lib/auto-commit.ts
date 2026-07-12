import { gitAutoCommitUpdate } from "@/lib/tauri";
import { useSettingsStore } from "@/store/settings";

// Auto-commit policy: a successful compile commits immediately (it is the
// natural checkpoint, and compiling already saved the active file first);
// plain autosaves commit after a trailing quiet period so a typing burst
// lands as one "Update: <files>" commit instead of dozens.
const IDLE_COMMIT_MS = 30_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let pendingProjectId: string | null = null;

// Never commit out from under the user while they are staging in the Source
// Control panel; the next save, compile, or manual commit picks the changes up.
const sourceControlOpen = () => useSettingsStore.getState().railTab === "source";

async function commit(projectId: string) {
  if (sourceControlOpen()) return;
  try {
    await gitAutoCommitUpdate(projectId);
  } catch {
    // Auto-commit must never interrupt editing; the change simply stays
    // uncommitted until the next save, compile, or manual commit.
  }
}

/** Debounced auto-commit after an autosave: (re)starts the quiet-period timer. */
export function scheduleAutoCommit(projectId: string) {
  pendingProjectId = projectId;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    pendingProjectId = null;
    void commit(projectId);
  }, IDLE_COMMIT_MS);
}

/** Commit pending debounced work now (called before switching projects). */
export function flushAutoCommit() {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
  const id = pendingProjectId;
  pendingProjectId = null;
  if (id) void commit(id);
}

/** Immediate auto-commit (successful compile); supersedes any pending timer. */
export async function autoCommitNow(projectId: string) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  pendingProjectId = null;
  await commit(projectId);
}
