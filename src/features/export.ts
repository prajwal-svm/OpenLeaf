import { save } from "@tauri-apps/plugin-dialog";
import { exportPdf } from "@/lib/tauri";
import { useFilesStore } from "@/store/files";
import { useCompileStore } from "@/store/compile";

/** Open a save dialog and write the compiled PDF to the chosen path. */
export async function exportCurrentPdf(): Promise<void> {
  const { projectId, mainDoc, projectName } = useFilesStore.getState();
  const { pdfBytes } = useCompileStore.getState();
  if (!projectId || !pdfBytes) return;
  const name = (projectName || "document").replace(/[^\w.-]+/g, "_");
  const dest = await save({
    defaultPath: `${name}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!dest) return;
  await exportPdf(projectId, mainDoc, dest);
}
