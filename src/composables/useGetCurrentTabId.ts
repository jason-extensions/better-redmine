export const useGetCurrentTabId = () => {
  const getCurrentTabId = async () => {
    return new Promise<number>((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "getCurrentTabId" }, (response) => {
        if (response && response.tabId) {
          resolve(response.tabId);
        } else {
          reject(new Error("無法獲取目前分頁 ID"));
        }
      });
    });
  };

  return { getCurrentTabId };
};
