import { create } from "zustand";
import type { Sym } from "@/lib/index/types";

/** Results of a find-references query, shown in the References sidebar panel. */
interface ReferencesStore {
  title: string;
  results: Sym[];
  show: (title: string, results: Sym[]) => void;
  clear: () => void;
}

export const useReferencesStore = create<ReferencesStore>((set) => ({
  title: "",
  results: [],
  show: (title, results) => set({ title, results }),
  clear: () => set({ title: "", results: [] }),
}));
