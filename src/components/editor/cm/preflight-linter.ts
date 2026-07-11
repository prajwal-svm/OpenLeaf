import { linter, type Diagnostic } from "@codemirror/lint";
import { runSourceRules } from "@openleaf/preflight";

/**
 * Inline squiggles for the source-level preflight rules (ATS + accessibility),
 * so problems surface in the gutter just like the LaTeX linter. Only findings
 * that map to a source range are shown; whole-document and PDF findings live in
 * the Preflight panel. Self-contained on the view's doc, like `latex-linter.ts`.
 */
export function createPreflightLinter() {
  return linter(
    (view): Diagnostic[] => {
      const diags: Diagnostic[] = [];
      for (const f of runSourceRules(view.state.doc.toString())) {
        if (typeof f.from !== "number" || typeof f.to !== "number") continue;
        diags.push({
          from: f.from,
          to: f.to,
          severity: f.severity,
          message: `${f.title}. ${f.detail}`,
          source: "preflight",
        });
      }
      return diags;
    },
    { delay: 900 },
  );
}
