import { synctexForward, synctexInverse } from "@/lib/tauri";
import { getCurrentLine, gotoLine } from "@/components/editor/cm/controller";
import { gotoRect } from "@/components/pdf/pdfController";
import { useFilesStore } from "@/store/files";
import { logError } from "@/lib/log";

/** Forward SyncTeX: cursor → PDF highlight (uses the active file + project). */
export async function forwardFromCursor() {
  const { projectId, mainDoc, activePath } = useFilesStore.getState();
  if (!projectId || !activePath) {
    void logError("synctex forward", "no active project/file");
    return;
  }
  const line = getCurrentLine();
  if (line == null) {
    void logError("synctex forward", "could not determine cursor line");
    return;
  }
  try {
    const rect = await synctexForward(projectId, mainDoc, activePath, line);
    if (!rect) {
      void logError(
        "synctex forward",
        `no rect for ${activePath}:${line} (file not in synctex - recompile?)`
      );
      return;
    }
    gotoRect(rect);
  } catch (e) {
    void logError("synctex forward", e);
  }
}

/** Inverse SyncTeX: PDF click → editor cursor. */
export async function inverseFromClick(page: number, x: number, y: number) {
  const { projectId, mainDoc } = useFilesStore.getState();
  if (!projectId) return;
  try {
    const hit = await synctexInverse(projectId, mainDoc, page, x, y);
    if (hit) gotoLine(hit.line);
  } catch (e) {
    void logError("synctex inverse", e);
  }
}
