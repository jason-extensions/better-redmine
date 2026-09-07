export interface CopyDeps {
  /** 非同步 Clipboard API；環境不支援時為 null */
  writeToClipboard: ((text: string) => Promise<void>) | null;
  /** 備援管道，回傳是否成功 */
  fallbackCopy: (text: string) => boolean;
}

/**
 * 以離屏 textarea 搭配 execCommand 複製。
 *
 * execCommand 已被標示為過時，這裡只當備援：側邊欄若因為沒有取得焦點
 * 而讓 Clipboard API 被拒絕，這條路仍然可用。
 */
const fallbackCopy = (text: string): boolean => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  // 放在畫面外並隱藏，避免插入時造成捲動或閃爍
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
};

const createDefaultDeps = (): CopyDeps => ({
  writeToClipboard:
    typeof navigator !== "undefined" && navigator.clipboard ? (text: string) => navigator.clipboard.writeText(text) : null,
  fallbackCopy,
});

/**
 * 複製文字到剪貼簿，回傳是否成功。
 *
 * 優先使用 Clipboard API，被拒絕或環境不支援時改走備援管道。
 */
export async function copyText(text: string, deps: CopyDeps = createDefaultDeps()): Promise<boolean> {
  if (deps.writeToClipboard) {
    try {
      await deps.writeToClipboard(text);
      return true;
    } catch {
      // 交給備援管道再試一次
    }
  }

  return deps.fallbackCopy(text);
}
