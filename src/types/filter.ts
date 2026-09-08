/**
 * Redmine 議題列表的一個篩選條件。
 *
 * 對應網址上的三組參數：f[]=<field>、op[<field>]=<operator>、v[<field>][]=<value>。
 * 一個欄位只能有一個運算子（op 是單值），因此同欄位不同運算子無法並存。
 */
export interface FilterCondition {
  field: string;
  operator: string;
  /** 部分運算子（進行中、已結束、任意、無）不吃值，此時為空陣列 */
  values: string[];
}

/** 使用者存下的篩選快捷 */
export interface FilterShortcut {
  id: string;
  /** 顯示名稱，例如「只看 Bug」 */
  label: string;
  field: string;
  operator: string;
  values: string[];
}

/** 從 Redmine 頁面讀出的單一欄位篩選能力 */
export interface FilterFieldCapability {
  field: string;
  /** 顯示名稱，例如「追蹤標籤」 */
  name: string;
  /** Redmine 的欄位型別，例如 list、list_status、integer */
  type: string;
  /** 可用的運算子，附顯示名稱 */
  operators: { value: string; label: string }[];
  /** 可選值；自由輸入型別（如 integer）為空陣列 */
  values: { value: string; label: string }[];
}

/**
 * 一整組篩選條件的具名視角。
 *
 * 與 FilterShortcut 的差別在套用方式：快捷是疊加／移除單一條件，
 * 組合則整組取代目前的篩選，等同一鍵切換到那個視角。
 */
export interface FilterPreset {
  id: string;
  label: string;
  /** 空陣列代表清空所有篩選的視角 */
  conditions: FilterCondition[];
}
