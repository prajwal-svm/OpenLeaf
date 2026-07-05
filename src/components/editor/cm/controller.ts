import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { undo, redo } from "@codemirror/commands";
import { openSearchPanel } from "@codemirror/search";

/** Holds the active CodeMirror view so other UI can drive it. */
let view: EditorView | null = null;

export function setEditorView(v: EditorView | null) {
  view = v;
}

export function getEditorView(): EditorView | null {
  return view;
}

/** Current cursor line number (1-based). */
export function getCurrentLine(): number | null {
  const v = getEditorView();
  if (!v) return null;
  return v.state.doc.lineAt(v.state.selection.main.head).number;
}

/** Move the cursor to a line (1-based), scroll it to center, focus. */
export function gotoLine(line: number) {
  const v = getEditorView();
  if (!v) return;
  const n = Math.min(Math.max(1, line), v.state.doc.lines);
  const lineObj = v.state.doc.line(n);
  v.dispatch({
    selection: EditorSelection.single(lineObj.from),
    effects: EditorView.scrollIntoView(lineObj.from, { y: "center" }),
  });
  v.focus();
}

/** Insert text at the current cursor/selection and refocus the editor. */
export function insertAtCursor(text: string) {
  const v = getEditorView();
  if (!v) return;
  const sel = v.state.selection.main;
  v.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + text.length },
  });
  v.focus();
}

/** Wrap the current selection with `before`...`after`. */
export function wrapSelection(before: string, after: string) {
  const v = getEditorView();
  if (!v) return;
  const sel = v.state.selection.main;
  const selected = v.state.sliceDoc(sel.from, sel.to);
  v.dispatch({
    changes: {
      from: sel.from,
      to: sel.to,
      insert: `${before}${selected}${after}`,
    },
    selection: {
      anchor: sel.from + before.length,
      head: sel.to + before.length,
    },
  });
  v.focus();
}

export function focusEditor() {
  getEditorView()?.focus();
}

/** Undo / redo the last editor change. */
export function editorUndo() {
  const v = getEditorView();
  if (v) undo(v);
}
export function editorRedo() {
  const v = getEditorView();
  if (v) redo(v);
}

/** Open the in-editor find/replace panel. */
export function editorFind() {
  const v = getEditorView();
  if (v) openSearchPanel(v);
}

/** Insert text and leave the cursor at the end of the insertion. */
export function insertText(text: string) {
  insertAtCursor(text);
}
