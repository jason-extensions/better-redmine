<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { v4 as uuidv4 } from "uuid";
import AppSelect from "./AppSelect.vue";
import AppButton from "./app/AppButton.vue";
import { useGetCurrentTabId } from "@/composables/useGetCurrentTabId";
import { useSettingStorage } from "@/composables/useSetting";
import { BATCH_SHORTCUTS_SETTING } from "@/constants/settings";
import type { BatchField, BatchShortcut } from "@/types/batch";

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

const { getCurrentTabId } = useGetCurrentTabId();
const { data: shortcuts } = useSettingStorage(BATCH_SHORTCUTS_SETTING);

const fields = ref<BatchField[]>([]);
const selectedFieldLabel = ref("");
const selectedOptionKey = ref("");
const status = ref<StatusMessage | null>(null);
const loadingFields = ref(false);
const applyingId = ref("");

const UNREACHABLE_PAGE_MESSAGE = "無法與頁面溝通，請確認目前分頁停留在 Redmine 的議題列表頁";

/** 選項在下拉選單中的值；param 與 paramValue 一起才能唯一識別 */
const toOptionKey = (param: string, paramValue: string) => `${param}=${paramValue}`;

const fieldOptions = computed(() => fields.value.map((field) => ({ label: field.label, value: field.label })));

const selectedField = computed(() => fields.value.find((field) => field.label === selectedFieldLabel.value));

const valueOptions = computed(
  () => selectedField.value?.options.map((option) => ({ label: option.label, value: toOptionKey(option.param, option.paramValue) })) ?? []
);

const selectedOption = computed(() =>
  selectedField.value?.options.find((option) => toOptionKey(option.param, option.paramValue) === selectedOptionKey.value)
);

const isDuplicateShortcut = computed(() =>
  shortcuts.value.some(
    (shortcut) => shortcut.param === selectedOption.value?.param && shortcut.paramValue === selectedOption.value?.paramValue
  )
);

// 換欄位時清掉上一個欄位殘留的選擇
watch(selectedFieldLabel, () => {
  selectedOptionKey.value = "";
});

const sendToPage = async (message: Message) => {
  const tabId = await getCurrentTabId();
  const response: MessageResponse = await chrome.tabs.sendMessage(tabId, message);
  if (response?.success === false) throw new Error(response.error || "未知錯誤");

  return response;
};

const toErrorText = (error: unknown) => (error instanceof Error ? error.message : UNREACHABLE_PAGE_MESSAGE);

const loadFields = async () => {
  loadingFields.value = true;
  status.value = null;

  try {
    const response = await sendToPage({ action: "getBatchFields" });
    fields.value = response.fields ?? [];
    selectedFieldLabel.value = "";
    selectedOptionKey.value = "";

    if (!fields.value.length) status.value = { type: "error", text: "右鍵選單中沒有可批次修改的欄位" };
  } catch (error) {
    fields.value = [];
    status.value = { type: "error", text: toErrorText(error) };
  } finally {
    loadingFields.value = false;
  }
};

const addShortcut = () => {
  if (!selectedField.value || !selectedOption.value || isDuplicateShortcut.value) return;

  shortcuts.value.push({
    id: uuidv4(),
    fieldLabel: selectedField.value.label,
    valueLabel: selectedOption.value.label,
    param: selectedOption.value.param,
    paramValue: selectedOption.value.paramValue,
  });

  selectedOptionKey.value = "";
};

const removeShortcut = (id: string) => {
  shortcuts.value = shortcuts.value.filter((shortcut) => shortcut.id !== id);
};

const applyShortcut = async (shortcut: BatchShortcut) => {
  applyingId.value = shortcut.id;
  status.value = null;

  try {
    await sendToPage({ action: "applyBatchShortcut", param: shortcut.param, paramValue: shortcut.paramValue });
    // 送出後頁面會重新載入，無法在此確認結果
    status.value = { type: "success", text: "已送出更新，頁面重新載入後即為最新狀態" };
  } catch (error) {
    status.value = { type: "error", text: toErrorText(error) };
  } finally {
    applyingId.value = "";
  }
};
</script>

<template>
  <div class="batch-panel">
    <div class="shortcut-list">
      <div v-if="!shortcuts.length" class="empty-state">尚未建立快捷鍵，請先在下方讀取可用選項</div>

      <div v-for="shortcut in shortcuts" :key="shortcut.id" class="shortcut">
        <button class="shortcut-apply" :disabled="!!applyingId" @click="applyShortcut(shortcut)">
          <span class="shortcut-field">{{ shortcut.fieldLabel }}</span>
          <span class="shortcut-value">{{ shortcut.valueLabel }}</span>
        </button>
        <button class="delete-button" @click="removeShortcut(shortcut.id)">
          <span class="delete-icon">✕</span>
        </button>
      </div>
    </div>

    <div class="builder">
      <p class="hint">在 Redmine 頁面勾選任一議題後，讀取該頁面可用的欄位與選項。</p>

      <AppButton :loading="loadingFields" @click="loadFields">讀取可用選項</AppButton>

      <template v-if="fields.length">
        <div class="form-group">
          <label>欄位</label>
          <AppSelect v-model="selectedFieldLabel" :options="fieldOptions" placeholder="請選擇欄位" />
        </div>

        <div class="form-group">
          <label>值</label>
          <AppSelect v-model="selectedOptionKey" :options="valueOptions" placeholder="請選擇值" :disabled="!selectedField" />
        </div>

        <AppButton :disabled="!selectedOption || isDuplicateShortcut" @click="addShortcut">
          {{ isDuplicateShortcut ? "這個快捷鍵已存在" : "新增快捷鍵" }}
        </AppButton>
      </template>
    </div>

    <p v-if="status" class="status" :class="status.type">{{ status.text }}</p>
  </div>
</template>

<style scoped>
.batch-panel {
  padding: 1rem;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.empty-state {
  text-align: center;
  color: var(--secondary-text);
  padding: 1rem;
  background-color: var(--input-bg);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  font-size: 0.8125rem;
}

.shortcut {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.shortcut-apply {
  flex: 1;
  min-width: 0;
  padding: 0.75rem;
  text-align: left;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
}

.shortcut-apply:hover:not(:disabled) {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.shortcut-apply:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.shortcut-field {
  display: block;
  font-size: 0.7rem;
  color: var(--secondary-text);
}

.shortcut-value {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.125rem;
}

.delete-button {
  padding: 0.5rem;
  background-color: var(--error-bg);
  color: var(--error-color);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.delete-button:hover {
  background-color: var(--error-hover);
  transform: translateY(-1px);
}

.delete-icon {
  font-size: 0.75rem;
  line-height: 1;
}

.builder {
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color);
}

.hint {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--secondary-text);
}

.form-group {
  margin: 1rem 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color);
}

.status {
  margin: 1.25rem 0 0;
  padding: 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.5;
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
