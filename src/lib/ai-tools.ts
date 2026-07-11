import {
  createOpenLeafTools as createOpenLeafToolsCore,
  createFigureTools as createFigureToolsCore,
  type AiToolsHost,
  type ProjectIndexView,
  type ConfirmFn,
} from "@openleaf/ai-tools";
import {
  readFileContent,
  writeFileContent,
  createFile,
  deleteFile,
  renameFile,
  setMainDocCmd,
  listFiles,
  searchProject,
  compileIsolated,
  readIsolatedPdf,
  readProjectBytes,
  writeProjectBytes,
} from "@/lib/tauri";
import { useFilesStore } from "@/store/files";
import { useCompileStore } from "@/store/compile";
import { useIndexStore } from "@/store/project-index";
import { useSettingsStore } from "@/store/settings";
import { extractPdfText } from "@/lib/pdf-text";
import {
  setLastFigurePreview,
  getLastFigurePreview,
  getFigureInsertTarget,
} from "@/lib/ai-figure";
import { pdfPageToPng } from "@/lib/pdf-image";
import { insertAtCursor, replaceRange } from "@/components/editor/cm/controller";

export type { ToolApprovalRequest, ConfirmFn } from "@openleaf/ai-tools";

/** The app adapter behind @openleaf/ai-tools: Tauri client + stores. */
const HOST: AiToolsHost = {
  getProjectId: () => useFilesStore.getState().projectId,
  readFileContent,
  writeFileContent,
  createFile,
  deleteFile,
  renameFile,
  setMainDoc: setMainDocCmd,
  listFiles,
  searchProject,
  // NB: the figure-pipeline services are referenced lazily (arrow wrappers)
  // so test mocks of @/lib/tauri that omit them don't fail at module init.
  readProjectBytes: (projectId, path) => readProjectBytes(projectId, path),
  writeProjectBytes: (projectId, relPath, b64) => writeProjectBytes(projectId, relPath, b64),
  applyExternalWrite: (path, content) => useFilesStore.getState().applyExternalWrite(path, content),
  applyExternalRename: (from, to) => useFilesStore.getState().applyExternalRename(from, to),
  applyExternalDelete: (path) => useFilesStore.getState().applyExternalDelete(path),
  refreshTree: () => useFilesStore.getState().refreshTree(),
  setMainDocState: (mainDoc) => useFilesStore.setState({ mainDoc }),
  recompile: () => useCompileStore.getState().recompile(),
  getCompileLog: () => useCompileStore.getState().log,
  getPdfBytes: () => useCompileStore.getState().pdfBytes,
  extractPdfText,
  getProjectIndex: async () => {
    const idx = useIndexStore.getState();
    if (!idx.index) await idx.rebuildFromDisk();
    return (useIndexStore.getState().index ?? null) as unknown as ProjectIndexView | null;
  },
  compileIsolated: (projectId, source) =>
    compileIsolated(projectId, source, useSettingsStore.getState().offline),
  readIsolatedPdf: (projectId) => readIsolatedPdf(projectId),
  pdfToPng: pdfPageToPng,
  setLastFigurePreview,
  getLastFigurePreview,
  getFigureInsertTarget,
  insertAtCursor,
  replaceRange,
};

/** The general project toolset, bound to the app services. */
export function createOpenLeafTools(opts?: { confirm?: ConfirmFn }) {
  return createOpenLeafToolsCore(HOST, opts);
}

/** The figure-studio toolset, bound to the app services. */
export function createFigureTools(opts?: {
  confirm?: ConfirmFn;
  onImage?: (dataUrl: string) => void;
}) {
  return createFigureToolsCore(HOST, opts);
}
