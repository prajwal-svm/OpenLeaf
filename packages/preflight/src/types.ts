/**
 * Document Preflight: shared types for the accessibility + ATS-readiness
 * checker. See docs/planning/specs/2026-07-08-accessibility-ats-preflight-design.md.
 *
 * ATS parsing failures and screen-reader failures stem from the same defects in
 * a PDF's text layer, so one rule engine serves two "lenses":
 *  - "ats"   affects only the ATS-readiness score
 *  - "a11y"  affects only the Accessibility score
 *  - "both"  affects both
 */
export type Lens = "ats" | "a11y" | "both" | "refs";

export type Severity = "error" | "warning" | "info";

export interface Finding {
  /** Stable rule id, e.g. "multi-column". Multiple findings may share an id. */
  id: string;
  lens: Lens;
  severity: Severity;
  /** One-line summary. Uses commas/periods, never em dashes (project style). */
  title: string;
  /** Why it matters and how to fix it. */
  detail: string;
  /** Source offsets, when the finding maps to a place in the .tex (enables
   *  jump-to-source and inline squiggles). Absent for whole-document or PDF findings. */
  from?: number;
  to?: number;
  /** 1-based page number, for PDF-layer findings. */
  page?: number;
}

export interface PreflightReport {
  findings: Finding[];
  /** 0-100 readiness for automated resume parsers. */
  atsScore: number;
  /** 0-100 readiness for screen readers / accessibility mandates. */
  a11yScore: number;
  /** 0-100 manuscript integrity (references, citations, assets). */
  refsScore: number;
  /** Epoch ms when the report was produced. */
  ranAt: number;
  /** Whether PDF-layer rules ran (a compiled PDF was available). */
  hasPdf: boolean;
  /** The simulated ATS parse of the compiled PDF, when reader text was available. */
  atsParse?: import("./ats-parse").AtsParse;
}

/** A single run of extracted text from the compiled PDF, with position. */
export interface PositionedText {
  str: string;
  x: number;
  y: number;
  width: number;
}
