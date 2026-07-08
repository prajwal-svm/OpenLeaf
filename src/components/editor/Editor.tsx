import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { EditorContextMenu } from "./EditorContextMenu";
import { EditorToolbar } from "./EditorToolbar";
import { DiffView } from "./diff/DiffView";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { wrapSelection } from "./cm/controller";
import { useFilesStore } from "@/store/files";
import { useDiffStore, diffKey } from "@/store/diff";
import { base64ToUint8Array, readFileBase64 } from "@/lib/tauri";
import { cn } from "@/lib/utils";

function basename(p: string) {
  const parts = p.split("/");
  return parts[parts.length - 1];
}

function PdfFileView({ projectId, path }: { projectId: string; path: string }) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBytes(null);
    setErr(null);
    readFileBase64(projectId, path)
      .then((b64) => { if (!cancelled) setBytes(base64ToUint8Array(b64)); })
      .catch((e) => { if (!cancelled) setErr(String(e)); });
    return () => { cancelled = true; };
  }, [projectId, path]);

  if (err) return <div className="p-6 text-sm text-destructive">Failed to load PDF: {err}</div>;
  if (!bytes) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  return <PdfViewer data={bytes} scale={1} />;
}

const TEX_EXTS = [".tex", ".sty", ".cls", ".bib", ".ltx", ".bst"];

export function Editor() {
  const openTabs = useFilesStore((s) => s.openTabs);
  const activePath = useFilesStore((s) => s.activePath);
  const setActive = useFilesStore((s) => s.setActive);
  const closeTab = useFilesStore((s) => s.closeTab);
  const dirtyMap = useFilesStore((s) => s.files);
  const diffs = useDiffStore((s) => s.diffs);
  const activeKey = useDiffStore((s) => s.activeKey);
  const setActiveDiff = useDiffStore((s) => s.setActiveDiff);
  const clearActiveDiff = useDiffStore((s) => s.clearActiveDiff);
  const closeDiff = useDiffStore((s) => s.closeDiff);
  const diffFocused = activeKey !== null && diffs.some((d) => diffKey(d) === activeKey);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "b") {
        e.preventDefault();
        wrapSelection("\\textbf{", "}");
      } else if (k === "i") {
        e.preventDefault();
        wrapSelection("\\textit{", "}");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hasOpenFile = activePath !== null;
  const isTexFile = activePath != null && TEX_EXTS.some((e) => activePath.endsWith(e));
  const isPdfFile = activePath != null && activePath.toLowerCase().endsWith(".pdf");
  const projectId = useFilesStore((s) => s.projectId);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Tabs */}
      <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b px-2">
        {openTabs.length === 0 && diffs.length === 0 && (
          <span className="px-2 text-xs text-muted-foreground">No file open</span>
        )}
        {openTabs.map((path) => (
          <button
            key={path}
            onClick={() => {
              clearActiveDiff();
              setActive(path);
            }}
            className={cn(
              "group flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs",
              path === activePath && !diffFocused
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            {basename(path)}
            {dirtyMap[path]?.dirty && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(path);
              }}
              className="ml-0.5 cursor-pointer rounded p-0.5 hover:bg-accent"
            >
              <X className="size-3" />
            </span>
          </button>
        ))}
        {diffs.map((d) => {
          const key = diffKey(d);
          return (
            <button
              key={key}
              onClick={() => setActiveDiff(key)}
              className={cn(
                "group flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs",
                activeKey === key ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {basename(d.path)}
              <span className="text-muted-foreground">
                ({d.side === "staged" ? "Index" : "Working Tree"})
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  closeDiff(key);
                }}
                className="ml-0.5 cursor-pointer rounded p-0.5 hover:bg-accent"
              >
                <X className="size-3" />
              </span>
            </button>
          );
        })}
      </div>
      {/* Editor body */}
      {diffFocused ? (
        <DiffView />
      ) : hasOpenFile ? (
        <>
          {isTexFile && (
            <div className="shrink-0">
              <EditorToolbar />
            </div>
          )}
          <div className="flex h-6 shrink-0 items-center gap-1.5 border-b px-3 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            <span className="truncate">{activePath ?? ""}</span>
          </div>
          {isPdfFile && projectId ? (
            <div className="min-h-0 flex-1 overflow-auto bg-sidebar">
              <PdfFileView projectId={projectId} path={activePath!} />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-hidden">
              <EditorContextMenu>
                <CodeMirrorEditor />
              </EditorContextMenu>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
          <FileText className="mb-3 size-10 opacity-30" />
          <p className="text-sm">No file open.</p>
          <p className="text-xs">Pick a file from the tree to start editing.</p>
        </div>
      )}
    </div>
  );
}
