import { parseBulkUpdateHref } from "@/helpers/contextMenu";
import type { BatchField, BatchFieldOption } from "@/types/batch";

const HIDDEN_CLASS = "redmine-formatter-hidden";

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "未知錯誤");

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
  const table = document.querySelector<HTMLTableElement>("#content table.list");
  if (!table) return;

  const rows = table.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    const isSelected = row.querySelector('td input[type="checkbox"]:checked');
    if (!isSelected) {
      row.classList.toggle(HIDDEN_CLASS, showOnlySelected);
    }
  });
}

const CONTEXT_MENU_TIMEOUT = 3000;
const CONTEXT_MENU_POLL_INTERVAL = 50;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 取得表格中被勾選的列
 * @param table - 表格元素
 */
function getSelectedRows(table: HTMLTableElement): HTMLElement[] {
  return Array.from(table.querySelectorAll<HTMLElement>("tbody tr")).filter((row) =>
    row.querySelector('input[type="checkbox"]:checked')
  );
}

/**
 * 開啟 Redmine 的右鍵選單。
 * 選單內容由當下勾選的列決定，因此必須先有勾選。
 * @returns 選單元素
 */
async function openContextMenu(): Promise<HTMLElement> {
  const table = document.querySelector<HTMLTableElement>("#content table.list");
  if (!table) throw new Error("這個頁面上找不到議題列表");

  const selectedRows = getSelectedRows(table);
  if (!selectedRows.length) throw new Error("請先在頁面上勾選要修改的議題");

  const trigger = selectedRows[0].querySelector<HTMLElement>(".js-contextmenu");
  if (!trigger) throw new Error("無法開啟 Redmine 的右鍵選單");

  trigger.click();

  const deadline = Date.now() + CONTEXT_MENU_TIMEOUT;
  while (Date.now() < deadline) {
    const contextMenu = document.querySelector<HTMLElement>("#context-menu");
    if (contextMenu?.querySelector("a[href]")) return contextMenu;
    await delay(CONTEXT_MENU_POLL_INTERVAL);
  }

  throw new Error("開啟右鍵選單逾時");
}

/** Redmine 以 document 上的 click 關閉選單 */
function closeContextMenu(): void {
  document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

/**
 * 讀出選單中所有可批次修改的欄位與選項。
 * 僅保留 href 指向 bulk_update 且帶有 issue[...] 參數的項目，
 * 因此「監看員」「大量編輯」「篩選器」等非欄位項目會自動被排除。
 * @param contextMenu - 選單元素
 */
function readBatchFields(contextMenu: HTMLElement): BatchField[] {
  const fields: BatchField[] = [];

  contextMenu.querySelectorAll<HTMLLIElement>(":scope > ul > li").forEach((item) => {
    const label = item.querySelector<HTMLAnchorElement>(":scope > a")?.textContent?.trim();
    if (!label) return;

    const options: BatchFieldOption[] = [];
    item.querySelectorAll<HTMLAnchorElement>(":scope > ul > li > a").forEach((link) => {
      const target = parseBulkUpdateHref(link.getAttribute("href") || "");
      const optionLabel = link.textContent?.trim();
      if (target && optionLabel) options.push({ label: optionLabel, ...target });
    });

    if (options.length) fields.push({ label, options });
  });

  return fields;
}

/**
 * 在選單中找出對應快捷鍵的連結
 * @param contextMenu - 選單元素
 * @param param - bulk_update 的參數名
 * @param paramValue - 參數值
 */
function findShortcutLink(contextMenu: HTMLElement, param: string, paramValue: string): HTMLAnchorElement | null {
  const links = contextMenu.querySelectorAll<HTMLAnchorElement>("a[href]");

  for (const link of links) {
    const target = parseBulkUpdateHref(link.getAttribute("href") || "");
    if (target?.param === param && target.paramValue === paramValue) return link;
  }

  return null;
}

/**
 * 取得目前可用的批次修改欄位
 */
async function getBatchFields(): Promise<BatchField[]> {
  const contextMenu = await openContextMenu();
  const fields = readBatchFields(contextMenu);
  closeContextMenu();

  return fields;
}

// 監聽來自 popup 的訊息
chrome.runtime.onMessage.addListener((request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void) => {
  if (request.action === "getSelectedData") {
    const data = getSelectedTableData();
    sendResponse({ data });
  } else if (request.action === "toggleVisibility") {
    toggleUnselectedRows(request.showOnlySelected);
    sendResponse({ success: true });
  } else if (request.action === "getBatchFields") {
    (async () => {
      try {
        sendResponse({ fields: await getBatchFields() });
      } catch (error) {
        sendResponse({ success: false, error: toErrorMessage(error) });
      }
    })();
    return true; // 保持連接開啟，等待非同步回應
  } else if (request.action === "applyBatchShortcut") {
    (async () => {
      try {
        const contextMenu = await openContextMenu();
        const link = findShortcutLink(contextMenu, request.param, request.paramValue);

        if (!link) {
          closeContextMenu();
          sendResponse({ success: false, error: "這個頁面的右鍵選單中找不到該選項" });
          return;
        }

        // 點擊會送出 bulk_update 並使頁面重新載入，本 content script 隨即失效，
        // 因此先回覆再點，讓側邊欄知道指令已成功送出。
        sendResponse({ success: true });
        setTimeout(() => link.click(), 0);
      } catch (error) {
        sendResponse({ success: false, error: toErrorMessage(error) });
      }
    })();
    return true; // 保持連接開啟，等待非同步回應
  }
  return true; // 保持連接開啟
});
