import { ref, watch } from "vue";
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

  const storage = sync ? chrome.storage.sync : chrome.storage.local;

  /**
   * 從 Storage 載入資料
   */
  const load = async () => {
    try {
      const result = await storage.get(key);
      if (result[key] !== undefined) {
        try {
          data.value = JSON.parse(result[key]);
        } catch (error) {
          console.error("Failed to parse data from storage:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load from storage:", error);
    }
  };

  /**
   * 儲存資料到 Storage
   */
  const save = async () => {
    try {
      await storage.set({ [key]: JSON.stringify(data.value) });
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

  // 監聽資料變化自動儲存
  watch(
    () => data.value,
    () => save(),
    { deep: true }
  );

  // 初始化時載入資料
  load();

  return {
    data,
    load,
    save,
    reset,
  };
}
