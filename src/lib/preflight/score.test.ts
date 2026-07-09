import { describe, it, expect } from "vitest";
import { computeScores, POINTS } from "./score";
import type { Finding } from "./types";

const f = (lens: Finding["lens"], severity: Finding["severity"]): Finding => ({
  id: "x",
  lens,
  severity,
  title: "t",
  detail: "d",
});

describe("computeScores", () => {
  it("is a perfect 100 across lenses with no findings", () => {
    expect(computeScores([])).toEqual({ ats: 100, a11y: 100, refs: 100 });
  });

  it("a refs-lens finding only affects the refs score", () => {
    const { ats, a11y, refs } = computeScores([f("refs", "error")]);
    expect(ats).toBe(100);
    expect(a11y).toBe(100);
    expect(refs).toBe(100 - POINTS.error);
  });

  it("subtracts an error from both scores when the finding is 'both'", () => {
    const { ats, a11y } = computeScores([f("both", "error")]);
    expect(ats).toBe(100 - POINTS.error);
    expect(a11y).toBe(100 - POINTS.error);
  });

  it("an ats-only finding leaves the a11y score untouched", () => {
    const { ats, a11y } = computeScores([f("ats", "warning")]);
    expect(ats).toBe(100 - POINTS.warning);
    expect(a11y).toBe(100);
  });

  it("an a11y-only finding leaves the ats score untouched", () => {
    const { ats, a11y } = computeScores([f("a11y", "error")]);
    expect(ats).toBe(100);
    expect(a11y).toBe(100 - POINTS.error);
  });

  it("weights severities error > warning > info", () => {
    expect(POINTS.error).toBeGreaterThan(POINTS.warning);
    expect(POINTS.warning).toBeGreaterThan(POINTS.info);
  });

  it("never drops below zero", () => {
    const many = Array.from({ length: 50 }, () => f("both", "error"));
    const { ats, a11y } = computeScores(many);
    expect(ats).toBe(0);
    expect(a11y).toBe(0);
  });

  it("rounds to an integer", () => {
    const { ats } = computeScores([f("ats", "info")]);
    expect(Number.isInteger(ats)).toBe(true);
  });
});
