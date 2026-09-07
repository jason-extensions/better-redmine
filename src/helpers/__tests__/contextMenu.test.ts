import { describe, expect, it } from "vitest";
import { parseIssueUpdateHref } from "@/helpers/contextMenu";

/**
 * 以下 href 全部取自 redmine.twjoin.com 實際的 #context-menu。
 * back_url 過長且與判別無關，此處以簡短值替代。
 */
const BACK_URL = "back_url=%2Fprojects%2Fp_itrade%2Fissues";

/** 勾選 2 筆時，欄位連結指向 bulk_update */
const multiSelect = (param: string) => `/issues/bulk_update?${BACK_URL}&ids%5B%5D=56709&ids%5B%5D=56711&${param}`;

/** 勾選 1 筆時，欄位連結改為指向該議題本身（data-method="patch"） */
const singleSelect = (param: string) => `/issues/56711?${BACK_URL}&ids%5B%5D=56711&${param}`;

describe("parseIssueUpdateHref - 勾選多筆", () => {
  it("解析狀態", () => {
    expect(parseIssueUpdateHref(multiSelect("issue%5Bstatus_id%5D=1"))).toEqual({
      param: "issue[status_id]",
      paramValue: "1",
    });
  });

  it("解析被分派者", () => {
    expect(parseIssueUpdateHref(multiSelect("issue%5Bassigned_to_id%5D=154"))).toEqual({
      param: "issue[assigned_to_id]",
      paramValue: "154",
    });
  });

  it("解析完成百分比，值為 0 時仍視為有效", () => {
    expect(parseIssueUpdateHref(multiSelect("issue%5Bdone_ratio%5D=0"))).toEqual({
      param: "issue[done_ratio]",
      paramValue: "0",
    });
  });
});

describe("parseIssueUpdateHref - 勾選單筆", () => {
  it("解析狀態，路徑為議題本身而非 bulk_update", () => {
    expect(parseIssueUpdateHref(singleSelect("issue%5Bstatus_id%5D=1"))).toEqual({
      param: "issue[status_id]",
      paramValue: "1",
    });
  });

  it("解析追蹤標籤", () => {
    expect(parseIssueUpdateHref(singleSelect("issue%5Btracker_id%5D=8"))).toEqual({
      param: "issue[tracker_id]",
      paramValue: "8",
    });
  });

  it("解析完成百分比", () => {
    expect(parseIssueUpdateHref(singleSelect("issue%5Bdone_ratio%5D=10"))).toEqual({
      param: "issue[done_ratio]",
      paramValue: "10",
    });
  });
});

describe("parseIssueUpdateHref - 必須排除的選單項目", () => {
  it("排除新增子任務：帶有 issue[...] 參數但沒有 ids[]，誤判會導致建立子任務而非修改欄位", () => {
    const href = "/projects/p_itrade/issues/new?issue%5Bparent_issue_id%5D=56711&issue%5Btracker_id%5D=3";

    expect(parseIssueUpdateHref(href)).toBeNull();
  });

  it("排除大量編輯：有 ids[] 但沒有 issue[...]", () => {
    expect(parseIssueUpdateHref("/issues/bulk_edit?ids%5B%5D=56709&ids%5B%5D=56711")).toBeNull();
  });

  it("排除編輯", () => {
    expect(parseIssueUpdateHref("/issues/56711/edit")).toBeNull();
  });

  it("排除記錄時間", () => {
    expect(parseIssueUpdateHref("/issues/56711/time_entries/new")).toBeNull();
  });

  it("排除監看員", () => {
    expect(parseIssueUpdateHref("/watchers/new?object_id%5B%5D=56711&object_type=issue")).toBeNull();
  });

  it("排除取消監看", () => {
    expect(parseIssueUpdateHref("/watchers/watch?object_id=56711&object_type=issue")).toBeNull();
  });

  it("排除複製", () => {
    expect(parseIssueUpdateHref("/projects/p_itrade/issues/56711/copy")).toBeNull();
  });

  it("排除篩選器", () => {
    const href = "/projects/p_itrade/issues?c%5B%5D=id&issue_id=56709%2C56711&set_filter=1&status_id=%2A";

    expect(parseIssueUpdateHref(href)).toBeNull();
  });

  it("排除議題目前已是該值的項目（Redmine 以 # 呈現）", () => {
    expect(parseIssueUpdateHref("#")).toBeNull();
  });
});

describe("parseIssueUpdateHref - 其他", () => {
  it("支援安裝在子路徑下的 Redmine", () => {
    expect(parseIssueUpdateHref("/redmine/issues/bulk_update?ids%5B%5D=1&issue%5Bstatus_id%5D=7")).toEqual({
      param: "issue[status_id]",
      paramValue: "7",
    });
  });

  it("空字串回傳 null", () => {
    expect(parseIssueUpdateHref("")).toBeNull();
  });
});
