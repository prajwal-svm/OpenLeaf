import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the Tauri command layer and the stores the tools reach into.
const mocks = vi.hoisted(() => ({
  api: {
    readFileContent: vi.fn(),
    writeFileContent: vi.fn(),
    createFile: vi.fn(),
    deleteFile: vi.fn(),
    renameFile: vi.fn(),
    setMainDocCmd: vi.fn(),
    listFiles: vi.fn(),
    searchProject: vi.fn(),
  },
  filesState: {
    projectId: "proj" as string | null,
    applyExternalWrite: vi.fn(),
    applyExternalDelete: vi.fn(),
    applyExternalRename: vi.fn(),
    refreshTree: vi.fn(),
  },
  compileState: { recompile: vi.fn(), log: "", pdfBytes: null as Uint8Array | null },
}));

vi.mock("@/lib/tauri", () => mocks.api);
vi.mock("@/store/files", () => ({
  useFilesStore: { getState: () => mocks.filesState, setState: vi.fn() },
}));
vi.mock("@/store/compile", () => ({ useCompileStore: { getState: () => mocks.compileState } }));
vi.mock("@/lib/pdf-text", () => ({ extractPdfText: vi.fn() }));

import { createOpenLeafTools } from "./ai-tools";

beforeEach(() => {
  for (const f of Object.values(mocks.api)) f.mockReset();
  mocks.filesState.applyExternalWrite.mockReset();
  mocks.filesState.applyExternalDelete.mockReset();
  mocks.filesState.projectId = "proj";
});

describe("ai-tools: destructive edits require approval (U1)", () => {
  it("delete_file declines and does NOT touch disk when approval is refused", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    const tools = createOpenLeafTools({ confirm });
    const res = await tools.delete_file.execute({ path: "sections/old.tex" });
    expect(confirm).toHaveBeenCalledOnce();
    expect(mocks.api.deleteFile).not.toHaveBeenCalled();
    expect(res).toMatchObject({ declined: true, tool: "delete_file" });
  });

  it("delete_file proceeds when approval is granted", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const tools = createOpenLeafTools({ confirm });
    const res = await tools.delete_file.execute({ path: "old.tex" });
    expect(mocks.api.deleteFile).toHaveBeenCalledWith("proj", "old.tex");
    expect(res).toMatchObject({ success: true, path: "old.tex" });
  });

  it("write_file is gated the same way", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    const tools = createOpenLeafTools({ confirm });
    const res = await tools.write_file.execute({ path: "a.tex", content: "x" });
    expect(mocks.api.writeFileContent).not.toHaveBeenCalled();
    expect(res).toMatchObject({ declined: true });
  });

  it("read_file is non-destructive and never asks for approval", async () => {
    mocks.api.readFileContent.mockResolvedValue("hello");
    const confirm = vi.fn().mockResolvedValue(true);
    const tools = createOpenLeafTools({ confirm });
    const res = await tools.read_file.execute({ path: "a.tex" });
    expect(confirm).not.toHaveBeenCalled();
    expect(res).toMatchObject({ content: "hello", path: "a.tex" });
  });
});

describe("ai-tools: project scoping", () => {
  it("every file tool errors when no project is open", async () => {
    mocks.filesState.projectId = null;
    const tools = createOpenLeafTools();
    expect(await tools.write_file.execute({ path: "a.tex", content: "x" })).toMatchObject({
      error: "No project open",
    });
    expect(await tools.read_file.execute({ path: "a.tex" })).toMatchObject({
      error: "No project open",
    });
    expect(mocks.api.writeFileContent).not.toHaveBeenCalled();
  });

  it("search_project scopes the query to the active project id", async () => {
    mocks.api.searchProject.mockResolvedValue([]);
    const tools = createOpenLeafTools();
    await tools.search_project.execute({ query: "theorem" });
    expect(mocks.api.searchProject).toHaveBeenCalledWith("proj", "theorem");
  });
});
