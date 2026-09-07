<script setup lang="ts">
import { ref } from "vue";
import AppButton from "@/components/app/AppButton.vue";
import { SETTING_DEFINITIONS } from "@/constants/settings";
import {
  buildSettingsFile,
  fromStorageEntries,
  parseSettingsFile,
  toStorageEntries,
  type ImportPlan,
  type ResetReason,
} from "@/helpers/settingsTransfer";

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

const fileInput = ref<HTMLInputElement | null>(null);
const status = ref<StatusMessage | null>(null);
const busy = ref(false);

const SETTING_KEYS = SETTING_DEFINITIONS.map((definition) => definition.key);
const SETTING_LABELS = new Map(SETTING_DEFINITIONS.map((definition) => [definition.key, definition.label]));

const RESET_REASON_LABEL: Record<ResetReason, string> = {
  missing: "設定檔中沒有這一項",
  invalid: "設定檔中的內容無效",
};

const labelOf = (key: string) => SETTING_LABELS.get(key) ?? key;

const toErrorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * 觸發瀏覽器下載
 * @param fileName 檔名
 * @param content 檔案內容
 */
const downloadJson = (fileName: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // 立即 revoke 有機會中斷下載，延後釋放
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const exportSettings = async () => {
  busy.value = true;
  status.value = null;

  try {
    const entries = await chrome.storage.sync.get(SETTING_KEYS);
    const file = buildSettingsFile(fromStorageEntries(entries), new Date().toISOString());
    const stamp = new Date().toISOString().slice(0, 10);

    downloadJson(`better-redmine-settings-${stamp}.json`, JSON.stringify(file, null, 2));
    status.value = { type: "success", text: `已匯出 ${SETTING_KEYS.length} 項設定` };
  } catch (error) {
    status.value = { type: "error", text: `匯出失敗：${toErrorText(error)}` };
  } finally {
    busy.value = false;
  }
};

/**
 * 組出匯入前的確認訊息
 * @param plan 匯入計畫
 */
const buildConfirmMessage = (plan: ImportPlan) => {
  const lines = ["匯入後會完全取代目前的設定，確定要繼續嗎？", ""];

  if (plan.applied.length) {
    lines.push(`將套用：${plan.applied.map(labelOf).join("、")}`);
  }

  plan.resetToDefault.forEach(({ key, reason }) => {
    lines.push(`將重設為預設值：${labelOf(key)}（${RESET_REASON_LABEL[reason]}）`);
  });

  if (plan.ignored.length) {
    lines.push(`將忽略不認得的項目：${plan.ignored.join("、")}`);
  }

  if (plan.warnings.length) {
    lines.push("", ...plan.warnings);
  }

  return lines.join("\n");
};

const importSettings = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // 清空以便重複選取同一個檔案
  input.value = "";
  if (!file) return;

  status.value = null;
  const result = parseSettingsFile(await file.text());

  if (!result.ok) {
    status.value = { type: "error", text: result.error };
    return;
  }

  if (!confirm(buildConfirmMessage(result.plan))) return;

  busy.value = true;
  try {
    // 直接寫入 storage，才能把配額不足之類的錯誤顯示出來
    await chrome.storage.sync.set(toStorageEntries(result.plan.values));
    status.value = { type: "success", text: `已匯入設定，套用 ${result.plan.applied.length} 項` };
  } catch (error) {
    status.value = { type: "error", text: `匯入失敗：${toErrorText(error)}` };
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <div class="settings-panel">
    <section class="section">
      <h3 class="section-title">設定備份</h3>
      <p class="hint">匯出後可在另一台瀏覽器匯入，涵蓋：{{ SETTING_DEFINITIONS.map((d) => d.label).join("、") }}。</p>

      <div class="actions">
        <AppButton :disabled="busy" @click="exportSettings">匯出設定</AppButton>
        <AppButton :disabled="busy" @click="fileInput?.click()">匯入設定</AppButton>
      </div>

      <input ref="fileInput" type="file" accept="application/json,.json" class="file-input" @change="importSettings" />

      <p class="hint warning">匯入會完全取代目前的設定，執行前會再次確認。</p>
    </section>

    <p v-if="status" class="status" :class="status.type">{{ status.text }}</p>
  </div>
</template>

<style scoped>
.settings-panel {
  padding: 1rem;
}

.section {
  margin-bottom: 1.5rem;
}

.section-title {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color);
}

.hint {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--secondary-text);
}

.hint.warning {
  color: var(--error-color);
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.file-input {
  display: none;
}

.status {
  margin: 0;
  padding: 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  word-break: break-all;
}

.status.success {
  background-color: var(--input-bg);
  border: 1px solid var(--success-color);
  color: var(--text-color);
}

.status.error {
  background-color: var(--error-bg);
  border: 1px solid var(--error-color);
  color: var(--error-color);
}
</style>
