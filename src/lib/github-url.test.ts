import { describe, it, expect } from "vitest";
import { toGithubWebUrl } from "./github-url";

describe("toGithubWebUrl", () => {
  it("normalizes scp-style git@ remotes", () => {
    expect(toGithubWebUrl("git@github.com:owner/repo.git")).toBe("https://github.com/owner/repo");
  });

  it("normalizes ssh:// remotes", () => {
    expect(toGithubWebUrl("ssh://git@github.com/owner/repo.git")).toBe(
      "https://github.com/owner/repo",
    );
  });

  it("drops the port from ssh:// remotes with an explicit port", () => {
    expect(toGithubWebUrl("ssh://git@github.com:22/owner/repo.git")).toBe(
      "https://github.com/owner/repo",
    );
  });

  it("handles ssh:// remotes without a user", () => {
    expect(toGithubWebUrl("ssh://github.com/owner/repo.git")).toBe(
      "https://github.com/owner/repo",
    );
  });

  it("strips .git and embedded credentials from https remotes", () => {
    expect(toGithubWebUrl("https://x-access-token:tok@github.com/owner/repo.git")).toBe(
      "https://github.com/owner/repo",
    );
    expect(toGithubWebUrl("https://github.com/owner/repo")).toBe("https://github.com/owner/repo");
  });

  it("returns null for empty / unrecognized remotes", () => {
    expect(toGithubWebUrl(null)).toBeNull();
    expect(toGithubWebUrl("")).toBeNull();
    expect(toGithubWebUrl("not a url")).toBeNull();
  });
});
