import { create } from "zustand";

const KEY = "openleaf.projectColors";

function load(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function save(map: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* best effort */
  }
}

interface ProjectColorsState {
  colors: Record<string, string>;
  setColor: (id: string, color: string) => void;
  get: (id: string) => string | undefined;
}

export const useProjectColorsStore = create<ProjectColorsState>((set, get) => ({
  colors: load(),
  setColor: (id, color) => {
    const next = { ...get().colors, [id]: color };
    save(next);
    set({ colors: next });
  },
  get: (id) => get().colors[id],
}));
