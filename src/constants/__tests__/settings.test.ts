import { describe, expect, it } from "vitest";
import { FORMAT_TEMPLATES_SETTING, ISSUE_LINK_TEMPLATE_SETTING, SETTING_DEFINITIONS } from "@/constants/settings";
import { applyTemplate } from "@/helpers/formatTemplate";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const template = (overrides: Record<string, unknown> = {}) => ({
  id: "22222222-2222-4222-8222-222222222222",
  name: "Markdown 清單",
  template: "- [#{id}]({url})",
  ...overrides,
});

describe("FORMAT_TEMPLATES_SETTING.parse", () => {
  it("預設值為空陣列", () => {
    expect(FORMAT_TEMPLATES_SETTING.createDefaultValue()).toEqual([]);
  });

  it("保留合法的模板收藏", () => {
    const result = FORMAT_TEMPLATES_SETTING.parse([template()]);

    expect(result.value).toEqual([{ id: "22222222-2222-4222-8222-222222222222", name: "Markdown 清單", template: "- [#{id}]({url})" }]);
    expect(result.warnings).toEqual([]);
  });

  it("不是陣列時整項拒絕，讓呼叫端回退預設值", () => {
    expect(FORMAT_TEMPLATES_SETTING.parse({ name: "x" }).value).toBeNull();
  });

  it("缺少 name 的項目被丟棄並記錄警告", () => {
    const result = FORMAT_TEMPLATES_SETTING.parse([template({ name: undefined })]);

    expect(result.value).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it("缺少 template 的項目被丟棄並記錄警告", () => {
    const result = FORMAT_TEMPLATES_SETTING.parse([template({ template: undefined })]);

    expect(result.value).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it("name 為空白字串的項目被丟棄", () => {
    expect(FORMAT_TEMPLATES_SETTING.parse([template({ name: "   " })]).value).toEqual([]);
  });

  it("template 為空白字串的項目被丟棄", () => {
    expect(FORMAT_TEMPLATES_SETTING.parse([template({ template: "   " })]).value).toEqual([]);
  });

  it("id 缺失時補發新的，讓手動編輯過的設定檔也能匯入", () => {
    const result = FORMAT_TEMPLATES_SETTING.parse([template({ id: undefined })]);

    expect(result.value?.[0].id).toMatch(UUID_PATTERN);
  });

  it("name 去除前後空白", () => {
    expect(FORMAT_TEMPLATES_SETTING.parse([template({ name: "  日報  " })]).value?.[0].name).toBe("日報");
  });

  it("template 保留前後空白，因為模板的空白可能是格式的一部分", () => {
    expect(FORMAT_TEMPLATES_SETTING.parse([template({ template: "  {id} " })]).value?.[0].template).toBe("  {id} ");
  });

  it("只丟棄無效的項目，合法的項目保留", () => {
    const result = FORMAT_TEMPLATES_SETTING.parse([template(), template({ name: "" }), template({ name: "日報" })]);

    expect(result.value).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
  });

  it("已登錄於匯出／匯入涵蓋範圍", () => {
    expect(SETTING_DEFINITIONS).toContain(FORMAT_TEMPLATES_SETTING);
  });
});

describe("ISSUE_LINK_TEMPLATE_SETTING", () => {
  it("預設模板套用議題資料後產生可用的 markdown 連結", () => {
    const result = applyTemplate(ISSUE_LINK_TEMPLATE_SETTING.createDefaultValue(), {
      id: "56736",
      subject: "[WEB] 單筆投資資產明細-需確認有沒有做篩選",
      url: "https://redmine.twjoin.com/issues/56736",
    });

    expect(result).toBe("[#56736 [WEB] 單筆投資資產明細-需確認有沒有做篩選](https://redmine.twjoin.com/issues/56736)");
  });

  it("不是字串時整項拒絕", () => {
    expect(ISSUE_LINK_TEMPLATE_SETTING.parse(["- {id}"]).value).toBeNull();
  });

  it("空白字串整項拒絕，避免複製出空內容", () => {
    expect(ISSUE_LINK_TEMPLATE_SETTING.parse("   ").value).toBeNull();
  });

  it("保留前後空白，因為模板的空白可能是格式的一部分", () => {
    expect(ISSUE_LINK_TEMPLATE_SETTING.parse(" {id} ").value).toBe(" {id} ");
  });

  it("已登錄於匯出／匯入涵蓋範圍", () => {
    expect(SETTING_DEFINITIONS).toContain(ISSUE_LINK_TEMPLATE_SETTING);
  });
});
