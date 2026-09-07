/**
 * 收藏起來的格式化模板。
 *
 * 收藏與「格式化模板」輸入框是各自獨立的：套用收藏會覆寫輸入框，
 * 但之後修改輸入框不會回寫收藏，臨時微調才不會弄髒存好的內容。
 */
export interface FormatTemplate {
  id: string;
  /** 顯示名稱，例如「Markdown 清單」 */
  name: string;
  /** 模板內容，例如 - [#{id}]({url}) */
  template: string;
}
