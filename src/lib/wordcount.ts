/** Approximate word/character/line counts for a LaTeX document. */
export function countWords(tex: string): {
  words: number;
  characters: number;
  lines: number;
} {
  // Drop line comments (a % not preceded by \).
  let t = tex.replace(/(^|[^\\])%.*$/gm, "$1");
  // Drop \begin{...} / \end{...}.
  t = t.replace(/\\(begin|end)\s*\{[^}]*\}/g, " ");
  // Unwrap \command{arg} → arg (one level).
  t = t.replace(/\\[a-zA-Z]+\*?\s*\{([^}]*)\}/g, "$1");
  // Remove remaining commands and math delimiters.
  t = t.replace(/\\[a-zA-Z]+\*?/g, " ").replace(/[{}$]/g, " ");
  const words = t.split(/\s+/).filter(Boolean);
  return {
    words: words.length,
    characters: tex.length,
    lines: tex.split(/\n/).length,
  };
}
