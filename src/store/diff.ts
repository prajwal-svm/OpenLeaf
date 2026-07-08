import { create } from "zustand";

export type DiffSide = "working" | "staged";
export type DiffMode = "split" | "unified";

export interface OpenDiff {
  path: string;
  /** "working" = worktree vs index (editable later); "staged" = index vs HEAD (read-only). */
  side: DiffSide;
}

interface DiffState {
  diff: OpenDiff | null;
  /** Whether the diff (vs. the active file) is the focused view in the editor. */
  active: boolean;
  mode: DiffMode;
  openDiff: (path: string, side: DiffSide) => void;
  closeDiff: () => void;
  /** Focus/unfocus the diff without closing it (switching to/from a file tab). */
  setDiffActive: (active: boolean) => void;
  setMode: (mode: DiffMode) => void;
}

const MODE_KEY = "openleaf.diffMode";

function loadMode(): DiffMode {
  try {
    return localStorage.getItem(MODE_KEY) === "unified" ? "unified" : "split";
  } catch {
    return "split";
  }
}

/** The git diff currently shown in the editor area (replaces the old modal). */
export const useDiffStore = create<DiffState>((set) => ({
  diff: null,
  active: false,
  mode: loadMode(),
  openDiff: (path, side) => set({ diff: { path, side }, active: true }),
  closeDiff: () => set({ diff: null, active: false }),
  setDiffActive: (active) => set({ active }),
  setMode: (mode) => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* ignore */
    }
    set({ mode });
  },
}));
