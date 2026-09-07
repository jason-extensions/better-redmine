/**
 * 批量修改的快捷鍵。
 *
 * 刻意不儲存 context menu 的 href——其中的 ids[] 與 back_url 會隨當下選取
 * 而變動。param/paramValue 才是穩定的識別依據，且不受 Redmine 顯示名稱
 * 更動影響；兩個 label 僅供介面顯示。
 */
export interface BatchShortcut {
  id: string;
  /** 欄位顯示名稱，例如「狀態」 */
  fieldLabel: string;
  /** 值顯示名稱，例如「開發處理完畢」 */
  valueLabel: string;
  /** bulk_update 的參數名，例如 issue[status_id] */
  param: string;
  /** 參數值，例如 11 */
  paramValue: string;
}

/** context menu 中一個可批次修改的欄位及其選項 */
export interface BatchField {
  label: string;
  options: BatchFieldOption[];
}

export interface BatchFieldOption {
  label: string;
  param: string;
  paramValue: string;
}
