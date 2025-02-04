/**
 * 格式化選中的資料
 * @param {Object[]} data - 選中的資料
 * @param {string} template - 格式化模板
 * @returns {string} 格式化後的文字
 */
function formatData(data, template) {
  return data.map(item => {
    let result = template;
    Object.keys(item).forEach(key => {
      result = result.replace(`{${key}}`, item[key]);
    });
    return result;
  }).join('\n');
}

document.addEventListener('DOMContentLoaded', () => {
  const formatBtn = document.getElementById('format-btn');
  const formatInput = document.getElementById('format');
  const resultArea = document.getElementById('result');
  const visibilityToggle = document.getElementById('visibility-toggle');

  // 設置預設格式
  formatInput.value = '- [#{id}]({url})';

  // 處理可見性切換
  visibilityToggle.addEventListener('change', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { 
      action: 'toggleVisibility',
      showOnlySelected: visibilityToggle.checked 
    });
  });

  formatBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'getSelectedData' }, response => {
      if (response && response.data) {
        const formattedText = formatData(response.data, formatInput.value);
        resultArea.value = formattedText;
      }
    });
  });
}); 