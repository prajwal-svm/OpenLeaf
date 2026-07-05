import { describe, it, expect, beforeEach } from "vitest";
import {
  useDictionary,
  isWordIgnored,
  ignoreWordForProject,
  ignoreWordGlobally,
} from "@/lib/dictionary";

describe("dictionary (ignore list)", () => {
  beforeEach(() => {
    useDictionary.setState({ ignored: {}, global: [] });
  });

  it("ignores a word for one project only", () => {
    ignoreWordForProject("proj1", "Spanner");
    expect(isWordIgnored("proj1", "Spanner")).toBe(true);
    expect(isWordIgnored("proj2", "Spanner")).toBe(false);
    expect(isWordIgnored(null, "Spanner")).toBe(false);
  });

  it("ignores a word globally across every project", () => {
    ignoreWordGlobally("Spanner");
    expect(isWordIgnored("proj1", "Spanner")).toBe(true);
    expect(isWordIgnored("proj2", "Spanner")).toBe(true);
  });

  it("trims whitespace and dedupes", () => {
    ignoreWordForProject("p", "  L5 ");
    ignoreWordForProject("p", "L5");
    expect(useDictionary.getState().ignored.p).toEqual(["L5"]);
    expect(isWordIgnored("p", "L5 ")).toBe(true);
  });

  it("un-ignore removes the word (project and global)", () => {
    ignoreWordForProject("p", "Ratel");
    useDictionary.getState().unignore("p", "Ratel");
    expect(isWordIgnored("p", "Ratel")).toBe(false);

    ignoreWordGlobally("tql");
    useDictionary.getState().unignoreGlobal("tql");
    expect(isWordIgnored("p", "tql")).toBe(false);
  });

  it("does nothing for a null project id", () => {
    ignoreWordForProject(null, "x");
    expect(useDictionary.getState().ignored).toEqual({});
  });
});
