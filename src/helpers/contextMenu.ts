/** Redmine context menu 中一個可批次修改的目標欄位與值 */
export interface BulkUpdateTarget {
  /** bulk_update 的參數名，例如 issue[status_id] */
  param: string;
  /** 參數值，例如 11 */
  paramValue: string;
}

/** 解析 href 時使用的替身來源，僅為了讓相對路徑可被 URL 解析 */
const RELATIVE_HREF_BASE = "https://redmine.invalid";

/**
 * 從 context menu 連結的 href 取出可批次修改的欄位與值。
 *
 * Redmine 在多選時產生的 href 形如
 * `/issues/bulk_update?back_url=…&ids[]=1&ids[]=2&issue[status_id]=7`，
 * 其中 ids 與 back_url 會隨當下選取而變，只有 issue[...] 這組參數足以識別
 * 「要把哪個欄位改成哪個值」，因此僅取這一組作為快捷鍵的比對依據。
 *
 * @param href context menu 連結的 href
 * @returns 可批次修改的欄位與值；非批次修改用途的連結回傳 null
 */
export function parseBulkUpdateHref(href: string): BulkUpdateTarget | null {
  if (!href) return null;

  let url: URL;
  try {
    url = new URL(href, RELATIVE_HREF_BASE);
  } catch {
    return null;
  }

  if (!url.pathname.endsWith("/bulk_update")) return null;

  for (const [param, paramValue] of url.searchParams) {
    if (param.startsWith("issue[") && param.endsWith("]")) return { param, paramValue };
  }

  return null;
}
