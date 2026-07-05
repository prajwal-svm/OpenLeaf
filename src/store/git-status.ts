import { create } from "zustand";
import { gitStatus } from "@/lib/tauri";

/** Lightweight store holding the current project's changed-file count,
 *  surfaced as a badge on the source-control rail button. */
interface GitStatusState {
  count: number;
  refresh: (projectId: string | null) => Promise<void>;
}

export const useGitStatusStore = create<GitStatusState>((set) => ({
  count: 0,
  refresh: async (projectId) => {
    if (!projectId) {
      set({ count: 0 });
      return;
    }
    try {
      const changes = await gitStatus(projectId);
      set({ count: changes.length });
    } catch {
      set({ count: 0 });
    }
  },
}));
