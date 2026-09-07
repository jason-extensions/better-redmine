import { describe, expect, it } from "vitest";
import { insertAt } from "@/helpers/textInput";

describe("insertAt", () => {
  it("在游標位置插入文字", () => {
    const result = insertAt("- []()", 3, 3, "{id}");

    expect(result.value).toBe("- [{id}]()");
  });

  it("插入後游標停在插入內容之後", () => {
    const result = insertAt("- []()", 3, 3, "{id}");

    expect(result.cursor).toBe(7);
  });

  it("游標在開頭時插入到最前面", () => {
    const result = insertAt("abc", 0, 0, "{id}");

    expect(result.value).toBe("{id}abc");
    expect(result.cursor).toBe(4);
  });

  it("游標在結尾時附加到最後面", () => {
    const result = insertAt("abc", 3, 3, "{id}");

    expect(result.value).toBe("abc{id}");
    expect(result.cursor).toBe(7);
  });

  it("有選取範圍時以插入內容取代選取的文字", () => {
    const result = insertAt("- [舊的]()", 3, 5, "{id}");

    expect(result.value).toBe("- [{id}]()");
    expect(result.cursor).toBe(7);
  });

  it("原本是空字串時直接成為插入內容", () => {
    const result = insertAt("", 0, 0, "{id}");

    expect(result.value).toBe("{id}");
    expect(result.cursor).toBe(4);
  });

  it("選取範圍顛倒時仍以較小的位置為插入起點", () => {
    const result = insertAt("- [舊的]()", 5, 3, "{id}");

    expect(result.value).toBe("- [{id}]()");
    expect(result.cursor).toBe(7);
  });
});
