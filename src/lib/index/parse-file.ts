import type { FileSymbols, Sym, SymKind } from "./types";

/**
 * Parse one file into its symbols. Pure and regex-based (like the rest of the
 * app; no full TeX parser). `.bib` files yield only bib entries. `macrouse` is
 * NOT resolved here (it needs the project-wide macro set); buildIndex adds it.
 */

const SECTION_LEVEL: Record<string, number> = {
  part: 0,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4,
  paragraph: 5,
  subparagraph: 6,
};

/** Blank out `%` comments (preserving length and newlines) so scans skip them. */
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

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : "";
}

/** Resolve an \input/\include target the way LaTeX does (default .tex). */
function joinInput(dir: string, rel: string): string {
  let r = rel.replace(/^\.\//, "").trim();
  if (r.startsWith("/")) r = r.slice(1);
  const resolved = dir ? `${dir}/${r}` : r;
  return /\.[^/\\]+$/.test(resolved) ? resolved : `${resolved}.tex`;
}

export function parseFile(path: string, rawText: string): FileSymbols {
  const text = maskComments(rawText);
  const defs: Sym[] = [];
  const uses: Sym[] = [];

  // Precompute line starts for O(log n) line lookup.
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
  const lineAt = (offset: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const push = (
    arr: Sym[],
    kind: SymKind,
    name: string,
    from: number,
    to: number,
    nameFrom: number,
    nameTo: number,
    extra?: Partial<Sym>,
  ) => {
    arr.push({ kind, name, file: path, line: lineAt(from), from, to, nameFrom, nameTo, ...extra });
  };

  // .bib files: only entries.
  if (path.endsWith(".bib")) {
    const re = /@(\w+)\s*\{\s*([^,\s}]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const type = m[1].toLowerCase();
      if (type === "comment" || type === "string" || type === "preamble") continue;
      const key = m[2];
      const keyStart = m.index + m[0].lastIndexOf(key);
      push(defs, "bibentry", key, m.index, m.index + m[0].length, keyStart, keyStart + key.length);
    }
    return { file: path, defs, uses };
  }

  let m: RegExpExecArray | null;

  // --- Definitions ---

  // Sectioning.
  const sec = /\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\s*\{([^}]*)\}/g;
  while ((m = sec.exec(text))) {
    const title = m[2].trim();
    const nameStart = m.index + m[0].lastIndexOf("{") + 1;
    push(defs, "section", title, m.index, m.index + m[0].length, nameStart, nameStart + m[2].length, {
      level: SECTION_LEVEL[m[1]],
    });
  }

  // \label.
  const label = /\\label\s*\{([^}]*)\}/g;
  while ((m = label.exec(text))) {
    const start = m.index + m[0].lastIndexOf("{") + 1;
    push(defs, "label", m[1].trim(), m.index, m.index + m[0].length, start, start + m[1].length);
  }

  // Macros: \newcommand / \renewcommand / \providecommand (braced or bare).
  const cmd = /\\(?:newcommand|renewcommand|providecommand)\*?\s*\{?\s*\\([a-zA-Z@]+)/g;
  while ((m = cmd.exec(text))) {
    const nameStart = m.index + m[0].lastIndexOf("\\" + m[1]) + 1;
    push(defs, "macro", m[1], m.index, m.index + m[0].length, nameStart, nameStart + m[1].length);
  }
  // \def\foo
  const def = /\\def\s*\\([a-zA-Z@]+)/g;
  while ((m = def.exec(text))) {
    const nameStart = m.index + m[0].lastIndexOf("\\" + m[1]) + 1;
    push(defs, "macro", m[1], m.index, m.index + m[0].length, nameStart, nameStart + m[1].length);
  }
  // \DeclareMathOperator{\foo}
  const dmo = /\\DeclareMathOperator\*?\s*\{\s*\\([a-zA-Z@]+)/g;
  while ((m = dmo.exec(text))) {
    const nameStart = m.index + m[0].lastIndexOf("\\" + m[1]) + 1;
    push(defs, "macro", m[1], m.index, m.index + m[0].length, nameStart, nameStart + m[1].length);
  }

  // \newtheorem, \newenvironment, glossary entries, and \bibitem (inline bibs).
  const braceDef: [RegExp, SymKind][] = [
    [/\\newtheorem\*?\s*\{([^}]*)\}/g, "theorem"],
    [/\\(?:newenvironment|renewenvironment)\s*\{([^}]*)\}/g, "environment"],
    [/\\newglossaryentry\s*\{([^}]*)\}/g, "glossary"],
    [/\\newacronym\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g, "glossary"],
    [/\\bibitem\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g, "bibentry"],
  ];
  for (const [re, kind] of braceDef) {
    while ((m = re.exec(text))) {
      const start = m.index + m[0].lastIndexOf("{") + 1;
      push(defs, kind, m[1].trim(), m.index, m.index + m[0].length, start, start + m[1].length);
    }
  }

  // --- Uses ---

  // Multi-key commands: \ref-family and \cite-family. One use per key.
  const pushKeys = (whole: string, wholeIdx: number, group: string, kind: SymKind) => {
    const keyBase = wholeIdx + whole.lastIndexOf("{") + 1;
    const partRe = /[^,]+/g;
    let pm: RegExpExecArray | null;
    while ((pm = partRe.exec(group))) {
      const seg = pm[0];
      const key = seg.trim();
      if (!key || key === "*") continue;
      const lead = seg.length - seg.trimStart().length;
      const nameFrom = keyBase + pm.index + lead;
      push(uses, kind, key, wholeIdx, wholeIdx + whole.length, nameFrom, nameFrom + key.length);
    }
  };

  const ref = /\\(?:ref|eqref|autoref|cref|Cref|cpageref|pageref|vref|labelcref)\s*\{([^}]*)\}/g;
  while ((m = ref.exec(text))) pushKeys(m[0], m.index, m[1], "ref");

  const cite = /\\(?:cite|citep|citet|citeauthor|citeyear|citealt|parencite|textcite|autocite|nocite)\*?\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g;
  while ((m = cite.exec(text))) pushKeys(m[0], m.index, m[1], "cite");

  // Single-key uses.
  const gls = /\\(?:gls|Gls|GLS|glspl|Glspl|acrshort|acrlong|acrfull|acs|acl|ac)\s*\{([^}]*)\}/g;
  while ((m = gls.exec(text))) {
    const start = m.index + m[0].lastIndexOf("{") + 1;
    push(uses, "glossaryuse", m[1].trim(), m.index, m.index + m[0].length, start, start + m[1].length);
  }
  const beginEnv = /\\begin\s*\{([^}]*)\}/g;
  while ((m = beginEnv.exec(text))) {
    const start = m.index + m[0].lastIndexOf("{") + 1;
    push(uses, "envuse", m[1].trim(), m.index, m.index + m[0].length, start, start + m[1].length);
  }
  const dir = dirname(path);
  const input = /\\(?:input|include)\s*\{([^}]*)\}/g;
  while ((m = input.exec(text))) {
    const start = m.index + m[0].lastIndexOf("{") + 1;
    const raw = m[1].trim();
    push(uses, "inputedge", raw, m.index, m.index + m[0].length, start, start + m[1].length, {
      target: joinInput(dir, raw),
    });
  }

  return { file: path, defs, uses };
}
