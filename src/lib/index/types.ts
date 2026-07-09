/**
 * Project index: a lightweight LaTeX language service. One symbol table over the
 * whole project, powering go-to-definition, find-references, rename-refactor, and
 * the AI project_map tool. See docs/planning/specs/2026-07-09-project-index-language-service-design.md.
 */

export type DefKind = "label" | "macro" | "bibentry" | "theorem" | "glossary" | "environment" | "section" | "file";
export type UseKind = "ref" | "cite" | "macrouse" | "envuse" | "glossaryuse" | "inputedge";
export type SymKind = DefKind | UseKind;

export interface Sym {
  kind: SymKind;
  /** Label key, macro name (no backslash), bib key, env name, section title, or file path. */
  name: string;
  /** Project-relative file this symbol lives in. */
  file: string;
  /** 1-based line within `file`. */
  line: number;
  /** Full token span within `file` (for hit-testing and jump targets). */
  from: number;
  to: number;
  /** The name-only span within `file` (what rename edits). */
  nameFrom: number;
  nameTo: number;
  /** Sectioning level, for `section` symbols. */
  level?: number;
  /** Resolved target path, for `inputedge` symbols. */
  target?: string;
}

export interface FileSymbols {
  file: string;
  defs: Sym[];
  uses: Sym[];
}

/** A single textual replacement, for rename. */
export interface Edit {
  file: string;
  from: number;
  to: number;
  newText: string;
}

export interface RenamePlan {
  edits: Edit[];
  /** Number of distinct files touched. */
  fileCount: number;
  /** True when a same-kind definition already uses the target name. */
  collision: boolean;
}

/** The queryable project index (returned by buildIndex). */
export interface ProjectIndex {
  /** All definitions, by kind then name. */
  defs: Sym[];
  /** All uses. */
  uses: Sym[];
  /** The token (use or def) whose span contains `offset` in `file`, if any. */
  symbolAt: (file: string, offset: number) => Sym | null;
  /** The definition a use resolves to (or null if unresolved / already a def with no target). */
  definitionFor: (sym: Sym) => Sym | null;
  /** All uses of `name` for the given use kind. */
  references: (name: string, kind: UseKind) => Sym[];
  /** The definition (first) plus every use that resolves to it, for a symbol. */
  allReferences: (sym: Sym) => Sym[];
  /** A rename plan for a definition (or a use, resolved to its def first). */
  renamePlan: (sym: Sym, newName: string) => RenamePlan;
}
