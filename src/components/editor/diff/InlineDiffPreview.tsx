import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { unifiedMergeView } from "@codemirror/merge";
import { editorTheme } from "../cm/theme";
import { languageForPath } from "../cm/languages";

/** Above this size (per side) we skip the merge view — it isn't worth the jank. */
const MAX = 400_000;

/**
 * A compact, read-only red/green diff of two in-memory strings, rendered with
 * `@codemirror/merge`'s unified view (single column — deletions in red, additions
 * in green). Unlike `DiffView` this has no git or store coupling: give it the old
 * and new text and it renders. Used to preview an AI agent's proposed file edit
 * before the user approves it.
 */
export function InlineDiffPreview({
  path,
  oldText,
  newText,
  className,
}: {
  path: string;
  oldText: string;
  newText: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";
    if (oldText.length > MAX || newText.length > MAX) {
      const note = document.createElement("div");
      note.className = "px-3 py-2 text-[11px] text-muted-foreground";
      note.textContent = "File too large to preview a diff.";
      host.appendChild(note);
      return;
    }
    const lang = languageForPath(path);
    const view = new EditorView({
      doc: newText,
      extensions: [
        unifiedMergeView({ original: oldText, mergeControls: false }),
        lineNumbers(),
        editorTheme(),
        ...(lang ? [lang] : []),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
      ],
      parent: host,
    });
    return () => {
      view.destroy();
      host.innerHTML = "";
    };
  }, [path, oldText, newText]);

  return <div ref={hostRef} className={className} />;
}
