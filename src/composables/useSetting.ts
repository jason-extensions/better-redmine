import { useStorage } from "./useStorage";
import { SITE_URL_SETTING, type SettingDefinition } from "@/constants/settings";

/**
 * 依設定登錄表建立響應式設定。
 * 預設值每次都重新建立，避免多個使用處共用同一個可變物件。
 */
export function useSettingStorage<T>(definition: SettingDefinition<T>) {
  return useStorage<T>({ key: definition.key, defaultValue: definition.createDefaultValue() });
}

export function useSetting() {
  const { data: siteUrl } = useSettingStorage(SITE_URL_SETTING);

  return {
    siteUrl,
  };
}
