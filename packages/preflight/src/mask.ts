/**
 * Blank out LaTeX line comments so preflight rule scans skip commented-out
 * source (otherwise a `% \usepackage{multicol}` would dock the score with a
 * false positive). A `%` starts a comment unless it is escaped (`\%`), i.e.
 * preceded by an odd number of backslashes.
 *
 * Comment characters are replaced with spaces (not deleted) so that every
 * character offset stays put and any position-based Finding reporting remains
 * correct. Newlines and overall length are preserved.
 *
 * This duplicates the `maskComments` helper in src/lib/index/parse-file.ts on
 * purpose: preflight must not import from src/lib/index/.
 */
export function maskComments(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] !== "%") continue;
        let b = 0;
        for (let j = i - 1; j >= 0 && line[j] === "\\"; j--) b++;
        if (b % 2 === 0) return line.slice(0, i) + " ".repeat(line.length - i);
      }
      return line;
    })
    .join("\n");
}
