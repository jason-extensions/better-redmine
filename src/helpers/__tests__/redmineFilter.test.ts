import { describe, expect, it } from "vitest";
import {
  buildFilterQuery,
  describeCondition,
  isCsvValueType,
  isFilterApplied,
  isSameConditionSet,
  mergeFilter,
  normalizeCapabilities,
  removeFilter,
  replaceFilter,
  toggleFilter,
} from "@/helpers/redmineFilter";
import type { FilterCondition } from "@/types/filter";

const condition = (overrides: Partial<FilterCondition> = {}): FilterCondition => ({
  field: "tracker_id",
  operator: "=",
  values: ["1"],
  ...overrides,
});

/** 把 query string 拆成可比對的陣列，避免測試綁死參數順序以外的細節 */
const params = (query: string) => [...new URLSearchParams(query).entries()];

describe("buildFilterQuery", () => {
  it("一律帶上 set_filter=1，否則 Redmine 會沿用 session 裡的篩選", () => {
    expect(params(buildFilterQuery([condition()]))).toContainEqual(["set_filter", "1"]);
  });

  it("以 f/op/v 三組參數描述一個條件", () => {
    const query = params(buildFilterQuery([condition()]));

    expect(query).toContainEqual(["f[]", "tracker_id"]);
    expect(query).toContainEqual(["op[tracker_id]", "="]);
    expect(query).toContainEqual(["v[tracker_id][]", "1"]);
  });

  it("多個值展開成多筆 v 參數", () => {
    const query = params(buildFilterQuery([condition({ values: ["1", "3"] })]));

    expect(query.filter(([k]) => k === "v[tracker_id][]")).toEqual([
      ["v[tracker_id][]", "1"],
      ["v[tracker_id][]", "3"],
    ]);
  });

  it("不吃值的運算子不產生 v 參數", () => {
    const query = params(buildFilterQuery([condition({ field: "status_id", operator: "o", values: [] })]));

    expect(query).toContainEqual(["op[status_id]", "o"]);
    expect(query.some(([k]) => k.startsWith("v["))).toBe(false);
  });

  it("多個條件各自產生一組參數", () => {
    const query = params(
      buildFilterQuery([condition(), condition({ field: "status_id", operator: "o", values: [] })])
    );

    expect(query.filter(([k]) => k === "f[]")).toEqual([
      ["f[]", "tracker_id"],
      ["f[]", "status_id"],
    ]);
  });

  it("沒有任何條件時仍帶 set_filter=1，用來清空篩選", () => {
    const query = params(buildFilterQuery([]));

    expect(query).toContainEqual(["set_filter", "1"]);
    expect(query.some(([k]) => k === "f[]")).toBe(false);
  });

  it("列為逗號字串的欄位，多個值合併成單一參數", () => {
    const query = params(buildFilterQuery([condition({ field: "issue_id", values: ["56736", "56590"] })], ["issue_id"]));

    expect(query.filter(([k]) => k === "v[issue_id][]")).toEqual([["v[issue_id][]", "56736,56590"]]);
  });

  it("未列為逗號字串的欄位維持多筆參數", () => {
    const query = params(buildFilterQuery([condition({ values: ["1", "3"] })], ["issue_id"]));

    expect(query.filter(([k]) => k === "v[tracker_id][]")).toHaveLength(2);
  });

  it("逗號字串欄位沒有值時不產生 v 參數", () => {
    const query = params(buildFilterQuery([condition({ field: "issue_id", operator: "*", values: [] })], ["issue_id"]));

    expect(query.some(([k]) => k.startsWith("v["))).toBe(false);
  });

  it("值含有逗號與空白時正確編碼", () => {
    const query = buildFilterQuery([condition({ field: "issue_id", values: ["56736,56590"] })]);

    expect(query).toContain("v%5Bissue_id%5D%5B%5D=56736%2C56590");
  });
});

describe("isFilterApplied", () => {
  it("沒有任何篩選時不算套用", () => {
    expect(isFilterApplied([], condition())).toBe(false);
  });

  it("欄位、運算子與值都相符時算套用", () => {
    expect(isFilterApplied([condition()], condition())).toBe(true);
  });

  it("套用中的值涵蓋快捷的值時算套用", () => {
    expect(isFilterApplied([condition({ values: ["1", "3"] })], condition({ values: ["1"] }))).toBe(true);
  });

  it("快捷的值只有部分存在時不算套用", () => {
    expect(isFilterApplied([condition({ values: ["1"] })], condition({ values: ["1", "3"] }))).toBe(false);
  });

  it("同欄位但運算子不同時不算套用", () => {
    expect(isFilterApplied([condition({ operator: "!" })], condition({ operator: "=" }))).toBe(false);
  });

  it("不同欄位不算套用", () => {
    expect(isFilterApplied([condition({ field: "status_id" })], condition())).toBe(false);
  });

  it("不吃值的運算子只要欄位與運算子相符就算套用", () => {
    const open = condition({ field: "status_id", operator: "o", values: [] });

    expect(isFilterApplied([open], open)).toBe(true);
  });
});

describe("mergeFilter", () => {
  it("欄位尚未被篩選時直接加入", () => {
    expect(mergeFilter([], condition())).toEqual([condition()]);
  });

  it("同欄位同運算子時取值的聯集", () => {
    const result = mergeFilter([condition({ values: ["1"] })], condition({ values: ["3"] }));

    expect(result).toEqual([condition({ values: ["1", "3"] })]);
  });

  it("重複的值不會被加入兩次", () => {
    const result = mergeFilter([condition({ values: ["1"] })], condition({ values: ["1"] }));

    expect(result).toEqual([condition({ values: ["1"] })]);
  });

  it("同欄位但運算子不同時整個取代，因為 Redmine 一個欄位只能有一個運算子", () => {
    const result = mergeFilter([condition({ operator: "=", values: ["1"] })], condition({ operator: "!", values: ["3"] }));

    expect(result).toEqual([condition({ operator: "!", values: ["3"] })]);
  });

  it("不影響其他欄位的條件", () => {
    const other = condition({ field: "status_id", operator: "o", values: [] });
    const result = mergeFilter([other], condition());

    expect(result).toEqual([other, condition()]);
  });

  it("不修改傳入的陣列", () => {
    const active = [condition({ values: ["1"] })];
    mergeFilter(active, condition({ values: ["3"] }));

    expect(active).toEqual([condition({ values: ["1"] })]);
  });
});

describe("removeFilter", () => {
  it("移除快捷的值，其餘的值保留", () => {
    const result = removeFilter([condition({ values: ["1", "3"] })], condition({ values: ["3"] }));

    expect(result).toEqual([condition({ values: ["1"] })]);
  });

  it("值被移光時整個欄位一併移除", () => {
    expect(removeFilter([condition({ values: ["1"] })], condition({ values: ["1"] }))).toEqual([]);
  });

  it("不吃值的運算子直接移除整個欄位", () => {
    const open = condition({ field: "status_id", operator: "o", values: [] });

    expect(removeFilter([open], open)).toEqual([]);
  });

  it("欄位不在篩選中時原樣返回", () => {
    expect(removeFilter([condition()], condition({ field: "status_id" }))).toEqual([condition()]);
  });

  it("同欄位但運算子不同時不動它", () => {
    const active = [condition({ operator: "!" })];

    expect(removeFilter(active, condition({ operator: "=" }))).toEqual(active);
  });

  it("不修改傳入的陣列", () => {
    const active = [condition({ values: ["1", "3"] })];
    removeFilter(active, condition({ values: ["3"] }));

    expect(active).toEqual([condition({ values: ["1", "3"] })]);
  });
});

describe("toggleFilter", () => {
  it("尚未套用時加入", () => {
    expect(toggleFilter([], condition())).toEqual([condition()]);
  });

  it("已套用時移除", () => {
    expect(toggleFilter([condition()], condition())).toEqual([]);
  });

  it("同欄位不同運算子時視為未套用，因此取代", () => {
    const result = toggleFilter([condition({ operator: "!" })], condition({ operator: "=" }));

    expect(result).toEqual([condition({ operator: "=" })]);
  });
});

describe("normalizeCapabilities", () => {
  const raw = {
    availableFilters: {
      tracker_id: { type: "list", name: "追蹤標籤", values: [["Bug", "1"], ["Support", "3"]] },
      status_id: { type: "list_status", name: "狀態", values: [["New", "1"]] },
      issue_id: { type: "integer", name: "議題" },
    },
    operatorByType: { list: ["=", "!"], list_status: ["o", "=", "c"], integer: ["=", ">=", "<="] },
    operatorLabels: { "=": "等於", "!": "不等於", o: "進行中", c: "已結束", ">=": ">=", "<=": "<=" },
  };

  it("把欄位轉成帶顯示名稱與型別的能力描述", () => {
    const tracker = normalizeCapabilities(raw).find((c) => c.field === "tracker_id");

    expect(tracker).toMatchObject({ field: "tracker_id", name: "追蹤標籤", type: "list" });
  });

  it("依型別帶出可用的運算子與其顯示名稱", () => {
    const tracker = normalizeCapabilities(raw).find((c) => c.field === "tracker_id");

    expect(tracker?.operators).toEqual([
      { value: "=", label: "等於" },
      { value: "!", label: "不等於" },
    ]);
  });

  it("把 [顯示名稱, 值] 的配對轉成值選項", () => {
    const tracker = normalizeCapabilities(raw).find((c) => c.field === "tracker_id");

    expect(tracker?.values).toEqual([
      { value: "1", label: "Bug" },
      { value: "3", label: "Support" },
    ]);
  });

  it("沒有值清單的自由輸入型別給空陣列", () => {
    const issueId = normalizeCapabilities(raw).find((c) => c.field === "issue_id");

    expect(issueId?.values).toEqual([]);
  });

  it("運算子沒有對應顯示名稱時退而用運算子本身", () => {
    const result = normalizeCapabilities({
      availableFilters: { done_ratio: { type: "integer", name: "完成百分比" } },
      operatorByType: { integer: ["="] },
      operatorLabels: {},
    });

    expect(result[0].operators).toEqual([{ value: "=", label: "=" }]);
  });

  it("型別不在 operatorByType 中的欄位整個略過，因為無從得知可用運算子", () => {
    const result = normalizeCapabilities({
      availableFilters: { weird: { type: "unknown_type", name: "怪欄位" } },
      operatorByType: { list: ["="] },
      operatorLabels: {},
    });

    expect(result).toEqual([]);
  });

  it("讀不到 availableFilters 時回傳空陣列", () => {
    expect(normalizeCapabilities({ availableFilters: null, operatorByType: {}, operatorLabels: {} })).toEqual([]);
  });
});

describe("isCsvValueType", () => {
  it.each(["list", "list_status", "list_optional"])("list 系列的 %s 使用多筆參數", (type) => {
    expect(isCsvValueType(type)).toBe(false);
  });

  it.each(["integer", "text", "date", "date_past", "float", "relation", "tree"])(
    "自由輸入的 %s 使用逗號字串",
    (type) => {
      expect(isCsvValueType(type)).toBe(true);
    }
  );
});

describe("replaceFilter", () => {
  it("同欄位已存在時整個取代，不做值的聯集", () => {
    const result = replaceFilter([condition({ values: ["1"] })], condition({ values: ["3"] }));

    expect(result).toEqual([condition({ values: ["3"] })]);
  });

  it("同欄位但運算子不同時一樣取代", () => {
    const result = replaceFilter([condition({ operator: "!" })], condition({ operator: "=" }));

    expect(result).toEqual([condition({ operator: "=" })]);
  });

  it("欄位不存在時加入", () => {
    expect(replaceFilter([], condition())).toEqual([condition()]);
  });

  it("不影響其他欄位的條件", () => {
    const other = condition({ field: "status_id", operator: "o", values: [] });

    expect(replaceFilter([other], condition())).toEqual([other, condition()]);
  });

  it("不修改傳入的陣列", () => {
    const active = [condition({ values: ["1"] })];
    replaceFilter(active, condition({ values: ["3"] }));

    expect(active).toEqual([condition({ values: ["1"] })]);
  });
});

describe("describeCondition", () => {
  const capabilities = [
    {
      field: "tracker_id",
      name: "追蹤標籤",
      type: "list",
      operators: [
        { value: "=", label: "等於" },
        { value: "!", label: "不等於" },
      ],
      values: [
        { value: "1", label: "Bug" },
        { value: "3", label: "Support" },
      ],
    },
    {
      field: "status_id",
      name: "狀態",
      type: "list_status",
      operators: [{ value: "o", label: "進行中" }],
      values: [],
    },
    { field: "issue_id", name: "議題", type: "integer", operators: [{ value: "=", label: "等於" }], values: [] },
  ];

  it("以欄位、運算子與值的顯示名稱組成描述", () => {
    const result = describeCondition({ field: "tracker_id", operator: "=", values: ["1"] }, capabilities);

    expect(result).toBe("追蹤標籤 等於 Bug");
  });

  it("多個值以頓號連接", () => {
    const result = describeCondition({ field: "tracker_id", operator: "=", values: ["1", "3"] }, capabilities);

    expect(result).toBe("追蹤標籤 等於 Bug、Support");
  });

  it("不吃值的運算子只描述到運算子", () => {
    const result = describeCondition({ field: "status_id", operator: "o", values: [] }, capabilities);

    expect(result).toBe("狀態 進行中");
  });

  it("沒有值清單的欄位直接顯示原始值", () => {
    const result = describeCondition({ field: "issue_id", operator: "=", values: ["56736,56590"] }, capabilities);

    expect(result).toBe("議題 等於 56736,56590");
  });

  it("欄位不在能力清單中時退而顯示欄位代號", () => {
    const result = describeCondition({ field: "unknown_field", operator: "=", values: ["7"] }, capabilities);

    expect(result).toBe("unknown_field = 7");
  });

  it("運算子不在能力清單中時退而顯示運算子本身", () => {
    const result = describeCondition({ field: "tracker_id", operator: ">=", values: ["1"] }, capabilities);

    expect(result).toBe("追蹤標籤 >= Bug");
  });
});

describe("isSameConditionSet", () => {
  const status = condition({ field: "status_id", operator: "o", values: [] });

  it("內容相同時視為同一組", () => {
    expect(isSameConditionSet([condition(), status], [condition(), status])).toBe(true);
  });

  it("條件的排列順序不影響判斷", () => {
    expect(isSameConditionSet([condition(), status], [status, condition()])).toBe(true);
  });

  it("值的排列順序不影響判斷", () => {
    expect(isSameConditionSet([condition({ values: ["1", "3"] })], [condition({ values: ["3", "1"] })])).toBe(true);
  });

  it("條件數量不同時不算同一組", () => {
    expect(isSameConditionSet([condition(), status], [condition()])).toBe(false);
  });

  it("值不同時不算同一組", () => {
    expect(isSameConditionSet([condition({ values: ["1"] })], [condition({ values: ["3"] })])).toBe(false);
  });

  it("運算子不同時不算同一組", () => {
    expect(isSameConditionSet([condition({ operator: "=" })], [condition({ operator: "!" })])).toBe(false);
  });

  it("欄位不同時不算同一組", () => {
    expect(isSameConditionSet([condition()], [condition({ field: "status_id" })])).toBe(false);
  });

  it("兩邊都沒有條件時視為同一組", () => {
    expect(isSameConditionSet([], [])).toBe(true);
  });

  it("值的數量不同時不算同一組", () => {
    expect(isSameConditionSet([condition({ values: ["1"] })], [condition({ values: ["1", "3"] })])).toBe(false);
  });
});
