const HIDDEN_CLASS = "redmine-formatter-hidden";

// 在文件頭部插入所需的 CSS 樣式
const style = document.createElement("style");
style.textContent = `
  .${HIDDEN_CLASS} {
    display: none !important;
  }
`;
document.head.appendChild(style);

/**
 * 獲取表格欄位的索引
 * @param table - 表格元素
 * @returns 欄位索引對象
 */
function getColumnIndexes(table: HTMLTableElement) {
  const headerCells = table.querySelectorAll("th");
  const indexes = {
    project: -1,
    tracker: -1,
    status: -1,
    subject: -1,
    date: -1,
    replies: -1,
    issues: -1,
  };

  headerCells.forEach((cell, index) => {
    const text = cell.textContent?.trim() || "";
    switch (text) {
      case "專案":
        indexes.project = index;
        break;
      case "追蹤標籤":
        indexes.tracker = index;
        break;
      case "狀態":
        indexes.status = index;
        break;
      case "主旨":
        indexes.subject = index;
        break;
      case "日期":
        indexes.date = index;
        break;
      case "回應":
        indexes.replies = index;
        break;
      case "議題":
        indexes.issues = index;
        break;
    }
  });

  return indexes;
}

/**
 * 從 URL 中提取 issue ID
 * @param url - issue 的完整 URL
 * @returns issue ID
 */
function extractIssueId(url: string): string {
  return url.split("/").pop() || "";
}

/**
 * 獲取當前頁面的基礎 URL
 * @returns 基礎 URL，例如: https://redmine.example.com/
 */
function getBaseUrl(): string {
  const url = new URL(window.location.href);
  return `${url.protocol}//${url.host}/`;
}

/**
 * 從表格單元格中提取連結資訊
 * @param cell - 表格單元格元素
 * @returns 連結資訊物件
 */
function extractLinkInfo(cell: HTMLTableCellElement | null) {
  const link = cell?.querySelector("a");
  if (!link) return { url: "", id: "" };

  const fullUrl = `${getBaseUrl()}${link.getAttribute("href")}`;
  return {
    url: fullUrl,
    id: extractIssueId(fullUrl),
  };
}

/**
 * 獲取表格中被選中的資料，如果沒有選中任何列則返回所有列的資料
 * @returns 選中的資料陣列或所有資料陣列
 */
function getSelectedTableData(): RedmineItem[] {
  const table = document.querySelector<HTMLTableElement>("#content table.list");
  if (!table) return [];

  const columnIndexes = getColumnIndexes(table);
  const allRows = Array.from(table.querySelectorAll("tbody tr"));

  const selectedRows = allRows.filter((row) => row.querySelector('input[type="checkbox"]:checked'));

  // 如果沒有選中任何列，則使用所有列
  const rowsToProcess = selectedRows.length > 0 ? selectedRows : allRows;

  return rowsToProcess.map((row) => {
    const cells = row.getElementsByTagName("td");
    const subjectCell = cells[columnIndexes.subject];
    const issuesCell = cells[columnIndexes.issues];

    // 從主旨欄位取得連結資訊
    const subjectLinkInfo = extractLinkInfo(subjectCell);
    // 從議題欄位取得連結資訊
    const issuesLinkInfo = extractLinkInfo(issuesCell);

    return {
      project: cells[columnIndexes.project]?.textContent?.trim() || "",
      tracker: cells[columnIndexes.tracker]?.textContent?.trim() || "",
      status: cells[columnIndexes.status]?.textContent?.trim() || "",
      subject: subjectCell?.textContent?.trim() || "",
      url: subjectLinkInfo.url || issuesLinkInfo.url, // 優先使用主旨的連結，如果沒有則使用議題的連結
      id: subjectLinkInfo.id || issuesLinkInfo.id, // 優先使用主旨的 ID，如果沒有則使用議題的 ID
      date: cells[columnIndexes.date]?.textContent?.trim() || "",
      replies: cells[columnIndexes.replies]?.textContent?.trim() || "",
      issues: issuesCell?.textContent?.trim() || "",
    };
  });
}

/**
 * 切換未選中列的顯示狀態
 * @param showOnlySelected - 是否只顯示選中的列
 */
function toggleUnselectedRows(showOnlySelected: boolean): void {
  const table = document.querySelector<HTMLTableElement>("#content table.issues");
  if (!table) return;

  const rows = table.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    const isSelected = row.querySelector('td input[type="checkbox"]:checked');
    if (!isSelected) {
      row.classList.toggle(HIDDEN_CLASS, showOnlySelected);
    }
  });
}

/**
 * 開啟指定行的上下文選單
 * @param row - 表格行元素
 * @returns 上下文選單元素
 */
async function openContextMenu(row: HTMLElement): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const contextMenuTrigger = row.querySelector<HTMLElement>(".js-contextmenu");
    if (contextMenuTrigger) {
      contextMenuTrigger.click();
      // 等一段時間，確保上下文選單已經開啟
      setTimeout(() => {
        resolve(document.querySelector<HTMLElement>("#context-menu") || null);
      }, 500);
    } else {
      resolve(null);
    }
  });
}

/**
 * 在上下文選單中找到指定選項
 * @param contextMenu - 上下文選單元素
 * @param key - 選項名稱
 * @returns 選項的子選單
 */
function findSubmenu(contextMenu: HTMLElement, key: string): HTMLElement | null {
  const menuItems = contextMenu.querySelectorAll("li a");
  for (const item of menuItems) {
    if (item.textContent?.trim() === key) {
      return item.closest("li")?.querySelector("ul") || null;
    }
  }
  return null;
}

/**
 * 在子選單中設置指定值
 * @param submenu - 子選單元素
 * @param value - 目標值
 * @param issueId - 議題 ID
 * @returns 是否成功設置值
 */
function setValue(submenu: HTMLElement, value: string, issueId: string): boolean {
  const items = submenu.querySelectorAll("a");
  for (const item of items) {
    if (item.textContent?.trim() === value) {
      const originalHref = item.getAttribute("href") || "";
      const newHref = originalHref.replace(/\/issues\/\d+/, `/issues/${issueId}`);
      item.setAttribute("href", newHref);
      item.click();
      return true;
    }
  }
  return false;
}

/**
 * 批量更新議題欄位
 * @param key - 要更新的欄位名稱
 * @param value - 要設置的值
 */
async function batchUpdate(key: string, value: string): Promise<void> {
  const table = document.querySelector<HTMLTableElement>("#content table.list");
  if (!table) return;

  const selectedRows = Array.from(table.querySelectorAll<HTMLElement>("tbody tr")).filter((row) =>
    row.querySelector('input[type="checkbox"]:checked')
  );

  if (!selectedRows.length) {
    throw new Error("沒有選中任何列");
  }

  const contextMenu = await openContextMenu(selectedRows[0]);
  if (!contextMenu) {
    throw new Error("無法開啟上下文選單");
  }

  const submenu = findSubmenu(contextMenu, key);
  if (!submenu) {
    throw new Error("無法找到子選單");
  }

  const columnIndexes = getColumnIndexes(table);

  for (const row of selectedRows) {
    const cells = row.getElementsByTagName("td");
    const subjectCell = cells[columnIndexes.subject];
    const subjectLink = subjectCell?.querySelector("a");

    if (!subjectLink?.href) {
      continue;
    }

    const issueId = extractIssueId(subjectLink.href);
    if (!issueId) {
      continue;
    }

    setValue(submenu, value, issueId);

    // 等待一小段時間，避免請求過於頻繁
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// 監聽來自 popup 的訊息
chrome.runtime.onMessage.addListener((request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void) => {
  if (request.action === "getSelectedData") {
    const data = getSelectedTableData();
    sendResponse({ data });
  } else if (request.action === "toggleVisibility") {
    toggleUnselectedRows(request.showOnlySelected);
    sendResponse({ success: true });
  } else if (request.action === "batchUpdate") {
    (async () => {
      try {
        await batchUpdate(request.key, request.value);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "未知錯誤",
        });
      }
    })();
    return true;
  }
});
