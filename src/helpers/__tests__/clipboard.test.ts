import { describe, expect, it, vi } from "vitest";
import { copyText } from "@/helpers/clipboard";

/** 建立一組可控的複製管道，預設兩條路都成功 */
const makeDeps = (overrides: Partial<Parameters<typeof copyText>[1]> = {}) => ({
  writeToClipboard: vi.fn(async () => {}),
  fallbackCopy: vi.fn(() => true),
  ...overrides,
});

describe("copyText", () => {
  it("Clipboard API 成功時回報成功", async () => {
    const deps = makeDeps();

    await expect(copyText("內容", deps)).resolves.toBe(true);
  });

  it("Clipboard API 成功時不動用備援管道", async () => {
    const deps = makeDeps();

    await copyText("內容", deps);

    expect(deps.fallbackCopy).not.toHaveBeenCalled();
  });

  it("把要複製的文字交給 Clipboard API", async () => {
    const deps = makeDeps();

    await copyText("- [#42](https://redmine.twjoin.com/issues/42)", deps);

    expect(deps.writeToClipboard).toHaveBeenCalledWith("- [#42](https://redmine.twjoin.com/issues/42)");
  });

  it("Clipboard API 被拒絕時改走備援管道並回報成功", async () => {
    const deps = makeDeps({
      writeToClipboard: vi.fn(async () => {
        throw new Error("Document is not focused");
      }),
    });

    await expect(copyText("內容", deps)).resolves.toBe(true);
    expect(deps.fallbackCopy).toHaveBeenCalledWith("內容");
  });

  it("兩條路都失敗時回報失敗", async () => {
    const deps = makeDeps({
      writeToClipboard: vi.fn(async () => {
        throw new Error("NotAllowedError");
      }),
      fallbackCopy: vi.fn(() => false),
    });

    await expect(copyText("內容", deps)).resolves.toBe(false);
  });

  it("環境沒有 Clipboard API 時直接走備援管道", async () => {
    const deps = makeDeps({ writeToClipboard: null });

    await expect(copyText("內容", deps)).resolves.toBe(true);
    expect(deps.fallbackCopy).toHaveBeenCalledWith("內容");
  });
});
