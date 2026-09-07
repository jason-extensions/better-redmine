/** 議題頁上足以組出連結的最小資料 */
export interface IssueSummary {
  id: string;
  subject: string;
  /** 去掉查詢字串與錨點後的議題網址 */
  url: string;
}
