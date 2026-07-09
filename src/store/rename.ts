import { create } from "zustand";
import type { Sym } from "@/lib/index/types";

/** Drives the rename-symbol dialog. */
interface RenameStore {
  sym: Sym | null;
  open: (sym: Sym) => void;
  close: () => void;
}

export const useRenameStore = create<RenameStore>((set) => ({
  sym: null,
  open: (sym) => set({ sym }),
  close: () => set({ sym: null }),
}));
