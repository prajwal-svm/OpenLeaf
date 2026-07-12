---
title: "Keyboard shortcuts"
description: "OpenLeaf is keyboard-driven. Formatting and code navigation live in shortcuts, the editor toolbar, the context menu, the command palette, and slash-commands."
---

OpenLeaf is keyboard-driven. Formatting and code navigation live in shortcuts, the editor toolbar, the context menu, the command palette, and slash-commands.

## Global

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl K` | Command palette |
| `⌘⇧F` / `Ctrl ⇧ F` | Search across all documents |
| `⌘↵` / `Ctrl ↵` | Recompile |
| `⌘⇧J` / `Ctrl ⇧ J` | Source → PDF (SyncTeX forward) |
| `⌘/` / `Ctrl /` | Show this reference |

## Editor

| Shortcut | Action |
|---|---|
| `⌘F` / `Ctrl F` | Find & replace |
| `⌘⇧L` / `Ctrl ⇧ L` | Go to line |
| `⌘B` / `Ctrl B` | Bold (`\textbf{}`) |
| `⌘I` / `Ctrl I` | Italic (`\textit{}`) |
| `Ctrl Space` | Trigger autocomplete |
| `/` | Slash-command insert menu (`/figure`, `/table`, `/section`, `/cite`, `/math`) |
| Click the gutter arrow | Fold / unfold an environment or section |
| `Ctrl ⇧ [` / `Ctrl ⇧ ]` | Fold / unfold at the cursor |
| `⌘/Ctrl-click` on PDF | PDF → source (SyncTeX inverse) |

## Code intelligence

Powered by the project index (labels, refs, citations, macros, theorems, glossary, and the `\input` graph). Also available from the editor toolbar (the `{}` menu) and the right-click menu.

| Shortcut | Action |
|---|---|
| `F12` or `⌘/Ctrl-click` | Go to definition (jumps across files) |
| `⇧F12` | Find references (opens the References panel) |
| `F2` | Rename symbol project-wide (label, citation key, or macro) |

## Layout and view

| Shortcut | Action |
|---|---|
| Editor / Split / PDF | Segmented control in the toolbar |
| Double-click the divider | Toggle the PDF pane |
| Drag the divider | Resize panes |

## Vim mode

Toggle in Settings → Appearance. When on, you get the full CodeMirror Vim keybindings (`h j k l`, `i`, `:w`, `dd`, `ciw`, ...) alongside the shortcuts above.

## Source control

| Shortcut | Action |
|---|---|
| Toolbar branch icon | Open the Commit & Push dialog |
| Source Control panel | Stage/discard, commit, push, pull |

Tip: open the in-app reference anytime with `⌘/` / `Ctrl /`.
