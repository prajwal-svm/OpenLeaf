import { useEffect, useRef, useState } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { MergeView, unifiedMergeView } from "@codemirror/merge";
import { Columns2, GitCompare, Rows3 } from "lucide-react";
import { editorTheme } from "../cm/theme";
import { languageForPath } from "../cm/languages";
import { gitShow, readFileContent, writeFileContent } from "@/lib/tauri";
import { useDiffStore } from "@/store/diff";
import { useFilesStore } from "@/store/files";
import { useGitStatusStore } from "@/store/git-status";
import { cn } from "@/lib/utils";
import { diffSides } from "./sides";

/**
 * Renders a git diff in the editor area (replacing the old modal), using
 * `@codemirror/merge`: split (side-by-side) or unified. Read-only for now;
 * editable working-tree diffs come in a later phase.
 */
export function DiffView() {
  const diff = useDiffStore((s) => s.diff);
  const mode = useDiffStore((s) => s.mode);
  const setMode = useDiffStore((s) => s.setMode);
  const projectId = useFilesStore((s) => s.projectId);
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!diff || !projectId) return;
    const { path, side } = diff;
    let cancelled = false;
    let view: { destroy: () => void } | null = null;
    let writeTimer: ReturnType<typeof setTimeout> | null = null;
    setLoading(true);
    setError(null);
    const { oldRev, newRev, editable } = diffSides(side);

    // Editable working-tree diff: persist edits to disk (debounced) so git sees
    // them; the MergeView re-diffs live against the fixed old side as you type.
    const persist = async (content: string) => {
      try {
        await writeFileContent(projectId, path, content);
        useFilesStore.setState((s) => ({
          files: { ...s.files, [path]: { content, dirty: false } },
        }));
        void useGitStatusStore.getState().refresh(projectId);
        window.dispatchEvent(new CustomEvent("openleaf:git-changed"));
      } catch {
        /* ignore transient write errors */
      }
    };
    const onEdit = EditorView.updateListener.of((vu) => {
      if (vu.docChanged) {
        if (writeTimer) clearTimeout(writeTimer);
        const content = vu.state.doc.toString();
        writeTimer = setTimeout(() => void persist(content), 400);
      }
    });

    const build = async () => {
      try {
        const oldText = await gitShow(projectId, oldRev, path);
        const newText =
          newRev === "WORKTREE"
            ? await readFileContent(projectId, path).catch(() => "")
            : await gitShow(projectId, "INDEX", path);
        if (cancelled) return;
        const host = hostRef.current;
        if (!host) return;
        host.innerHTML = "";

        const lang = languageForPath(path);
        const readOnly: Extension[] = [
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
        ];
        const base: Extension[] = [lineNumbers(), editorTheme(), ...(lang ? [lang] : [])];
        const oldExt: Extension[] = [...base, ...readOnly];
        const newExt: Extension[] = editable ? [...base, onEdit] : [...base, ...readOnly];

        if (mode === "split") {
          view = new MergeView({
            a: { doc: oldText, extensions: oldExt },
            b: { doc: newText, extensions: newExt },
            parent: host,
            highlightChanges: true,
            gutter: true,
            collapseUnchanged: { margin: 3, minSize: 4 },
          });
        } else {
          view = new EditorView({
            doc: newText,
            extensions: [
              unifiedMergeView({ original: oldText, mergeControls: false }),
              ...newExt,
            ],
            parent: host,
          });
        }
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      }
    };
    void build();

    return () => {
      cancelled = true;
      if (writeTimer) clearTimeout(writeTimer);
      view?.destroy();
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [diff, mode, projectId]);

  if (!diff) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b px-2">
        <GitCompare className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">
          {diff.side === "staged" ? "Staged ↔ HEAD" : "Working ↔ Index"}
        </span>
        <div className="ml-auto flex overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => setMode("split")}
            aria-label="Split view"
            className={cn(
              "flex size-6 items-center justify-center",
              mode === "split" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Columns2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMode("unified")}
            aria-label="Unified view"
            className={cn(
              "flex size-6 items-center justify-center",
              mode === "unified" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Rows3 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <div ref={hostRef} className="h-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Loading diff…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
