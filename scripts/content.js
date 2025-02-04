/**
 * @constant {string} BASE_URL - Redmine 系統的基礎 URL
 */
const BASE_URL = 'https://redmine.twjoin.com';

/**
 * @constant {string} HIDDEN_CLASS - 隱藏列的 CSS class
 */
const HIDDEN_CLASS = 'redmine-formatter-hidden';

// 在文件頭部插入所需的 CSS 樣式
const style = document.createElement('style');
style.textContent = `
  .${HIDDEN_CLASS} {
    display: none !important;
  }
`;
document.head.appendChild(style);

/**
 * 獲取表格欄位的索引
 * @param {HTMLTableElement} table - 表格元素
 * @returns {Object} 欄位索引對象
 */
function getColumnIndexes(table) {
  const headerCells = table.querySelectorAll('th');
  const indexes = {
    project: -1,
    tracker: -1,
    status: -1,
    subject: -1
  };

  headerCells.forEach((cell, index) => {
    const text = cell.textContent.trim();
    switch (text) {
      case '專案':
        indexes.project = index;
        break;
      case '追蹤標籤':
        indexes.tracker = index;
        break;
      case '狀態':
        indexes.status = index;
        break;
      case '主旨':
        indexes.subject = index;
        break;
    }
  });

  return indexes;
}

/**
 * 從 URL 中提取 issue ID
 * @param {string} url - issue 的完整 URL
 * @returns {string} issue ID
 */
function extractIssueId(url) {
  return url.split('/').pop() || '';
}

/**
 * 獲取表格中被選中的資料
 * @returns {Object[]} 選中的資料陣列
 */
function getSelectedTableData() {
  const table = document.querySelector('#content table.issues');
  if (!table) return [];

  const columnIndexes = getColumnIndexes(table);
  const selectedRows = Array.from(table.querySelectorAll('tr'))
    .filter(row => row.querySelector('td input[type="checkbox"]:checked'));

  return selectedRows.map(row => {
    const cells = row.getElementsByTagName('td');
    const subjectCell = cells[columnIndexes.subject];
    const subjectLink = subjectCell?.querySelector('a');
    const fullUrl = subjectLink ? `${BASE_URL}${subjectLink.getAttribute('href')}` : '';
    
    return {
      project: cells[columnIndexes.project]?.textContent?.trim() || '',
      tracker: cells[columnIndexes.tracker]?.textContent?.trim() || '',
      status: cells[columnIndexes.status]?.textContent?.trim() || '',
      subject: subjectCell?.textContent?.trim() || '',
      url: fullUrl,
      id: extractIssueId(fullUrl)
    };
  });
}

/**
 * 切換未選中列的顯示狀態
 * @param {boolean} showOnlySelected - 是否只顯示選中的列
 */
function toggleUnselectedRows(showOnlySelected) {
  const table = document.querySelector('#content table.issues');
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const isSelected = row.querySelector('td input[type="checkbox"]:checked');
    if (!isSelected) {
      row.classList.toggle(HIDDEN_CLASS, showOnlySelected);
    }
  });
}

// 監聽來自 popup 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedData') {
    const data = getSelectedTableData();
    sendResponse({ data });
  } else if (request.action === 'toggleVisibility') {
    toggleUnselectedRows(request.showOnlySelected);
    sendResponse({ success: true });
  }
}); 