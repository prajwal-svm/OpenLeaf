import { create } from "zustand";

interface DiffState {
  diff: { path: string; text: string } | null;
  openDiff: (path: string, text: string) => void;
  closeDiff: () => void;
}

/** Holds the currently-opened git diff, rendered in the editor area. */
export const useDiffStore = create<DiffState>((set) => ({
  diff: null,
  openDiff: (path, text) => set({ diff: { path, text } }),
  closeDiff: () => set({ diff: null }),
}));
