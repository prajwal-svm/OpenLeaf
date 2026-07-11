import { describe, it, expect } from "vitest";
import { prepareAccessibleSource } from "./accessible-prep";

const DOC = "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}";

describe("prepareAccessibleSource: DocumentMetadata", () => {
  it("adds \\DocumentMetadata as the very first line when missing", () => {
    const { output } = prepareAccessibleSource(DOC);
    expect(output.startsWith("\\DocumentMetadata{")).toBe(true);
    expect(output).toMatch(/tagging\s*=\s*on/);
    expect(output).toMatch(/pdfstandard\s*=\s*ua-2/);
    expect(output).toMatch(/lang\s*=/);
  });

  it("uses the requested language", () => {
    const { output } = prepareAccessibleSource(DOC, { lang: "fr-FR" });
    expect(output).toMatch(/lang\s*=\s*fr-FR/);
  });

  it("merges missing keys into an existing DocumentMetadata rather than duplicating it", () => {
    const src = "\\DocumentMetadata{lang=en-US}\n" + DOC;
    const { output } = prepareAccessibleSource(src);
    expect((output.match(/\\DocumentMetadata/g) ?? []).length).toBe(1);
    expect(output).toMatch(/tagging\s*=\s*on/);
  });

  it("records the change", () => {
    const { changes } = prepareAccessibleSource(DOC);
    expect(changes.some((c) => /DocumentMetadata/i.test(c.summary))).toBe(true);
  });
});

describe("prepareAccessibleSource: unicode-math", () => {
  it("adds unicode-math when a document class is present and it is missing", () => {
    const { output } = prepareAccessibleSource(DOC);
    expect(output).toMatch(/\\usepackage\{unicode-math\}/);
  });
  it("does not add unicode-math twice", () => {
    const src = "\\documentclass{article}\n\\usepackage{unicode-math}\n\\begin{document}x\\end{document}";
    const { output } = prepareAccessibleSource(src);
    expect((output.match(/\\usepackage\{unicode-math\}/g) ?? []).length).toBe(1);
  });
});

describe("prepareAccessibleSource: image alt stubs", () => {
  it("adds an alt placeholder to an image that lacks one", () => {
    const src = DOC.replace("Hello", "\\includegraphics{photo.png}");
    const { output } = prepareAccessibleSource(src);
    expect(output).toMatch(/\\includegraphics\[alt=\{[^}]*\}\]\{photo\.png\}/);
  });
  it("leaves an image that already has alt text alone", () => {
    const src = DOC.replace("Hello", "\\includegraphics[alt={A headshot}]{photo.png}");
    const { output } = prepareAccessibleSource(src);
    expect((output.match(/alt=/g) ?? []).length).toBe(1);
  });
});

describe("prepareAccessibleSource: incompatible packages", () => {
  it("warns about listings but does not remove it", () => {
    const src = "\\documentclass{article}\\usepackage{listings}\n\\begin{document}x\\end{document}";
    const { output, changes } = prepareAccessibleSource(src);
    expect(output).toMatch(/\\usepackage\{listings\}/);
    expect(changes.some((c) => c.kind === "warn" && /listings/i.test(c.summary))).toBe(true);
  });
});

describe("prepareAccessibleSource: idempotence", () => {
  it("is stable when run twice", () => {
    const once = prepareAccessibleSource(DOC).output;
    const twice = prepareAccessibleSource(once).output;
    expect(twice).toBe(once);
    expect((twice.match(/\\DocumentMetadata/g) ?? []).length).toBe(1);
    expect((twice.match(/\\usepackage\{unicode-math\}/g) ?? []).length).toBe(1);
  });
});
