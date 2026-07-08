import { WidgetType } from "@codemirror/view";
import { createRoot, type Root } from "react-dom/client";
import { InlineEditPanel } from "./InlineEditPanel";

/**
 * A CodeMirror block widget that hosts the inline AI edit panel below the line
 * (Cursor/VSCode style). The panel is a React tree mounted into the widget DOM;
 * it reads the session store itself, so this widget is a stable singleton whose
 * `eq()` always returns true — CodeMirror keeps the same DOM (and React root)
 * across store-driven redraws, and only tears it down when the session closes.
 */
class PromptWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const dom = document.createElement("div");
    dom.className = "cm-inline-prompt";
    const root = createRoot(dom);
    (dom as unknown as { _reactRoot?: Root })._reactRoot = root;
    root.render(<InlineEditPanel />);
    return dom;
  }

  destroy(dom: HTMLElement) {
    const root = (dom as unknown as { _reactRoot?: Root })._reactRoot;
    // Defer unmount: React forbids unmounting while it may be rendering.
    queueMicrotask(() => root?.unmount());
  }

  ignoreEvent() {
    return true;
  }
}

/** Singleton widget instance (eq() === true keeps CodeMirror from recreating it). */
export const promptWidget = new PromptWidget();
