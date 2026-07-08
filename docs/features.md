# Features

What OpenLeaf can do. All of it runs on your machine.

## Editor (CodeMirror 6)

- LaTeX autocomplete for commands, `\ref`/`\label`, and `\cite` (parsed from your `.bib`), plus file names from the tree. Press Ctrl-Space to trigger.
- Slash commands: type `/` for a Notion-style insert menu with `/figure`, `/table`, `/section`, `/cite`, and `/math`.
- Find and replace with `⌘F`. Go to line with `⌘⇧L`.
- Vim mode, toggled in Settings → Appearance (or the `⌘/` shortcuts).
- Spellcheck via Hunspell (WASM). It underlines misspellings and skips commands, math, and comments.
- Linting: compile errors show up as red squiggles and gutter marks. Click one to jump to it.

## Compile pipeline

- Tectonic (XeTeX) runs as a bundled sidecar and produces ATS-clean output with embedded subset fonts.
- Auto-compile is debounced at roughly 2.5s. Recompile manually with `⌘↵`.
- Offline mode (Settings → General) compiles with `--only-cached` and never touches the network.
- The error log is parsed into editor diagnostics, and the AI can read and fix them.

## PDF preview (pdf.js)

- Continuous scroll, zoom in and out, fit-to-width, fit-to-height, page navigation, and fullscreen.
- Download PDF (with a custom filename) and download source as a `.zip`.
- SyncTeX overlay for bidirectional source↔PDF navigation.

## Projects and library

- Library home lists all projects with thumbnails, last-edited time, and export history.
- Templates: Blank, One-Page Resume, and IEEE Paper.
- Source tree: create, rename, delete, duplicate, drag-drop, upload, and pick the main document.
- Multi-file support for `\input`, images (PNG/JPG/PDF/EPS), `.bib`, and editor tabs.
- Autosave writes your changes to disk shortly after you stop typing.

## History (Git-backed)

Every project is a git repo, and OpenLeaf auto-commits on save. So you get:

- A history view with the full commit log.
- Side-by-side diffs, unified or split.
- Restore: one click rolls a file back to any commit.

## Source control and sync

- See changed files, stage or discard them, write a message, and Commit, Push, or Pull.
- Publish to GitHub: create a new repo or link an existing one, then push. See [GitHub Sync](github-sync.md).
- Ahead/behind indicators tell you when to pull.

## AI assistant

A chat assistant that can actually _do_ things to your project:

- Read and write files, find-and-replace, create, rename, and delete.
- Compile, read the log, and extract PDF text to verify output.
- Search across all projects, set the main doc, and toggle the theme.
- Every file-changing edit pauses for approval with a red/green diff preview, and the decision stays visible in the chat.
- Add your own custom instructions, sandboxed so they cannot reveal or override the built-in prompt.

Bring any provider: OpenAI, Anthropic, Groq, OpenRouter, DeepSeek, Mistral, xAI, Z.AI, or run locally with Ollama. See [AI Assistant](ai-assistant.md).

## Export

- PDF, always, ATS-clean.
- Word (.docx), HTML, and Markdown via pandoc, which you install separately.

## Theming

Light and dark mode (it respects your system setting) with Geist design tokens. Toggle it anytime from the rail or Settings.

## Command palette

Press `⌘K` to fuzzy-search every action: new file, compile, switch view, go-to-line, toggle theme, insert figure, and more.
