/** Decode the common XML entities that arrive in Atom text (e.g. `&amp;`). */
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Decode &amp; last so &amp;lt; -> &lt; (not <).
    .replace(/&amp;/g, "&");
}

/** Escape LaTeX special characters so remote metadata compiles as literal text. */
function escapeLatex(s: string): string {
  return s.replace(/[\\&%$#_{}~^]/g, (c) => {
    switch (c) {
      case "\\":
        return "\\textbackslash{}";
      case "~":
        return "\\textasciitilde{}";
      case "^":
        return "\\textasciicircum{}";
      default:
        return `\\${c}`;
    }
  });
}

/** Decode XML entities then escape LaTeX specials for a BibTeX field value. */
function cleanField(s: string): string {
  return escapeLatex(decodeXmlEntities(s));
}

/** Convert a "First Last" name to BibTeX "Last, First". */
function toBibName(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length < 2) return name;
  const family = parts.pop();
  return `${family}, ${parts.join(" ")}`;
}

/** Build a BibTeX entry from an arXiv Atom feed (the first entry). */
export function arxivXmlToBibtex(xml: string): string {
  const entry = /<entry[\s\S]*?<\/entry>/.exec(xml);
  if (!entry) return "";
  const e = entry[0];

  const idRaw = /<id>([^<]+)<\/id>/.exec(e)?.[1] ?? "";
  const id = idRaw.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
  const title = cleanField((/<title>([\s\S]*?)<\/title>/.exec(e)?.[1] ?? "").replace(/\s+/g, " ").trim());
  const year = /<published>(\d{4})/.exec(e)?.[1] ?? "";
  const authors = [...e.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)].map((m) =>
    toBibName(cleanField(m[1].trim())),
  );
  const doi = /<arxiv:doi>([^<]+)<\/arxiv:doi>/.exec(e)?.[1];

  const key = id.replace(/[^\w]/g, "") || "arxiv";
  const fields = [
    `  title = {${title}}`,
    `  author = {${authors.join(" and ")}}`,
    `  year = {${year}}`,
    `  eprint = {${id}}`,
    `  archivePrefix = {arXiv}`,
    doi ? `  doi = {${doi}}` : "",
  ].filter(Boolean);
  return `@misc{${key},\n${fields.join(",\n")}\n}`;
}
