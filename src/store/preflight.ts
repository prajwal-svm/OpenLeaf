import { create } from "zustand";
import { runPreflight } from "@/lib/preflight/engine";
import { extractForPreflight } from "@/lib/preflight/pdf-extract";
import type { RefsContext } from "@/lib/preflight/refs-rules";
import type { PreflightReport } from "@/lib/preflight/types";
import { useFilesStore } from "@/store/files";
import { useCompileStore } from "@/store/compile";

/**
 * Gather the references & assets context from the project: citation keys from
 * all loaded `.bib` files, labels across loaded files, and the full project file
 * list from the tree (for resolving includes/graphics).
 */
function buildRefsContext(files: ReturnType<typeof useFilesStore.getState>): RefsContext {
  const bibKeys: string[] = [];
  const definedLabels: string[] = [];
  let bibLoaded = false;
  for (const [path, state] of Object.entries(files.files)) {
    if (path.endsWith(".bib")) {
      bibLoaded = true;
      const re = /@\w+\s*\{\s*([^,\s}]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(state.content))) bibKeys.push(m[1]);
    }
    const lre = /\\label\s*\{([^}]*)\}/g;
    let lm: RegExpExecArray | null;
    while ((lm = lre.exec(state.content))) definedLabels.push(lm[1].trim());
  }
  const projectFiles = files.tree.filter((f) => !f.is_dir).map((f) => f.path);
  return { bibKeys, definedLabels, bibLoaded, projectFiles };
}

export type CheckId = "ats" | "a11y" | "refs";
export type CheckFlags = Record<CheckId, boolean>;
const NO_FLAGS: CheckFlags = { ats: false, a11y: false, refs: false };

interface PreflightStore {
  report: PreflightReport | null;
  /** Reading-order plain text per page, for the "what the reader sees" view. */
  pageText: string[];
  running: boolean;
  showReader: boolean;
  error: string | null;
  /** Which checks have been run (results visible). Persists across tab switches. */
  ran: CheckFlags;
  /** User's enable override (null = use the document-type suggestion). */
  enabled: CheckFlags | null;
  /** User's accordion expand override (null = use the suggestion). */
  open: CheckFlags | null;
  setRan: (f: CheckFlags) => void;
  setEnabled: (f: CheckFlags) => void;
  setOpen: (f: CheckFlags) => void;
  toggleReader: () => void;
  /** Re-run preflight against the active document and the last compiled PDF. */
  run: () => Promise<void>;
  /** Clear everything (called on project switch). */
  reset: () => void;
}

export const usePreflightStore = create<PreflightStore>((set) => ({
  report: null,
  pageText: [],
  running: false,
  showReader: false,
  error: null,
  ran: NO_FLAGS,
  enabled: null,
  open: null,

  setRan: (ran) => set({ ran }),
  setEnabled: (enabled) => set({ enabled }),
  setOpen: (open) => set({ open }),
  toggleReader: () => set((s) => ({ showReader: !s.showReader })),
  reset: () =>
    set({ report: null, pageText: [], running: false, showReader: false, error: null, ran: NO_FLAGS, enabled: null, open: null }),

  run: async () => {
    set({ running: true, error: null });
    try {
      const files = useFilesStore.getState();
      // Lint the document currently in the editor so source offsets line up with
      // the editor for jump-to-source; fall back to the main document.
      const path = files.activePath ?? files.mainDoc;
      const source = files.files[path]?.content ?? files.files[files.mainDoc]?.content ?? "";

      const refs = buildRefsContext(files);

      const bytes = useCompileStore.getState().pdfBytes;
      if (bytes) {
        const ex = await extractForPreflight(bytes);
        const report = runPreflight({
          source,
          pages: ex.pages,
          meta: { lang: ex.lang, title: ex.title, tagged: ex.tagged },
          readerText: ex.pageText.join("\n"),
          struct: ex.struct,
          refs,
        });
        set({ report, pageText: ex.pageText, running: false });
      } else {
        const report = runPreflight({ source, refs });
        set({ report, pageText: [], running: false });
      }
    } catch (e) {
      set({ running: false, error: String(e) });
      void import("@/lib/log").then(({ logError }) => logError("preflight", e));
    }
  },
}));
