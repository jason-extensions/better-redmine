import { buildFilterQuery } from "@/helpers/redmineFilter";
import type { RawFilterGlobals } from "@/helpers/redmineFilter";
import type { FilterCondition } from "@/types/filter";

export interface FilterPageState {
  /** 頁面上有篩選區塊才視為議題列表頁 */
  isIssueList: boolean;
  /** 不含查詢字串的頁面位址，用來組出導向目標 */
  baseUrl: string;
  globals: RawFilterGlobals;
  /** 目前實際套用中的篩選 */
  active: FilterCondition[];
  /** 目前勾選的議題編號 */
  selectedIssueIds: string[];
}

/**
 * 在頁面的 main world 讀出篩選狀態。
 *
 * 這段程式碼會被序列化後送進頁面執行，因此不能引用任何外部變數或
 * import；所有邏輯都得寫在函式內。
 *
 * 之所以非得在 main world 執行，是因為 availableFilters 這三個全域變數
 * 由 Redmine 自己的 JS 建立，content script 的 isolated world 看不到。
 */
const readPageState = () => {
  const globalScope = window as unknown as Record<string, unknown>;

  const active = [...document.querySelectorAll<HTMLTableRowElement>("#filters tr")]
    .filter((row) => row.querySelector<HTMLInputElement>('input[type="checkbox"]:checked'))
    .map((row) => {
      const field = row.id.replace(/^tr_/, "");
      const operator = row.querySelector<HTMLSelectElement>(`select[name="op[${field}]"]`)?.value ?? "";
      // 值控制項會隨運算子在多選、單選與純文字之間切換，三種都要處理
      const values = [...row.querySelectorAll<HTMLSelectElement | HTMLInputElement>(`[name="v[${field}][]"]`)]
        .flatMap((element) =>
          element instanceof HTMLSelectElement && element.multiple
            ? [...element.selectedOptions].map((option) => option.value)
            : [element.value]
        )
        .filter((value) => value !== "");

      return { field, operator, values };
    })
    .filter((condition) => condition.field && condition.operator);

  const selectedIssueIds = [...document.querySelectorAll<HTMLInputElement>('input[name="ids[]"]:checked')].map(
    (checkbox) => checkbox.value
  );

  return {
    isIssueList: !!document.querySelector("#filters"),
    baseUrl: `${location.origin}${location.pathname}`,
    globals: {
      availableFilters: globalScope.availableFilters ?? null,
      operatorByType: globalScope.operatorByType ?? null,
      operatorLabels: globalScope.operatorLabels ?? null,
    },
    active,
    selectedIssueIds,
  };
};

const UNREADABLE_PAGE_MESSAGE = "無法讀取頁面，請確認目前分頁停留在 Redmine 的議題列表頁";

/** 讀出目前分頁的篩選狀態 */
export async function readFilterPageState(tabId: number): Promise<FilterPageState> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: readPageState,
  });

  if (!injection?.result) throw new Error(UNREADABLE_PAGE_MESSAGE);

  return injection.result as FilterPageState;
}

/**
 * 帶著完整的篩選條件導向議題列表。
 *
 * 條件必須是完整集合而非增量：查詢字串一定帶 set_filter=1，Redmine 會
 * 以它整組取代 session 中記住的篩選。
 */
export async function navigateWithFilters(
  tabId: number,
  baseUrl: string,
  conditions: FilterCondition[],
  csvFields: string[]
): Promise<void> {
  await chrome.tabs.update(tabId, { url: `${baseUrl}?${buildFilterQuery(conditions, csvFields)}` });
}
