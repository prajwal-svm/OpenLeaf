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
  mode: DiffMode;
  openDiff: (path: string, side: DiffSide) => void;
  closeDiff: () => void;
  setMode: (mode: DiffMode) => void;
}

/** The git diff currently shown in the editor area (replaces the old modal). */
export const useDiffStore = create<DiffState>((set) => ({
  diff: null,
  mode: "split",
  openDiff: (path, side) => set({ diff: { path, side } }),
  closeDiff: () => set({ diff: null }),
  setMode: (mode) => set({ mode }),
}));
