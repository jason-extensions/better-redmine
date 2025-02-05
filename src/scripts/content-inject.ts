// 建立一個新的 script 元素
const script = document.createElement("script");
script.src = chrome.runtime.getURL("scripts/content.js");
script.type = "module";

// 將腳本注入到頁面中
const head = document.head || document.documentElement;
head.insertBefore(script, head.lastChild);
