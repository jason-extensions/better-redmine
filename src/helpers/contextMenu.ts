/** Redmine context menu 中一個可修改的目標欄位與值 */
export interface IssueUpdateTarget {
  /** 更新參數名，例如 issue[status_id] */
  param: string;
  /** 參數值，例如 11 */
  paramValue: string;
}

/** 解析 href 時使用的替身來源，僅為了讓相對路徑可被 URL 解析 */
const RELATIVE_HREF_BASE = "https://redmine.invalid";

/**
 * 從 context menu 連結的 href 取出要修改的欄位與值。
 *
 * Redmine 依勾選筆數產生兩種格式：
 * - 勾選多筆：`/issues/bulk_update?…&ids[]=A&ids[]=B&issue[status_id]=7`
 * - 勾選單筆：`/issues/{id}?…&ids[]=A&issue[status_id]=7`（data-method="patch"）
 *
 * 因此不能以路徑判別，改以「同時具備 ids[] 與 issue[...]」為準。兩者缺一不可：
 * - 「大量編輯」有 ids[] 但無 issue[...]
 * - 「新增子任務」有 issue[parent_issue_id] 與 issue[tracker_id] 但無 ids[]，
 *   若僅檢查 issue[...]，一個追蹤標籤的快捷鍵會誤觸此連結而建立子任務。
 *
 * ids[] 與 back_url 會隨當下選取變動，只有 issue[...] 足以識別
 * 「要把哪個欄位改成哪個值」，故僅取這一組作為快捷鍵的比對依據。
 *
 * @param href context menu 連結的 href
 * @returns 欄位與值；非欄位修改用途的連結回傳 null
 */
export function parseIssueUpdateHref(href: string): IssueUpdateTarget | null {
  if (!href) return null;

  let url: URL;
  try {
    url = new URL(href, RELATIVE_HREF_BASE);
  } catch {
    return null;
  }

  if (!url.searchParams.has("ids[]")) return null;

  for (const [param, paramValue] of url.searchParams) {
    if (param.startsWith("issue[") && param.endsWith("]")) return { param, paramValue };
  }

  return null;
}
