<script setup lang="ts">
import AppButton from "@/components/app/AppButton.vue";
import AppInput from "@/components/app/AppInput.vue";
import { useGetCurrentTabId } from "@/composables/useGetCurrentTabId";
import { useSettingStorage } from "@/composables/useSetting";
import { FORMAT_TEMPLATE_SETTING } from "@/constants/settings";
import { ref } from "vue";

const { data: formatTemplate } = useSettingStorage(FORMAT_TEMPLATE_SETTING);
const showOnlySelected = ref(false);
const result = ref("");
const errorMessage = ref("");

const { getCurrentTabId } = useGetCurrentTabId();

/**
 * 以模板格式化單筆議題。
 * 用 split/join 做字面值取代：同一個關鍵字可在模板中重複出現，
 * 且議題內容中的 $& 等字元不會被當成特殊取代語法。
 */
const formatItem = (item: RedmineItem) =>
  Object.entries(item).reduce(
    (formatted, [key, value]) => formatted.split(`{${key}}`).join(String(value)),
    formatTemplate.value
  );

const UNREACHABLE_PAGE_MESSAGE = "無法與頁面溝通，請確認目前分頁停留在 Redmine 的議題列表頁";

const formatData = async () => {
  errorMessage.value = "";

  try {
    const tabId = await getCurrentTabId();
    const response: MessageResponse = await chrome.tabs.sendMessage(tabId, { action: "getSelectedData" });

    if (!response?.data?.length) {
      errorMessage.value = "這個頁面上找不到議題列表";
      return;
    }

    result.value = response.data.map(formatItem).join("\n");
  } catch (error) {
    console.error("Error:", error);
    errorMessage.value = UNREACHABLE_PAGE_MESSAGE;
  }
};

const toggleVisibility = async () => {
  errorMessage.value = "";

  try {
    const tabId = await getCurrentTabId();
    await chrome.tabs.sendMessage(tabId, {
      action: "toggleVisibility",
      showOnlySelected: showOnlySelected.value,
    });
  } catch (error) {
    console.error("Error:", error);
    errorMessage.value = UNREACHABLE_PAGE_MESSAGE;
    // 頁面沒有套用，把開關切回實際狀態
    showOnlySelected.value = !showOnlySelected.value;
  }
};
</script>

<template>
  <div class="visibility-toggle">
    <label class="toggle">
      <input type="checkbox" v-model="showOnlySelected" @change="toggleVisibility" />
      <span class="toggle-label">僅顯示已選取項目</span>
    </label>
  </div>

  <div class="format-input">
    <label for="format">格式化模板</label>
    <AppInput id="format" v-model="formatTemplate" placeholder="- [#{id}]({url})" :spellcheck="false" />
  </div>

  <div class="keywords">
    💡 可用關鍵字：
    <code v-for="keyword in ['project', 'tracker', 'status', 'subject', 'url', 'id', 'date', 'replies', 'issues']" :key="keyword">
      {{ "{" }}{{ keyword }}{{ "}" }}
    </code>
  </div>

  <AppButton @click="formatData">格式化</AppButton>

  <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

  <div class="result">
    <textarea id="result" v-model="result" readonly placeholder="格式化結果將顯示在這裡..."></textarea>
  </div>
</template>

<style scoped>
.visibility-toggle {
  margin-bottom: 1.25rem;
  padding: 0.75rem;
  background-color: var(--input-bg);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.visibility-toggle:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
}

.toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle input[type="checkbox"] {
  position: relative;
  width: 2.5rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  appearance: none;
  background-color: #e5e7eb;
  border-radius: 1rem;
  transition: all 0.3s;
  cursor: pointer;
}

.toggle input[type="checkbox"]:checked {
  background-color: var(--success-color);
}

.toggle input[type="checkbox"]::before {
  content: "";
  position: absolute;
  left: 0.125rem;
  top: 0.125rem;
  width: 1rem;
  height: 1rem;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle input[type="checkbox"]:checked::before {
  transform: translateX(1.25rem);
}

.toggle-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color);
  user-select: none;
}

.format-input {
  margin-bottom: 1rem;
}

.format-input label {
  margin-bottom: 0.5rem;
}

label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color);
}

.keywords {
  font-size: 0.75rem;
  color: var(--secondary-text);
  margin-bottom: 1.25rem;
  padding: 0.75rem;
  background-color: var(--input-bg);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
}

.keywords code {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  margin: 0.125rem;
  background-color: #e5e7eb;
  border-radius: 0.375rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  color: var(--text-color);
}

.error-message {
  margin: 1rem 0 0;
  padding: 0.75rem;
  border: 1px solid var(--error-color);
  border-radius: 0.75rem;
  background-color: var(--error-bg);
  color: var(--error-color);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.result {
  margin-top: 1rem;
}

#result {
  width: 100%;
  height: 120px;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  background-color: var(--input-bg);
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

#result:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
</style>
