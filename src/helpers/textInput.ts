export interface InsertResult {
  value: string;
  /** 插入後游標應停留的位置 */
  cursor: number;
}

/**
 * 在指定範圍插入文字，範圍內原有的文字會被取代。
 *
 * start 與 end 直接取自 input 的 selectionStart／selectionEnd；兩者相等時
 * 就是單純的游標插入。不假設 start 一定小於 end，避免呼叫端傳入反向選取
 * 時算出負長度。
 */
export function insertAt(value: string, start: number, end: number, text: string): InsertResult {
  const from = Math.min(start, end);
  const to = Math.max(start, end);

  return {
    value: `${value.slice(0, from)}${text}${value.slice(to)}`,
    cursor: from + text.length,
  };
}
