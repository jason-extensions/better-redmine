<script setup lang="ts">
import AppButton from "@/components/app/AppButton.vue";
import AppInput from "@/components/app/AppInput.vue";
import { useGetCurrentTabId } from "@/composables/useGetCurrentTabId";
import { useSettingStorage } from "@/composables/useSetting";
import { FORMAT_TEMPLATES_SETTING, FORMAT_TEMPLATE_SETTING, ISSUE_LINK_TEMPLATE_SETTING } from "@/constants/settings";
import { copyText } from "@/helpers/clipboard";
import { applyTemplate } from "@/helpers/formatTemplate";
import { insertAt } from "@/helpers/textInput";
import type { FormatTemplate } from "@/types/format";
import { v4 as uuidv4 } from "uuid";
import { computed, nextTick, onUnmounted, ref } from "vue";

/** 模板中可用的關鍵字，對應 RedmineItem 的欄位 */
const FORMAT_KEYWORDS = ["project", "tracker", "status", "subject", "url", "id", "date", "replies", "issues"] as const;

/** 「已複製」提示停留的時間 */
const COPIED_FEEDBACK_MS = 1500;

const UNREACHABLE_PAGE_MESSAGE = "無法與頁面溝通，請確認目前分頁停留在 Redmine 頁面";
const COPY_FAILED_MESSAGE = "複製失敗，請手動選取內容後複製";

const { data: formatTemplate } = useSettingStorage(FORMAT_TEMPLATE_SETTING);
const { data: savedTemplates } = useSettingStorage(FORMAT_TEMPLATES_SETTING);
const { data: issueLinkTemplate } = useSettingStorage(ISSUE_LINK_TEMPLATE_SETTING);

const result = ref("");
const errorMessage = ref("");
const newTemplateName = ref("");
const templateInput = ref<InstanceType<typeof AppInput> | null>(null);

const { getCurrentTabId } = useGetCurrentTabId();

const sendToPage = async (message: Message): Promise<MessageResponse> => {
  const tabId = await getCurrentTabId();
  return await chrome.tabs.sendMessage(tabId, message);
};

/* ---------- 複製 ---------- */

type CopyTarget = "result" | "issueLink";

const copiedTarget = ref<CopyTarget | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const flashCopied = (target: CopyTarget) => {
  copiedTarget.value = target;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copiedTarget.value = null), COPIED_FEEDBACK_MS);
};

onUnmounted(() => clearTimeout(copiedTimer));

/** 複製並顯示結果，回傳是否成功 */
const copyAndReport = async (text: string, target: CopyTarget) => {
  if (await copyText(text)) {
    flashCopied(target);
    return true;
  }

  errorMessage.value = COPY_FAILED_MESSAGE;
  return false;
};

/* ---------- 議題連結 ---------- */

const copyIssueLink = async () => {
  errorMessage.value = "";

  try {
    const response = await sendToPage({ action: "getCurrentIssue" });

    if (!response?.issue) {
      errorMessage.value = response?.error || "無法取得這個頁面的議題資料";
      return;
    }

    await copyAndReport(applyTemplate(issueLinkTemplate.value, { ...response.issue }), "issueLink");
  } catch (error) {
    console.error("Error:", error);
    errorMessage.value = UNREACHABLE_PAGE_MESSAGE;
  }
};

/* ---------- 模板編輯 ---------- */

/**
 * 把關鍵字插入模板輸入框的游標位置。
 * 取不到底層 input 時退而附加到最後，至少不會讓點擊沒有反應。
 */
const insertKeyword = async (keyword: string) => {
  const token = `{${keyword}}`;
  const input = templateInput.value?.inputRef;

  if (!input) {
    formatTemplate.value += token;
    return;
  }

  const { value, cursor } = insertAt(formatTemplate.value, input.selectionStart ?? 0, input.selectionEnd ?? 0, token);
  formatTemplate.value = value;

  // 等 v-model 把新值寫回 DOM 後再定位游標，否則會被覆寫
  await nextTick();
  input.focus();
  input.setSelectionRange(cursor, cursor);
};

/* ---------- 模板收藏 ---------- */

const isDuplicateTemplate = computed(() => savedTemplates.value.some((item) => item.template === formatTemplate.value));

const canSaveTemplate = computed(
  () => !!newTemplateName.value.trim() && !!formatTemplate.value.trim() && !isDuplicateTemplate.value
);

const saveButtonLabel = computed(() => {
  if (isDuplicateTemplate.value) return "這個模板已經收藏過了";
  return "存起來";
});

const saveTemplate = () => {
  if (!canSaveTemplate.value) return;

  savedTemplates.value.push({
    id: uuidv4(),
    name: newTemplateName.value.trim(),
    template: formatTemplate.value,
  });

  newTemplateName.value = "";
};

const applySavedTemplate = (item: FormatTemplate) => {
  formatTemplate.value = item.template;
};

const removeTemplate = (id: string) => {
  savedTemplates.value = savedTemplates.value.filter((item) => item.id !== id);
};

/* ---------- 格式化 ---------- */

const formatData = async () => {
  errorMessage.value = "";

  try {
    const response = await sendToPage({ action: "getSelectedData" });

    if (!response?.data?.length) {
      errorMessage.value = "這個頁面上找不到議題列表";
      return;
    }

    result.value = response.data.map((item) => applyTemplate(formatTemplate.value, item)).join("\n");
  } catch (error) {
    console.error("Error:", error);
    errorMessage.value = UNREACHABLE_PAGE_MESSAGE;
  }
};

const copyResult = async () => {
  errorMessage.value = "";
  if (result.value) await copyAndReport(result.value, "result");
};
</script>

<template>
  <div class="issue-link">
    <AppButton @click="copyIssueLink">
      {{ copiedTarget === "issueLink" ? "已複製 ✓" : "複製本頁議題連結" }}
    </AppButton>
    <p class="hint">在單一議題頁面上按下，直接複製成 markdown 連結</p>
  </div>

  <div class="format-input">
    <label for="format">格式化模板</label>
    <AppInput ref="templateInput" id="format" v-model="formatTemplate" placeholder="- [#{id}]({url})" :spellcheck="false" />
  </div>

  <div class="keywords">
    💡 可用關鍵字（點擊插入）：
    <button v-for="keyword in FORMAT_KEYWORDS" :key="keyword" type="button" class="keyword" @click="insertKeyword(keyword)">
      {{ "{" }}{{ keyword }}{{ "}" }}
    </button>
  </div>

  <div class="template-library">
    <label>模板收藏</label>

    <div v-if="!savedTemplates.length" class="empty-state">尚未收藏模板，可將目前的模板存起來重複使用</div>

    <div v-for="item in savedTemplates" :key="item.id" class="saved-template">
      <button type="button" class="saved-template-apply" :title="item.template" @click="applySavedTemplate(item)">
        <span class="saved-template-name">{{ item.name }}</span>
        <span class="saved-template-preview">{{ item.template }}</span>
      </button>
      <button type="button" class="delete-button" :aria-label="`刪除 ${item.name}`" @click="removeTemplate(item.id)">
        <span class="delete-icon">✕</span>
      </button>
    </div>

    <div class="save-template">
      <AppInput v-model="newTemplateName" placeholder="為目前的模板取個名字" :spellcheck="false" />
      <AppButton :disabled="!canSaveTemplate" @click="saveTemplate">{{ saveButtonLabel }}</AppButton>
    </div>
  </div>

  <AppButton @click="formatData">格式化</AppButton>

  <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

  <div class="result">
    <div class="result-header">
      <label for="result">格式化結果</label>
      <button type="button" class="copy-button" :disabled="!result" @click="copyResult">
        {{ copiedTarget === "result" ? "已複製 ✓" : "複製" }}
      </button>
    </div>
    <textarea id="result" v-model="result" readonly placeholder="格式化結果將顯示在這裡..."></textarea>
  </div>
</template>

<style scoped>
.issue-link {
  margin-bottom: 1.25rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.hint {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--secondary-text);
  line-height: 1.5;
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

.keyword {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  margin: 0.125rem;
  background-color: #e5e7eb;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.15s;
}

.keyword:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.template-library {
  margin-bottom: 1.25rem;
}

.template-library > label {
  margin-bottom: 0.5rem;
}

.empty-state {
  padding: 0.75rem;
  border: 1px dashed var(--border-color);
  border-radius: 0.75rem;
  font-size: 0.75rem;
  color: var(--secondary-text);
  text-align: center;
}

.saved-template {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.saved-template-apply {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.saved-template-apply:hover {
  border-color: var(--primary-color);
  background-color: #f3f4f6;
}

.saved-template-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-color);
}

.saved-template-preview {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.6875rem;
  color: var(--secondary-text);
}

.delete-button {
  flex-shrink: 0;
  width: 2rem;
  background-color: var(--error-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  color: var(--error-color);
  cursor: pointer;
  transition: all 0.15s;
}

.delete-button:hover {
  background-color: var(--error-hover);
  border-color: var(--error-color);
}

.delete-icon {
  font-size: 0.75rem;
}

.save-template {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.save-template :deep(input) {
  flex: 1;
  min-width: 0;
}

.save-template .app-button {
  flex-shrink: 0;
  width: auto;
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

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.copy-button {
  padding: 0.25rem 0.75rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.15s;
}

.copy-button:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.copy-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
