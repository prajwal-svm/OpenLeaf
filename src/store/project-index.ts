import { create } from "zustand";
import { buildIndex } from "@/lib/index/build";
import type { ProjectIndex } from "@/lib/index/types";
import { useFilesStore } from "@/store/files";
import { readFileContent } from "@/lib/tauri";

/**
 * Live whole-project index. Built from an in-memory text cache so edits re-index
 * with pure JS (no disk IO): `updateFile` swaps one cached string and rebuilds.
 * `rebuildFromDisk` (project switch) reads every `.tex`/`.bib` once.
 */
interface IndexStore {
  index: ProjectIndex | null;
  /** Path -> text the current index was built from (rename applies against this). */
  texts: Record<string, string>;
  building: boolean;
  rebuildFromDisk: () => Promise<void>;
  /** Update one file's text and re-index (pure, synchronous). */
  updateFile: (path: string, text: string) => void;
  reset: () => void;
}

const isIndexable = (p: string) => p.endsWith(".tex") || p.endsWith(".bib");

export const useIndexStore = create<IndexStore>((set, get) => ({
  index: null,
  texts: {},
  building: false,

  rebuildFromDisk: async () => {
    const files = useFilesStore.getState();
    const id = files.projectId;
    if (!id) return;
    set({ building: true });
    try {
      const paths = files.tree.filter((f) => !f.is_dir && isIndexable(f.path)).map((f) => f.path);
      const texts: Record<string, string> = {};
      for (const path of paths) {
        const open = files.files[path]?.content;
        if (open !== undefined) {
          texts[path] = open;
        } else {
          try {
            texts[path] = await readFileContent(id, path);
          } catch {
            /* unreadable file: skip */
          }
        }
      }
      set({ texts, index: buildIndex(texts), building: false });
    } catch {
      set({ building: false });
    }
  },

  updateFile: (path, text) => {
    if (!isIndexable(path)) return;
    const cur = get();
    // Skip the rebuild when nothing changed (go-to-def/click call this to be safe).
    if (cur.texts[path] === text && cur.index) return;
    const texts = { ...cur.texts, [path]: text };
    set({ texts, index: buildIndex(texts) });
  },

  reset: () => set({ index: null, texts: {}, building: false }),
}));
