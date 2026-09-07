import { getCurrentScope, onScopeDispose, ref, watch } from "vue";
import type { Ref } from "vue";

interface UseStorageOptions<T> {
  /** Storage 的鍵值 */
  key: string;
  /** 預設值 */
  defaultValue: T;
  /** 是否使用同步儲存空間，預設為 true */
  sync?: boolean;
}

/**
 * 用於管理 Chrome Storage 的 Composable
 * @param options Storage 配置選項
 * @returns Storage 的響應式值和操作方法
 */
export function useStorage<T>({ key, defaultValue, sync = true }: UseStorageOptions<T>) {
  const data = ref<T>(defaultValue) as Ref<T>;

  // 檢查是否在 Chrome Extension 環境中
  const isExtensionContext = typeof chrome !== "undefined" && chrome.storage;
  if (!isExtensionContext) {
    console.warn("useStorage: Not in a Chrome Extension context, using local state only");
    return {
      data,
      load: async () => {},
      save: async () => {},
      reset: () => {
        data.value = defaultValue;
      },
    };
  }

  const areaName = sync ? "sync" : "local";
  const storage = chrome.storage[areaName];

  /**
   * data 目前對應的 storage 內容。
   * 用來辨識「storage 變更 → 更新 data」造成的回音，避免再寫回 storage 形成無限迴圈。
   */
  let serialized = JSON.stringify(defaultValue);

  /**
   * 套用來自 storage 的內容
   * @param raw storage 中的原始字串
   */
  const applyRawValue = (raw: unknown) => {
    if (typeof raw !== "string") {
      serialized = JSON.stringify(defaultValue);
      data.value = defaultValue;
      return;
    }

    if (raw === serialized) return;

    try {
      const parsed = JSON.parse(raw);
      serialized = raw;
      data.value = parsed;
    } catch (error) {
      console.error("Failed to parse data from storage:", error);
    }
  };

  /**
   * 從 Storage 載入資料
   */
  const load = async () => {
    try {
      const result = await storage.get(key);
      if (result[key] !== undefined) applyRawValue(result[key]);
    } catch (error) {
      console.error("Failed to load from storage:", error);
    }
  };

  /**
   * 儲存資料到 Storage
   */
  const save = async () => {
    const payload = JSON.stringify(data.value);
    try {
      await storage.set({ [key]: payload });
      serialized = payload;
    } catch (error) {
      console.error("Failed to save to storage:", error);
    }
  };

  /**
   * 重設資料為預設值
   */
  const reset = () => {
    data.value = defaultValue;
    save();
  };

  // 監聽資料變化自動儲存；與 storage 內容一致時不重複寫入
  watch(
    () => data.value,
    () => {
      if (JSON.stringify(data.value) === serialized) return;
      save();
    },
    { deep: true }
  );

  // 監聽外部變更（其他裝置同步、匯入設定、其他面板寫入）
  const handleStorageChanged = (changes: { [name: string]: chrome.storage.StorageChange }, area: string) => {
    if (area !== areaName || !(key in changes)) return;
    applyRawValue(changes[key].newValue);
  };

  chrome.storage.onChanged.addListener(handleStorageChanged);

  if (getCurrentScope()) {
    onScopeDispose(() => chrome.storage.onChanged.removeListener(handleStorageChanged));
  }

  // 初始化時載入資料
  load();

  return {
    data,
    load,
    save,
    reset,
  };
}
