import { SETTING_DEFINITIONS, type SettingDefinition } from "@/constants/settings";

/** 匯出檔的識別字串，用於擋掉不相干的 JSON 檔 */
export const SETTINGS_FILE_APP = "better-redmine";

/** 匯出檔格式版本。目前只有 v1，保留欄位供未來變更格式時辨識 */
export const SETTINGS_SCHEMA_VERSION = 1;

export interface SettingsFile {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  /** 已解析的設定值（非 storage 內部的 JSON 字串），讓檔案可讀可手改 */
  settings: Record<string, unknown>;
}

/** 回退為預設值的原因。顯示文字由 UI 層決定，helper 不涉及呈現 */
export type ResetReason = "missing" | "invalid";

export interface ResetEntry {
  key: string;
  reason: ResetReason;
}

export interface ImportPlan {
  /** 每個已登錄設定的最終值。完全取代語意，必定涵蓋所有登錄的 key */
  values: Record<string, unknown>;
  /** 成功自設定檔取得的 key */
  applied: string[];
  /** 回退為預設值的 key 及原因 */
  resetToDefault: ResetEntry[];
  /** 設定檔中不認得而被忽略的 key */
  ignored: string[];
  /** 部分內容被丟棄的說明 */
  warnings: string[];
}

export type ParseSettingsFileResult = { ok: true; plan: ImportPlan } | { ok: false; error: string };

const decodeStoredValue = (stored: unknown, definition: SettingDefinition<unknown>): unknown => {
  if (typeof stored !== "string") return definition.createDefaultValue();

  try {
    return JSON.parse(stored);
  } catch {
    return definition.createDefaultValue();
  }
};

/**
 * 把 chrome.storage 取回的原始內容解碼為設定值。
 * useStorage 是以 JSON 字串儲存，缺少或損毀時一律使用預設值。
 */
export function fromStorageEntries(entries: Record<string, unknown>): Record<string, unknown> {
  return SETTING_DEFINITIONS.reduce<Record<string, unknown>>((values, definition) => {
    values[definition.key] = decodeStoredValue(entries[definition.key], definition);
    return values;
  }, {});
}

/** 把設定值編碼回 useStorage 讀得懂的 storage 內容 */
export function toStorageEntries(values: Record<string, unknown>): Record<string, string> {
  return Object.entries(values).reduce<Record<string, string>>((entries, [key, value]) => {
    entries[key] = JSON.stringify(value);
    return entries;
  }, {});
}

export function buildSettingsFile(values: Record<string, unknown>, exportedAt: string): SettingsFile {
  const settings = SETTING_DEFINITIONS.reduce<Record<string, unknown>>((result, definition) => {
    result[definition.key] = values[definition.key];
    return result;
  }, {});

  return {
    app: SETTINGS_FILE_APP,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    exportedAt,
    settings,
  };
}

const buildImportPlan = (settings: Record<string, unknown>): ImportPlan => {
  const values: Record<string, unknown> = {};
  const applied: string[] = [];
  const resetToDefault: ResetEntry[] = [];
  const warnings: string[] = [];

  for (const definition of SETTING_DEFINITIONS) {
    if (!(definition.key in settings)) {
      values[definition.key] = definition.createDefaultValue();
      resetToDefault.push({ key: definition.key, reason: "missing" });
      continue;
    }

    const parsed = definition.parse(settings[definition.key]);
    warnings.push(...parsed.warnings);

    if (parsed.value === null) {
      values[definition.key] = definition.createDefaultValue();
      resetToDefault.push({ key: definition.key, reason: "invalid" });
      continue;
    }

    values[definition.key] = parsed.value;
    applied.push(definition.key);
  }

  const knownKeys = new Set(SETTING_DEFINITIONS.map((definition) => definition.key));

  return {
    values,
    applied,
    resetToDefault,
    ignored: Object.keys(settings).filter((key) => !knownKeys.has(key)),
    warnings,
  };
};

export function parseSettingsFile(rawText: string): ParseSettingsFileResult {
  let file: unknown;
  try {
    file = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "檔案不是有效的 JSON" };
  }

  if (typeof file !== "object" || file === null || Array.isArray(file)) {
    return { ok: false, error: "設定檔格式不正確" };
  }

  const { app, schemaVersion, settings } = file as Record<string, unknown>;

  if (app !== SETTINGS_FILE_APP) {
    return { ok: false, error: "這不是 Better Redmine 的設定檔" };
  }

  if (schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `不支援的設定檔版本 ${String(schemaVersion)}，本擴充套件支援的版本為 ${SETTINGS_SCHEMA_VERSION}`,
    };
  }

  if (typeof settings !== "object" || settings === null || Array.isArray(settings)) {
    return { ok: false, error: "設定檔缺少 settings 內容" };
  }

  return { ok: true, plan: buildImportPlan(settings as Record<string, unknown>) };
}
