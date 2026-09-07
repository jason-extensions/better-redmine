import { describe, expect, it } from "vitest";
import { applyTemplate } from "@/helpers/formatTemplate";

describe("applyTemplate", () => {
  it("以對應的值取代模板中的關鍵字", () => {
    const result = applyTemplate("- [#{id}]({url})", { id: "56736", url: "https://redmine.twjoin.com/issues/56736" });

    expect(result).toBe("- [#56736](https://redmine.twjoin.com/issues/56736)");
  });

  it("同一個關鍵字重複出現時全部取代", () => {
    const result = applyTemplate("{id} / {id} / {id}", { id: "42" });

    expect(result).toBe("42 / 42 / 42");
  });

  it("值含有 $& 時視為字面值，不套用取代語法", () => {
    const result = applyTemplate("{subject}", { subject: "價格 $& 數量" });

    expect(result).toBe("價格 $& 數量");
  });

  it("值含有 $1 時視為字面值", () => {
    const result = applyTemplate("{subject}", { subject: "折抵 $1 元" });

    expect(result).toBe("折抵 $1 元");
  });

  it("模板中沒有對應值的關鍵字保持原樣", () => {
    const result = applyTemplate("{id} {unknown}", { id: "42" });

    expect(result).toBe("42 {unknown}");
  });

  it("值為空字串時取代成空白", () => {
    const result = applyTemplate("[{subject}]", { subject: "" });

    expect(result).toBe("[]");
  });

  it("議題內容含有其他關鍵字語法時不會被二次取代", () => {
    const result = applyTemplate("{subject} {id}", { subject: "修正 {id} 顯示錯誤", id: "42" });

    expect(result).toBe("修正 {id} 顯示錯誤 42");
  });
});
