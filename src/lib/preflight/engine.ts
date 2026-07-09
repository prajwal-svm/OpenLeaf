import type { PositionedText, PreflightReport } from "./types";
import type { StructDoc } from "./structure";
import { runSourceRules } from "./source-rules";
import { runPdfRules } from "./pdf-rules";
import { verifyStructure } from "./structure";
import { simulateAtsParse, atsParseFindings } from "./ats-parse";
import { runRefsRules, type RefsContext } from "./refs-rules";
import { computeScores } from "./score";

export interface PreflightInput {
  /** The LaTeX source to lint (the main document's text). */
  source: string;
  /** Extracted text-with-position per page of the compiled PDF, if available. */
  pages?: PositionedText[][];
  /** PDF catalog metadata, if available. */
  meta?: { lang?: string | null; title?: string | null; tagged?: boolean };
  /** Reading-order plain text of the compiled PDF, for the ATS parse simulation. */
  readerText?: string;
  /** Normalized PDF structure tree, for output-accessibility verification (Tier B). */
  struct?: StructDoc;
  /** Context for the references & assets check (bib keys, labels, project files). */
  refs?: RefsContext;
}

/**
 * Run the full preflight: source rules always; PDF-layer rules, the ATS parse
 * simulation, and structure verification when the corresponding compiled-PDF
 * inputs are supplied. Combines findings and computes the two lens scores.
 */
export function runPreflight({ source, pages, meta, readerText, struct, refs }: PreflightInput): PreflightReport {
  const atsParse = readerText !== undefined ? simulateAtsParse(readerText) : undefined;

  const findings = [
    ...runSourceRules(source),
    ...(pages ? runPdfRules(pages, meta) : []),
    ...(struct ? verifyStructure(struct) : []),
    ...(atsParse ? atsParseFindings(atsParse) : []),
    ...(refs ? runRefsRules(source, refs) : []),
  ];

  const { ats, a11y, refs: refsScore } = computeScores(findings);
  return {
    findings,
    atsScore: ats,
    a11yScore: a11y,
    refsScore,
    ranAt: Date.now(),
    hasPdf: pages !== undefined,
    atsParse,
  };
}
