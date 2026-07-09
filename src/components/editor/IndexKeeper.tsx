import { useEffect } from "react";
import { useActiveContent, useFilesStore } from "@/store/files";
import { useIndexStore } from "@/store/project-index";

/**
 * Keeps the project index fresh without re-rendering the app root: a full rebuild
 * (from disk) on project switch, and a debounced in-memory re-index of the active
 * file as it is edited. Renders nothing.
 */
export function IndexKeeper() {
  const projectId = useFilesStore((s) => s.projectId);
  const activePath = useFilesStore((s) => s.activePath);
  // The file tree loads AFTER projectId is set, and changes on create/delete/rename,
  // so key the full rebuild on the tree (not just projectId) or the .bib files and
  // other unopened files would be missed and citations would look unresolved.
  const tree = useFilesStore((s) => s.tree);
  const content = useActiveContent();

  useEffect(() => {
    useIndexStore.getState().reset();
    if (projectId && tree.length > 0) void useIndexStore.getState().rebuildFromDisk();
  }, [projectId, tree]);

  useEffect(() => {
    if (!activePath) return;
    const t = setTimeout(() => useIndexStore.getState().updateFile(activePath, content), 400);
    return () => clearTimeout(t);
  }, [activePath, content]);

  return null;
}
