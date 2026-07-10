import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import {
  compileProject,
  readCompiledPdf,
  type CompileError,
  type CompileResult,
} from "@/lib/tauri";
import { useFilesStore } from "@/store/files";
import { useSettingsStore } from "@/store/settings";
import { notifyError } from "@/lib/toast";

// Bumped on every recompile so a compile that finishes after the project was
// switched (or a newer compile started) can detect it is stale and not overwrite
// the current preview.
let compileSeq = 0;

export type CompileStatus = "idle" | "compiling" | "success" | "error";

interface CompileState {
  status: CompileStatus;
  log: string;
  errors: CompileError[];
  pdfBytes: Uint8Array | null;
  lastCompiledAt: number | null;
  compileTimeMs: number | null;
  autoCompile: boolean;
  setAutoCompile: (v: boolean) => void;
  /** Clear all compile state (used when switching projects). */
  reset: () => void;
  recompile: () => Promise<CompileResult | undefined>;
}

export const useCompileStore = create<CompileState>((set, get) => ({
  status: "idle",
  log: "",
  errors: [],
  pdfBytes: null,
  lastCompiledAt: null,
  compileTimeMs: null,
  autoCompile: false,
  setAutoCompile: (v) => set({ autoCompile: v }),
  reset: () =>
    set({
      status: "idle",
      log: "",
      errors: [],
      pdfBytes: null,
      lastCompiledAt: null,
      compileTimeMs: null,
    }),
  recompile: async () => {
    // Don't start a second compile while one is running (double Cmd+Enter, or
    // the auto-compile timer racing a manual compile). They share one build dir.
    if (get().status === "compiling") return undefined;

    const files = useFilesStore.getState();
    try {
      await files.saveActive();
    } catch (e) {
      notifyError("save before compile", e);
      return undefined;
    }

    const projectId = files.projectId ?? "default";
    const mainDoc = files.mainDoc || "main.tex";
    const offline = useSettingsStore.getState().offline;
    const seq = ++compileSeq;
    // True once this compile's result is no longer the one the UI should show
    // (project switched, or a newer compile started).
    const stale = () => seq !== compileSeq || useFilesStore.getState().projectId !== files.projectId;

    set({ status: "compiling", log: "", errors: [] });
    const unlisten = await listen<string>("compile:log", (e) => {
      if (seq !== compileSeq) return; // ignore log chunks from a superseded compile
      set((s) => ({ log: s.log + e.payload }));
    });
    try {
      const result = await compileProject(projectId, mainDoc, offline);
      const bytes = result.has_pdf
        ? new Uint8Array(await readCompiledPdf(projectId))
        : null;
      if (stale()) return result;
      set({
        status: bytes ? "success" : "error",
        pdfBytes: bytes,
        errors: result.errors,
        log: result.log,
        lastCompiledAt: Date.now(),
        compileTimeMs: result.compile_time_ms ?? 0,
      });
      // Tell a detached preview window (if open) to reload the fresh PDF.
      void import("@/lib/preview-window").then((m) => m.refreshPreviewWindow());
      return result;
    } catch (e) {
      if (!stale()) set({ status: "error", log: `Compile failed: ${String(e)}` });
      void import("@/lib/log").then(({ logError }) => logError("compile", e));
      return undefined;
    } finally {
      unlisten();
    }
  },
}));
