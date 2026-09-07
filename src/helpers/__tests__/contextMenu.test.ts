import { describe, expect, it } from "vitest";
import { parseBulkUpdateHref } from "@/helpers/contextMenu";

/** 以下 href 取自 redmine.twjoin.com 實際的 #context-menu（勾選 2 筆議題時） */
const BULK_UPDATE_PREFIX = "/issues/bulk_update?back_url=%2Fprojects%2Fp_itrade%2Fissues&ids%5B%5D=56709&ids%5B%5D=56711";

describe("parseBulkUpdateHref", () => {
  it("解析狀態的 href", () => {
    expect(parseBulkUpdateHref(`${BULK_UPDATE_PREFIX}&issue%5Bstatus_id%5D=1`)).toEqual({
      param: "issue[status_id]",
      paramValue: "1",
    });
  });

  it("解析被分派者的 href", () => {
    expect(parseBulkUpdateHref(`${BULK_UPDATE_PREFIX}&issue%5Bassigned_to_id%5D=154`)).toEqual({
      param: "issue[assigned_to_id]",
      paramValue: "154",
    });
  });

  it("解析完成百分比的 href，值為 0 時仍視為有效", () => {
    expect(parseBulkUpdateHref(`${BULK_UPDATE_PREFIX}&issue%5Bdone_ratio%5D=0`)).toEqual({
      param: "issue[done_ratio]",
      paramValue: "0",
    });
  });

  it("忽略監看員的 href（不是可批次修改的欄位）", () => {
    const href = "/watchers/new?object_id%5B%5D=56709&object_id%5B%5D=56711&object_type=issue";

    expect(parseBulkUpdateHref(href)).toBeNull();
  });

  it("忽略大量編輯的 href", () => {
    expect(parseBulkUpdateHref("/issues/bulk_edit?ids%5B%5D=56709&ids%5B%5D=56711")).toBeNull();
  });

  it("忽略篩選器的 href", () => {
    const href = "/projects/p_itrade/issues?c%5B%5D=id&issue_id=56709%2C56711&set_filter=1&status_id=%2A";

    expect(parseBulkUpdateHref(href)).toBeNull();
  });

  it("忽略僅作為子選單開關的 #", () => {
    expect(parseBulkUpdateHref("#")).toBeNull();
  });

  it("忽略沒有 issue 參數的 bulk_update", () => {
    expect(parseBulkUpdateHref(`${BULK_UPDATE_PREFIX}`)).toBeNull();
  });

  it("忽略路徑不是 bulk_update 但帶有 issue 參數的連結", () => {
    expect(parseBulkUpdateHref("/issues/56709/edit?issue%5Bstatus_id%5D=1")).toBeNull();
  });

  it("支援安裝在子路徑下的 Redmine", () => {
    expect(parseBulkUpdateHref(`/redmine/issues/bulk_update?ids%5B%5D=1&issue%5Bstatus_id%5D=7`)).toEqual({
      param: "issue[status_id]",
      paramValue: "7",
    });
  });
});
