import { v4 as uuidv4 } from "uuid";
import type { NavItem } from "@/types/nav";

export interface SettingParseResult<T> {
  /** 淨化後的值；null 代表整項無效，呼叫端應回退為預設值 */
  value: T | null;
  /** 部分內容被丟棄時的說明，供匯入摘要顯示 */
  warnings: string[];
}

export interface SettingDefinition<T> {
  /** chrome.storage 中的鍵值 */
  key: string;
  /** 顯示名稱，用於匯入摘要 */
  label: string;
  /**
   * 建立預設值。
   * 刻意設計成工廠函式而非固定值，避免多個使用處共用同一個可變物件。
   */
  createDefaultValue: () => T;
  /** 匯入時驗證並淨化來源值 */
  parse: (raw: unknown) => SettingParseResult<T>;
}

/** 整項無效 */
const rejected = (): SettingParseResult<never> => ({ value: null, warnings: [] });

/**
 * 淨化單筆快捷導航。
 * id 缺失時補發新的，讓手動編輯過的設定檔也能匯入。
 */
const parseNavItem = (raw: unknown): NavItem | null => {
  if (typeof raw !== "object" || raw === null) return null;

  const { id, path, label } = raw as Record<string, unknown>;
  if (typeof path !== "string" || !path.trim()) return null;
  if (typeof label !== "string" || !label.trim()) return null;

  const normalizedPath = path.trim();

  return {
    id: typeof id === "string" && id ? id : uuidv4(),
    path: normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`,
    label: label.trim(),
  };
};

export const NAV_ITEMS_SETTING: SettingDefinition<NavItem[]> = {
  key: "navItems",
  label: "快捷導航",
  createDefaultValue: () => [],
  parse: (raw) => {
    if (!Array.isArray(raw)) return rejected();

    const warnings: string[] = [];
    const value = raw.reduce<NavItem[]>((items, entry, index) => {
      const item = parseNavItem(entry);
      if (item) items.push(item);
      else warnings.push(`快捷導航第 ${index + 1} 筆缺少 path 或 label，已略過`);
      return items;
    }, []);

    return { value, warnings };
  },
};

export const FORMAT_TEMPLATE_SETTING: SettingDefinition<string> = {
  key: "format-template",
  label: "格式化模板",
  createDefaultValue: () => "- [#{id}]({url})",
  parse: (raw) => {
    if (typeof raw !== "string" || !raw.trim()) return rejected();
    return { value: raw, warnings: [] };
  },
};

/** 匯出／匯入涵蓋的設定範圍；未列於此的 chrome.storage 內容都不會被讀寫 */
export const SETTING_DEFINITIONS: readonly SettingDefinition<unknown>[] = [
  NAV_ITEMS_SETTING,
  FORMAT_TEMPLATE_SETTING,
];
