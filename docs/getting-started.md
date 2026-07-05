# Getting started with OpenLeaf

In about two minutes you'll have a project open, compiled, and exporting a PDF. Everything runs locally, so you don't need an account or an internet connection to write or compile.

## 1. Install

The quickest path today is building from source. Prebuilt installers are on the roadmap.

Prerequisites:

- [Node.js 20+](https://nodejs.org) and [pnpm](https://pnpm.io)
- [Rust (stable)](https://rustup.rs)
- [Tauri 2 system deps](https://v2.tauri.app/start/prerequisites/) for your OS
- Optional: [pandoc](https://pandoc.org/installing.html) for Word/HTML/Markdown export

Build and run:

```bash
git clone https://github.com/prajwal-svm/OpenLeaf.git
cd OpenLeaf
./scripts/fetch-tectonic.sh all     # fetch the LaTeX compiler sidecar
pnpm install
pnpm tauri dev
```

The first run fetches LaTeX packages (a few hundred MB), so later compiles are fully offline.

## 2. Create your first project

1. On the Library home, click New from template.
2. Pick a starter:
   - Blank document: a minimal article.
   - One-Page Resume: an ATS-safe single-page resume.
   - IEEE Research Paper: a two-column conference paper with a `.bib`.
3. Give it a name and open it.

## 3. Write and compile

Type in the editor on the left. Auto-compile runs a couple of seconds after you stop typing. Press ⌘↵ (Ctrl+Enter) to recompile immediately. The PDF on the right updates live, with zoom, fit-to-width, and page navigation.

## 4. Jump between source and PDF (SyncTeX)

Source to PDF: put your cursor somewhere and press ⌘⇧J (or click the arrow on the divider). The PDF scrolls to the matching spot and highlights it.

PDF to source: ⌘/Ctrl-click anywhere on the PDF to jump the cursor there in the editor.

## 5. Export

Click the Download icon in the toolbar, then Download as PDF. The output is ATS-clean by default: real selectable text, embedded subset fonts. For Word/HTML/Markdown, install pandoc and use the same menu.

## 6. Where your files live

Every project is a plain folder under `~/.openleaf/projects/<id>/` containing your `.tex`, `.bib`, images, and a real `.git` repository. They're just files, so you can browse, copy, or back them up with any tool.

---

Next: the full [Features](features.md) list, the [AI Assistant](ai-assistant.md), or [GitHub Sync](github-sync.md).
