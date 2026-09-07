/** 模板中的關鍵字語法，例如 {id}、{subject} */
const KEYWORD_PATTERN = /\{(\w+)\}/g;

/**
 * 以 values 取代模板中的 {關鍵字}。
 *
 * 單次掃描取代，而非逐個關鍵字做字串取代：後者會讓先取代進去的內容
 * 再被後面的關鍵字掃到，例如主旨是「修正 {id} 顯示錯誤」時，{id} 會連
 * 主旨裡的字面文字一起換掉。
 *
 * 取代值以函式形式提供，因此議題內容中的 $&、$1 等字元會被當成字面值，
 * 不會觸發 String.replace 的取代語法。
 *
 * @param template 模板字串
 * @param values 關鍵字對應的值；沒有對應值的關鍵字會原樣保留
 */
export function applyTemplate(template: string, values: Record<string, string>): string {
  return template.replace(KEYWORD_PATTERN, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
}
