import type { FilterCondition, FilterFieldCapability } from "@/types/filter";

/**
 * Redmine 頁面上與篩選有關的三個全域變數。
 * 它們只存在於頁面的 main world，必須以 world: "MAIN" 讀出後再交給這裡正規化。
 */
export interface RawFilterGlobals {
  /** 欄位定義；值為 [顯示名稱, 值] 的配對 */
  availableFilters: Record<string, { type?: string; name?: string; values?: [string, string][] }> | null | undefined;
  /** 每種欄位型別可用的運算子 */
  operatorByType: Record<string, string[]> | null | undefined;
  /** 運算子的顯示名稱 */
  operatorLabels: Record<string, string> | null | undefined;
}

/**
 * 把 Redmine 的篩選全域變數整理成側邊欄可用的能力描述。
 *
 * 型別不在 operatorByType 中的欄位會被略過：沒有可用運算子就組不出
 * 合法的篩選，列出來只會讓使用者選到無效的條件。
 */
export function normalizeCapabilities({
  availableFilters,
  operatorByType,
  operatorLabels,
}: RawFilterGlobals): FilterFieldCapability[] {
  if (!availableFilters) return [];

  return Object.entries(availableFilters).reduce<FilterFieldCapability[]>((capabilities, [field, definition]) => {
    const type = definition?.type ?? "";
    const operators = operatorByType?.[type];
    if (!operators?.length) return capabilities;

    capabilities.push({
      field,
      name: definition?.name || field,
      type,
      operators: operators.map((value) => ({ value, label: operatorLabels?.[value] || value })),
      values: (definition?.values ?? []).map(([label, value]) => ({ value, label })),
    });

    return capabilities;
  }, []);
}

/**
 * 把篩選條件組成 Redmine 議題列表的查詢字串。
 *
 * 一定帶 set_filter=1：少了它，Redmine 會沿用 session 中記住的篩選，
 * 網址上寫的條件反而不會生效。也因為如此，呼叫端必須傳入「完整的」
 * 條件集合，而不是只傳要變更的部分。
 */
export function buildFilterQuery(conditions: FilterCondition[], csvFields: string[] = []): string {
  const params = new URLSearchParams();
  params.set("set_filter", "1");

  conditions.forEach(({ field, operator, values }) => {
    params.append("f[]", field);
    params.append(`op[${field}]`, operator);

    if (!values.length) return;

    // 自由輸入型別只讀第一個 v 參數，多個值必須併成逗號字串；
    // list 系列則相反，逗號字串會被當成單一個值而篩不到東西。
    if (csvFields.includes(field)) params.append(`v[${field}][]`, values.join(","));
    else values.forEach((value) => params.append(`v[${field}][]`, value));
  });

  return params.toString();
}

/** 條件的識別字串；值排序後比對，避免只是順序不同就被當成不同組 */
const conditionKey = ({ field, operator, values }: FilterCondition) =>
  `${field}|${operator}|${[...values].sort().join(",")}`;

/**
 * 兩組條件是否等價。
 * 用來判斷目前套用的篩選是不是正好等於某個組合，決定組合按鈕的高亮。
 */
export function isSameConditionSet(a: FilterCondition[], b: FilterCondition[]): boolean {
  if (a.length !== b.length) return false;

  const keys = a.map(conditionKey).sort();
  const otherKeys = b.map(conditionKey).sort();

  return keys.every((key, index) => key === otherKeys[index]);
}

/**
 * 把條件描述成可讀的一行字，例如「追蹤標籤 等於 Bug」。
 *
 * 同時用於「套用中」的顯示與快捷的預設名稱，兩處共用一套描述才不會
 * 出現同一個條件在不同地方講法不一致。讀不到對應的顯示名稱時一律
 * 退回原始代號，寧可難看也不要空白。
 */
export function describeCondition(condition: FilterCondition, capabilities: FilterFieldCapability[]): string {
  const capability = capabilities.find((item) => item.field === condition.field);

  const name = capability?.name || condition.field;
  const operator = capability?.operators.find((item) => item.value === condition.operator)?.label || condition.operator;
  const values = condition.values
    .map((value) => capability?.values.find((item) => item.value === value)?.label || value)
    .join("、");

  return [name, operator, values].filter(Boolean).join(" ");
}

/**
 * 值是否要以逗號字串傳遞。
 * list 系列是多選欄位，吃多筆 v 參數；其餘型別只讀第一筆，必須併成一個值。
 */
export const isCsvValueType = (type: string): boolean => !type.startsWith("list");

/**
 * 以同欄位的條件取代現有篩選，不做值的聯集。
 * 「僅顯示已勾選」用的是取代語意：按下去就是只看當下勾選的那幾筆，
 * 而不是把先前篩過的議題一起累加進來。
 */
export function replaceFilter(active: FilterCondition[], target: FilterCondition): FilterCondition[] {
  return [...active.filter((condition) => condition.field !== target.field), { ...target, values: [...target.values] }];
}

/**
 * 判斷快捷是否已套用。
 * 欄位與運算子都要相符，且套用中的值涵蓋快捷的所有值；不吃值的運算子
 * 只看欄位與運算子。用來決定按鈕的高亮狀態與再次點擊的方向。
 */
export function isFilterApplied(active: FilterCondition[], target: FilterCondition): boolean {
  const current = active.find((condition) => condition.field === target.field);
  if (!current || current.operator !== target.operator) return false;

  return target.values.every((value) => current.values.includes(value));
}

/**
 * 把條件併入現有篩選。
 *
 * 同欄位同運算子時取值的聯集；同欄位但運算子不同時只能整個取代，因為
 * Redmine 的 op[<field>] 是單值，一個欄位無法同時套用兩種運算子。
 */
export function mergeFilter(active: FilterCondition[], target: FilterCondition): FilterCondition[] {
  const index = active.findIndex((condition) => condition.field === target.field);
  const appended: FilterCondition = { ...target, values: [...target.values] };

  if (index === -1) return [...active, appended];

  const current = active[index];
  const next = [...active];
  next[index] =
    current.operator === target.operator
      ? { ...current, values: [...new Set([...current.values, ...target.values])] }
      : appended;

  return next;
}

/**
 * 從現有篩選中移除條件。
 * 值被移光、或運算子本身不吃值時，整個欄位一併移除。
 */
export function removeFilter(active: FilterCondition[], target: FilterCondition): FilterCondition[] {
  const index = active.findIndex((condition) => condition.field === target.field);
  if (index === -1) return [...active];

  const current = active[index];
  // 運算子不同代表不是同一個條件，不應被這個快捷移除
  if (current.operator !== target.operator) return [...active];

  const withoutField = active.filter((_, i) => i !== index);
  if (!target.values.length) return withoutField;

  const values = current.values.filter((value) => !target.values.includes(value));
  if (!values.length) return withoutField;

  const next = [...active];
  next[index] = { ...current, values };

  return next;
}

/** 已套用就移除，否則併入 */
export function toggleFilter(active: FilterCondition[], target: FilterCondition): FilterCondition[] {
  return isFilterApplied(active, target) ? removeFilter(active, target) : mergeFilter(active, target);
}
