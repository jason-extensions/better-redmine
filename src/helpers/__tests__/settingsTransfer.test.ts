import { describe, expect, it } from "vitest";
import {
  FORMAT_TEMPLATE_SETTING,
  NAV_ITEMS_SETTING,
  SETTING_DEFINITIONS,
  SITE_URL_SETTING,
} from "@/constants/settings";
import {
  SETTINGS_FILE_APP,
  SETTINGS_SCHEMA_VERSION,
  buildSettingsFile,
  fromStorageEntries,
  parseSettingsFile,
  toStorageEntries,
} from "@/helpers/settingsTransfer";
import type { NavItem } from "@/types/nav";

/** 組出一份合法的匯出檔文字，settings 內容可覆寫 */
const makeFileText = (settings: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    app: SETTINGS_FILE_APP,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    exportedAt: "2026-09-07T00:00:00.000Z",
    settings,
    ...overrides,
  });

const navItem = (overrides: Partial<NavItem> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  path: "/issues",
  label: "議題",
  ...overrides,
});

describe("parseSettingsFile - 檔案層級驗證", () => {
  it("拒絕無法解析的 JSON", () => {
    const result = parseSettingsFile("{ 這不是 JSON");

    expect(result.ok).toBe(false);
  });

  it("拒絕不是本擴充套件匯出的檔案", () => {
    const foreignFile = JSON.stringify({ app: "some-other-extension", schemaVersion: 1, settings: {} });

    const result = parseSettingsFile(foreignFile);

    expect(result.ok).toBe(false);
  });

  it("拒絕不認得的 schemaVersion", () => {
    const result = parseSettingsFile(makeFileText({}, { schemaVersion: SETTINGS_SCHEMA_VERSION + 1 }));

    expect(result.ok).toBe(false);
  });

  it("拒絕 settings 不是物件的檔案", () => {
    const result = parseSettingsFile(makeFileText([] as unknown as Record<string, unknown>));

    expect(result.ok).toBe(false);
  });
});

describe("parseSettingsFile - 完全取代語意", () => {
  it("即使檔案只帶一項設定，仍為每個已登錄的設定產生值", () => {
    const result = parseSettingsFile(makeFileText({ [SITE_URL_SETTING.key]: "https://redmine.example.com" }));

    if (!result.ok) throw new Error(result.error);
    expect(Object.keys(result.plan.values).sort()).toEqual(SETTING_DEFINITIONS.map((d) => d.key).sort());
  });

  it("檔案缺少的設定回退為預設值並列入 resetToDefault", () => {
    const result = parseSettingsFile(makeFileText({ [SITE_URL_SETTING.key]: "https://redmine.example.com" }));

    if (!result.ok) throw new Error(result.error);
    expect(result.plan.values[NAV_ITEMS_SETTING.key]).toEqual(NAV_ITEMS_SETTING.createDefaultValue());
    expect(result.plan.resetToDefault.map((entry) => entry.key)).toContain(NAV_ITEMS_SETTING.key);
    expect(result.plan.applied).toEqual([SITE_URL_SETTING.key]);
  });

  it("區分「檔案沒有這一項」與「內容無效」兩種回退原因", () => {
    const result = parseSettingsFile(
      makeFileText({ [SITE_URL_SETTING.key]: "javascript:alert(1)" })
    );

    if (!result.ok) throw new Error(result.error);
    const reasons = Object.fromEntries(result.plan.resetToDefault.map((entry) => [entry.key, entry.reason]));
    expect(reasons[SITE_URL_SETTING.key]).toBe("invalid");
    expect(reasons[NAV_ITEMS_SETTING.key]).toBe("missing");
  });

  it("忽略未登錄的 key，且不寫進 values", () => {
    const result = parseSettingsFile(makeFileText({ "unknown-setting": "x" }));

    if (!result.ok) throw new Error(result.error);
    expect(result.plan.ignored).toEqual(["unknown-setting"]);
    expect(result.plan.values).not.toHaveProperty("unknown-setting");
  });
});

describe("parseSettingsFile - navItems 淨化", () => {
  it("丟棄缺少 path 的項目但保留其餘項目，並提出警告", () => {
    const result = parseSettingsFile(
      makeFileText({ [NAV_ITEMS_SETTING.key]: [navItem(), { id: "x", label: "壞掉的" }] })
    );

    if (!result.ok) throw new Error(result.error);
    expect(result.plan.values[NAV_ITEMS_SETTING.key]).toEqual([navItem()]);
    expect(result.plan.warnings.length).toBe(1);
  });

  it("為缺少 id 的項目補上 id", () => {
    const result = parseSettingsFile(makeFileText({ [NAV_ITEMS_SETTING.key]: [{ path: "/issues", label: "議題" }] }));

    if (!result.ok) throw new Error(result.error);
    const [item] = result.plan.values[NAV_ITEMS_SETTING.key] as NavItem[];
    expect(item.id).toBeTruthy();
    expect(item).toMatchObject({ path: "/issues", label: "議題" });
  });

  it("補上缺少的開頭斜線", () => {
    const result = parseSettingsFile(makeFileText({ [NAV_ITEMS_SETTING.key]: [navItem({ path: "issues" })] }));

    if (!result.ok) throw new Error(result.error);
    expect((result.plan.values[NAV_ITEMS_SETTING.key] as NavItem[])[0].path).toBe("/issues");
  });

  it("navItems 不是陣列時整項回退預設值", () => {
    const result = parseSettingsFile(makeFileText({ [NAV_ITEMS_SETTING.key]: "not-an-array" }));

    if (!result.ok) throw new Error(result.error);
    expect(result.plan.values[NAV_ITEMS_SETTING.key]).toEqual(NAV_ITEMS_SETTING.createDefaultValue());
    expect(result.plan.resetToDefault.map((entry) => entry.key)).toContain(NAV_ITEMS_SETTING.key);
  });
});

describe("parseSettingsFile - siteUrl 淨化", () => {
  it("移除結尾斜線，避免與路徑串接後出現雙斜線", () => {
    const result = parseSettingsFile(makeFileText({ [SITE_URL_SETTING.key]: "https://redmine.example.com/" }));

    if (!result.ok) throw new Error(result.error);
    expect(result.plan.values[SITE_URL_SETTING.key]).toBe("https://redmine.example.com");
  });

  it("不是 http(s) 網址時回退預設值", () => {
    const result = parseSettingsFile(makeFileText({ [SITE_URL_SETTING.key]: "javascript:alert(1)" }));

    if (!result.ok) throw new Error(result.error);
    expect(result.plan.values[SITE_URL_SETTING.key]).toBe(SITE_URL_SETTING.createDefaultValue());
    expect(result.plan.resetToDefault.map((entry) => entry.key)).toContain(SITE_URL_SETTING.key);
  });
});

describe("storage 編解碼", () => {
  it("toStorageEntries 產出 useStorage 讀得懂的 JSON 字串", () => {
    const entries = toStorageEntries({ [FORMAT_TEMPLATE_SETTING.key]: "- {id}" });

    expect(entries[FORMAT_TEMPLATE_SETTING.key]).toBe(JSON.stringify("- {id}"));
  });

  it("fromStorageEntries 對 storage 中不存在的 key 使用預設值", () => {
    const values = fromStorageEntries({});

    expect(values[FORMAT_TEMPLATE_SETTING.key]).toBe(FORMAT_TEMPLATE_SETTING.createDefaultValue());
  });

  it("fromStorageEntries 對損毀的 JSON 使用預設值", () => {
    const values = fromStorageEntries({ [FORMAT_TEMPLATE_SETTING.key]: "{壞掉的" });

    expect(values[FORMAT_TEMPLATE_SETTING.key]).toBe(FORMAT_TEMPLATE_SETTING.createDefaultValue());
  });
});

describe("匯出後再匯入", () => {
  it("還原出與匯出當下相同的 storage 內容", () => {
    const original = toStorageEntries({
      [SITE_URL_SETTING.key]: "https://redmine.example.com",
      [NAV_ITEMS_SETTING.key]: [navItem(), navItem({ id: "22222222-2222-4222-8222-222222222222", path: "/time_entries", label: "工時" })],
      [FORMAT_TEMPLATE_SETTING.key]: "- [#{id}]({url}) {subject}",
    });

    const file = buildSettingsFile(fromStorageEntries(original), "2026-09-07T00:00:00.000Z");
    const result = parseSettingsFile(JSON.stringify(file));

    if (!result.ok) throw new Error(result.error);
    expect(toStorageEntries(result.plan.values)).toEqual(original);
    expect(result.plan.resetToDefault).toEqual([]);
    expect(result.plan.warnings).toEqual([]);
  });
});
