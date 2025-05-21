/// <reference types="chrome" />

// 追蹤目前開啟的分頁
let currentTabId: number | null = null;

// 設置側邊欄在點擊擴展圖標時開啟
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // 設置側邊欄選項
    await chrome.sidePanel.setOptions({
      path: "index.html",
      enabled: true,
    });

    // 設置點擊擴展圖標時打開側邊欄
    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true,
    });

    console.log("側邊欄設置已完成");
  } catch (error) {
    console.error("設置側邊欄選項時發生錯誤:", error);
  }
});

// 監聽來自 content script 的準備就緒訊息
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "contentScriptReady" && sender.tab?.id) {
    currentTabId = sender.tab.id;
  }
});

// 當用戶點擊擴展圖標時
chrome.action.onClicked.addListener(async () => {
  // 檢查目前是否有活動的分頁
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;

  currentTabId = activeTab.id;

  try {
    // 開啟側邊欄
    await chrome.sidePanel.open({ tabId: activeTab.id });
    console.log("側邊欄已打開");
  } catch (error) {
    console.error("開啟側邊欄時發生錯誤:", error);
  }
});

// 提供一個方法讓側邊欄獲取目前的分頁 ID
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getCurrentTabId") {
    sendResponse({ tabId: currentTabId });
  }
  return true;
});
