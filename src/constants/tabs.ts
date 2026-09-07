export enum TabType {
  FORMAT = "format",
  BATCH = "batch",
  NAV = "nav",
  SETTINGS = "settings",
}

export const TabLabel: Record<TabType, string> = {
  [TabType.FORMAT]: "格式化",
  [TabType.BATCH]: "批量修改",
  [TabType.NAV]: "快捷導航",
  [TabType.SETTINGS]: "設定",
};
