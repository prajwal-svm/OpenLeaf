import { describe, it, expect } from "vitest";
import { diffSides } from "./sides";

describe("diffSides", () => {
  it("staged diff compares HEAD (old) against INDEX (new), read-only", () => {
    expect(diffSides("staged")).toEqual({ oldRev: "HEAD", newRev: "INDEX", editable: false });
  });

  it("working diff compares INDEX (old) against the WORKTREE (new), editable", () => {
    expect(diffSides("working")).toEqual({ oldRev: "INDEX", newRev: "WORKTREE", editable: true });
  });
});
