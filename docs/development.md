# Development

What you need to work on OpenLeaf. The app is a [Tauri 2](https://tauri.app) project: a React + TypeScript + Vite frontend that talks over IPC to a Rust backend, which spawns the Tectonic compiler as a sidecar.

## Repo layout

```
localeaf/
├── src/                    React frontend
│   ├── components/         ui (shadcn-style), layout, editor, pdf, library, ai
│   ├── features/           compile, synctex, export
│   ├── lib/                tauri wrappers, ai-providers, github, spellcheck, utils
│   └── store/              zustand stores
├── src-tauri/
│   ├── src/                rust: commands, config, git, github, paths, project, synctex
│   ├── binaries/           tectonic-<triple>[.exe] sidecars (fetched)
│   ├── resources/          templates, dictionaries, tex bundle
│   └── tauri.conf.json
├── scripts/fetch-tectonic.sh
└── docs/
```

## Prerequisites

- Node.js 20+, pnpm
- Rust (stable) via [rustup](https://rustup.rs)
- [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your OS
- Optional: [pandoc](https://pandoc.org/installing.html) for non-PDF export

## First run

```bash
./scripts/fetch-tectonic.sh all     # fetch compiler sidecars for all platforms
pnpm install
pnpm tauri dev
```

For a single platform: `./scripts/fetch-tectonic.sh aarch64-apple-darwin` (use `rustc -vV` to find your target triple).

## Day-to-day

```bash
pnpm tauri dev          # run the app with hot reload (frontend) + cargo incremental (backend)
pnpm build              # typecheck + build the frontend (tsc -b && vite build)
pnpm tauri build        # produce a distributable bundle
```

### Checks before opening a PR

Make sure both pass:

```bash
pnpm build                                # frontend typecheck (noUnusedLocals/Parameters on)
cd src-tauri && cargo check               # backend compiles
```

## How a compile works

1. Frontend calls `compileProject(projectId, mainDoc, offline)` via Tauri IPC.
2. Rust writes a small wrapper (`_openleaf_entry.tex`) that neutralizes pdfLaTeX-only commands under XeTeX.
3. Spawns the `tectonic` sidecar with `--synctex --keep-logs --print` (and `--only-cached` when offline).
4. Streams stdout/stderr to the log pane; on exit returns PDF bytes (base64) + `.synctex.gz` + parsed errors.
5. The frontend renders the PDF with pdf.js and turns errors into CodeMirror diagnostics.

## Where state lives

- Config and secrets: `~/.openleaf/config.json` (`0600` on Unix). Holds the GitHub token, AI provider/model, and per-provider AI keys.
- Projects: `~/.openleaf/projects/<id>/`, plain folders with `.git`.
- App log: `~/.openleaf/app.log`.

## Key extension points

- Add an AI provider → `src/lib/ai-providers.ts` (`PROVIDERS` + `buildModel`). OpenAI-compatible providers just need a `baseURL`.
- Add a command → declare in `src-tauri/src/*.rs`, register in `src-tauri/src/lib.rs`, wrap in `src/lib/tauri.ts`.
- Add a template → `src-tauri/src/project.rs` (`template_for` + the template constant).
- Add a tool for the AI → `src/lib/ai-tools.ts` (`createOpenLeafTools`).

## Sync and GitHub internals

OAuth device flow runs server-side in Rust (`src-tauri/src/github.rs`) because the OAuth endpoints aren't CORS-enabled. The API calls (api.github.com) happen from the frontend.

## Coding style

- TypeScript: follow what's already there. No comments unless asked. Respect `noUnusedLocals`/`noUnusedParameters`.
- Rust: idiomatic, small commands, friendly error strings.
- UI: Tailwind v4 + Geist tokens; reuse the `Button`/`Tooltip`/`Select` primitives.

## Releasing

Packaging and signing are still being set up. The goal is a notarized `.dmg` (macOS, universal), EV-signed `.msi`/`.exe` (Windows x64), and `.AppImage`/`.deb` (Linux), each with the matching Tectonic sidecar fetched in CI via `scripts/fetch-tectonic.sh`.
