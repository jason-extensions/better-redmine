// 追蹤目前開啟的分頁
let currentTabId: number | null = null;

// 監聽來自 content script 的準備就緒訊息
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "contentScriptReady" && sender.tab?.id) {
    currentTabId = sender.tab.id;
  }
});

chrome.action.onClicked.addListener(async () => {
  // 檢查目前是否有活動的分頁
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;

  currentTabId = activeTab.id;

  // 建立新視窗
  chrome.windows.create({
    url: chrome.runtime.getURL("index.html"),
    type: "popup",
    width: 400,
    height: 600,
    focused: true,
  });
});

// 提供一個方法讓 popup 獲取目前的分頁 ID
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getCurrentTabId") {
    sendResponse({ tabId: currentTabId });
  }
  return true;
});
