export const useGetCurrentTabId = () => {
  /**
   * 取得側邊欄所屬視窗中，目前作用中的分頁 ID。
   * 直接查詢而非向 background 詢問，避免拿到「最後一個載入 content script 的分頁」。
   */
  const getCurrentTabId = async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) throw new Error("無法取得目前分頁 ID");

    return activeTab.id;
  };

  return { getCurrentTabId };
};
