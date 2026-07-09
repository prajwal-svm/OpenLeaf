import { describe, it, expect } from "vitest";
import { buildIndex } from "./build";
import { outlineFromIndex } from "./outline";

describe("outlineFromIndex", () => {
  it("walks includes and emits sections in document order across files", () => {
    const idx = buildIndex({
      "main.tex": "\\section{A}\n\\input{sec}\n\\section{B}",
      "sec.tex": "\\subsection{Sub}",
    });
    const o = outlineFromIndex(idx, "main.tex");
    expect(o.map((i) => i.title)).toEqual(["A", "Sub", "B"]);
    expect(o[1].file).toBe("sec.tex");
    expect(o[1].level).toBe(3);
  });

  it("emits a file entry for an include with no headings", () => {
    const idx = buildIndex({ "main.tex": "\\input{data}", "data.tex": "no headings here" });
    const o = outlineFromIndex(idx, "main.tex");
    expect(o).toHaveLength(1);
    expect(o[0].kind).toBe("file");
    expect(o[0].title).toBe("data.tex");
  });

  it("is cycle-guarded", () => {
    const idx = buildIndex({ "a.tex": "\\section{X}\\input{b}", "b.tex": "\\input{a}" });
    expect(() => outlineFromIndex(idx, "a.tex")).not.toThrow();
  });
});
