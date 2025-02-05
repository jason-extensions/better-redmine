export enum TabType {
  FORMAT = "format",
  BATCH = "batch",
  NAV = "nav",
}

export const TabLabel: Record<TabType, string> = {
  [TabType.FORMAT]: "格式化",
  [TabType.BATCH]: "批量修改",
  [TabType.NAV]: "快捷導航",
};
