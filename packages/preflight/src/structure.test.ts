import { describe, it, expect } from "vitest";
import { verifyStructure } from "./structure";
import type { StructNode, StructDoc } from "./structure";

const node = (role: string, children: StructNode[] = [], extra: Partial<StructNode> = {}): StructNode => ({
  role,
  children,
  ...extra,
});
const doc = (root: StructNode | null, tagged = root !== null): StructDoc => ({ root, tagged });

describe("verifyStructure: untagged output", () => {
  it("returns one honest verdict when the PDF has no structure tree", () => {
    const f = verifyStructure(doc(null, false));
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe("pdf-untagged-output");
    expect(f[0].severity).toBe("info");
  });

  it("does not emit a wall of structural failures when untagged", () => {
    const f = verifyStructure(doc(null, false));
    expect(f.every((x) => x.id === "pdf-untagged-output")).toBe(true);
  });
});

describe("verifyStructure: figures", () => {
  it("flags a Figure with no alt text", () => {
    const root = node("Document", [node("Figure")]);
    expect(verifyStructure(doc(root)).some((f) => f.id === "output-figure-alt")).toBe(true);
  });
  it("accepts a Figure with alt text", () => {
    const root = node("Document", [node("Figure", [], { alt: "A chart of results" })]);
    expect(verifyStructure(doc(root)).some((f) => f.id === "output-figure-alt")).toBe(false);
  });
  it("flags a Formula with no alt text", () => {
    const root = node("Document", [node("Formula")]);
    expect(verifyStructure(doc(root)).some((f) => f.id === "output-figure-alt")).toBe(true);
  });
});

describe("verifyStructure: tables", () => {
  it("flags a Table with no header cell", () => {
    const root = node("Document", [node("Table", [node("TR", [node("TD"), node("TD")])])]);
    expect(verifyStructure(doc(root)).some((f) => f.id === "output-table-headers")).toBe(true);
  });
  it("accepts a Table with a header row", () => {
    const root = node("Document", [node("Table", [node("TR", [node("TH"), node("TH")])])]);
    expect(verifyStructure(doc(root)).some((f) => f.id === "output-table-headers")).toBe(false);
  });
});

describe("verifyStructure: headings", () => {
  it("flags a heading level skip in the tag tree", () => {
    const root = node("Document", [node("H1"), node("H3")]);
    expect(verifyStructure(doc(root)).some((f) => f.id === "output-heading-skip")).toBe(true);
  });
  it("accepts well-nested headings", () => {
    const root = node("Document", [node("H1"), node("H2"), node("H3")]);
    expect(verifyStructure(doc(root)).some((f) => f.id === "output-heading-skip")).toBe(false);
  });
});

describe("verifyStructure: clean tagged doc", () => {
  it("returns no findings for a well-tagged document", () => {
    const root = node("Document", [
      node("H1"),
      node("P"),
      node("Figure", [], { alt: "A headshot" }),
      node("Table", [node("TR", [node("TH")]), node("TR", [node("TD")])]),
    ]);
    expect(verifyStructure(doc(root))).toHaveLength(0);
  });
});
