import { describe, expect, it } from "vitest";
import { parseIssueUrl } from "@/helpers/issuePage";

describe("parseIssueUrl", () => {
  it("取出議題編號與正規化後的網址", () => {
    expect(parseIssueUrl("https://redmine.twjoin.com/issues/56736")).toEqual({
      id: "56736",
      url: "https://redmine.twjoin.com/issues/56736",
    });
  });

  it("捨棄留言錨點，避免複製到 #note-12 這種片段", () => {
    expect(parseIssueUrl("https://redmine.twjoin.com/issues/56736#note-12")?.url).toBe("https://redmine.twjoin.com/issues/56736");
  });

  it("捨棄查詢字串", () => {
    expect(parseIssueUrl("https://redmine.twjoin.com/issues/56736?tab=time_entries")?.url).toBe(
      "https://redmine.twjoin.com/issues/56736"
    );
  });

  it("容許結尾多餘的斜線", () => {
    expect(parseIssueUrl("https://redmine.twjoin.com/issues/56736/")?.id).toBe("56736");
  });

  it("保留來源網址的主機，不寫死站台位址", () => {
    expect(parseIssueUrl("http://redmine.example.com:3000/issues/42")?.url).toBe("http://redmine.example.com:3000/issues/42");
  });

  it("議題列表頁不是單一議題，回傳 null", () => {
    expect(parseIssueUrl("https://redmine.twjoin.com/projects/p_itrade/issues")).toBeNull();
  });

  it("議題的子頁面不算在議題頁上", () => {
    expect(parseIssueUrl("https://redmine.twjoin.com/issues/56736/time_entries/new")).toBeNull();
  });

  it("編號不是數字時回傳 null", () => {
    expect(parseIssueUrl("https://redmine.twjoin.com/issues/new")).toBeNull();
  });

  it("無法解析的網址回傳 null", () => {
    expect(parseIssueUrl("這不是網址")).toBeNull();
  });
});
