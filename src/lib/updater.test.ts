import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the Tauri surface the updater primitives touch. isTauri is toggled per
// test via the exported ref so we can exercise the browser (no-updater) path.
const state = vi.hoisted(() => ({ tauri: true }));
const { check } = vi.hoisted(() => ({ check: vi.fn() }));
const { relaunch } = vi.hoisted(() => ({ relaunch: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => state.tauri }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ ask: vi.fn(), message: vi.fn() }));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

import { findUpdate, installUpdate } from "./updater";

beforeEach(() => {
  state.tauri = true;
  check.mockReset();
  relaunch.mockReset();
});

describe("findUpdate", () => {
  it("returns null in the browser dev server without calling the plugin", async () => {
    state.tauri = false;
    expect(await findUpdate()).toBeNull();
    expect(check).not.toHaveBeenCalled();
  });

  it("returns null when the plugin reports no update (up to date)", async () => {
    check.mockResolvedValue(null);
    expect(await findUpdate()).toBeNull();
  });

  it("returns the Update object when one is available", async () => {
    const update = { version: "0.2.0", currentVersion: "0.1.1", body: "notes" };
    check.mockResolvedValue(update);
    expect(await findUpdate()).toBe(update);
  });
});

describe("installUpdate", () => {
  it("reports 0→100 progress from download events, then relaunches", async () => {
    const percents: number[] = [];
    const update = {
      downloadAndInstall: vi.fn(async (cb: (e: unknown) => void) => {
        cb({ event: "Started", data: { contentLength: 100 } });
        cb({ event: "Progress", data: { chunkLength: 40 } });
        cb({ event: "Progress", data: { chunkLength: 60 } });
        cb({ event: "Finished", data: {} });
      }),
    };
    // biome-ignore lint/suspicious/noExplicitAny: test double for the Update type
    await installUpdate(update as any, (p) => percents.push(p));
    expect(percents).toEqual([0, 40, 100, 100]);
    expect(relaunch).toHaveBeenCalledOnce();
  });

  it("stays at 0% until finish when no content length is advertised", async () => {
    const percents: number[] = [];
    const update = {
      downloadAndInstall: vi.fn(async (cb: (e: unknown) => void) => {
        cb({ event: "Started", data: {} });
        cb({ event: "Progress", data: { chunkLength: 50 } });
        cb({ event: "Finished", data: {} });
      }),
    };
    // biome-ignore lint/suspicious/noExplicitAny: test double for the Update type
    await installUpdate(update as any, (p) => percents.push(p));
    expect(percents).toEqual([0, 100]);
    expect(relaunch).toHaveBeenCalledOnce();
  });

  it("propagates a download failure and does not relaunch", async () => {
    const update = {
      downloadAndInstall: vi.fn(async () => {
        throw new Error("network down");
      }),
    };
    // biome-ignore lint/suspicious/noExplicitAny: test double for the Update type
    await expect(installUpdate(update as any)).rejects.toThrow("network down");
    expect(relaunch).not.toHaveBeenCalled();
  });
});
