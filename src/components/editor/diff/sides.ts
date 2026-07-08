import type { DiffSide } from "@/store/diff";

/** Which content each side of the diff shows, per VS Code semantics. */
export type DiffSides = {
  /** Old (left) revision. */
  oldRev: "HEAD" | "INDEX";
  /** New (right) source: a git revision, or the live working-tree file. */
  newRev: "INDEX" | "WORKTREE";
  /** Whether the new side is (eventually) editable — only the working tree is. */
  editable: boolean;
};

export function diffSides(side: DiffSide): DiffSides {
  return side === "staged"
    ? { oldRev: "HEAD", newRev: "INDEX", editable: false }
    : { oldRev: "INDEX", newRev: "WORKTREE", editable: true };
}
