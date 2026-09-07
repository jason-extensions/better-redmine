export interface ParsedIssueUrl {
  id: string;
  /** 去掉查詢字串與錨點後的議題網址 */
  url: string;
}

/** 只接受單一議題頁，例如 /issues/56736；/issues/56736/edit 這類子頁面不算 */
const ISSUE_PATH_PATTERN = /^\/issues\/(\d+)\/?$/;

/**
 * 從議題頁網址取出編號並正規化網址。
 *
 * 直接沿用 location.href 會把 #note-12、?tab=... 一起複製出去，因此重新
 * 以 origin 組出乾淨的網址。origin 取自來源網址而非寫死的站台位址，
 * 這樣其他站台的 Redmine 也能運作。
 *
 * @returns 不是單一議題頁時回傳 null
 */
export function parseIssueUrl(href: string): ParsedIssueUrl | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const id = url.pathname.match(ISSUE_PATH_PATTERN)?.[1];
  if (!id) return null;

  return { id, url: `${url.origin}/issues/${id}` };
}
