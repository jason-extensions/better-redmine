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

// 監聽來自 popup 的訊息
chrome.runtime.onMessage.addListener((request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void) => {
  if (request.action === "getSelectedData") {
    const data = getSelectedTableData();
    sendResponse({ data });
  } else if (request.action === "toggleVisibility") {
    toggleUnselectedRows(request.showOnlySelected);
    sendResponse({ success: true });
  }
});
