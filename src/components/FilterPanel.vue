<script setup lang="ts">
import AppButton from "@/components/app/AppButton.vue";
import AppInput from "@/components/app/AppInput.vue";
import { useGetCurrentTabId } from "@/composables/useGetCurrentTabId";
import { useSettingStorage } from "@/composables/useSetting";
import { FILTER_PRESETS_SETTING, FILTER_SHORTCUTS_SETTING } from "@/constants/settings";
import { navigateWithFilters, readFilterPageState } from "@/helpers/filterPage";
import type { FilterPageState } from "@/helpers/filterPage";
import {
  describeCondition,
  isCsvValueType,
  isFilterApplied,
  isSameConditionSet,
  normalizeCapabilities,
  removeFilter,
  replaceFilter,
  toggleFilter,
} from "@/helpers/redmineFilter";
import type { FilterCondition, FilterFieldCapability, FilterPreset, FilterShortcut } from "@/types/filter";
import { v4 as uuidv4 } from "uuid";
import { computed, onMounted, onUnmounted, ref } from "vue";

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

const NOT_ISSUE_LIST_MESSAGE = "目前分頁不是議題列表頁，請切換到 Redmine 的議題列表";

const { getCurrentTabId } = useGetCurrentTabId();
const { data: shortcuts } = useSettingStorage(FILTER_SHORTCUTS_SETTING);
const { data: presets } = useSettingStorage(FILTER_PRESETS_SETTING);

const pageState = ref<FilterPageState | null>(null);
const capabilities = ref<FilterFieldCapability[]>([]);
const status = ref<StatusMessage | null>(null);
const loading = ref(false);

const isNamingPreset = ref(false);
const presetLabel = ref("");

const active = computed(() => pageState.value?.active ?? []);
const isIssueList = computed(() => pageState.value?.isIssueList ?? false);
const selectedIssueIds = computed(() => pageState.value?.selectedIssueIds ?? []);

/** 值必須併成逗號字串的欄位，交給 buildFilterQuery 決定參數形式 */
const csvFields = computed(() => capabilities.value.filter((item) => isCsvValueType(item.type)).map((item) => item.field));

const fieldName = (field: string) => capabilities.value.find((item) => item.field === field)?.name ?? field;

const describe = (condition: FilterCondition) => describeCondition(condition, capabilities.value);

const toErrorText = (error: unknown) => (error instanceof Error ? error.message : "未知錯誤");

/* ---------- 讀取頁面狀態 ---------- */

const refresh = async () => {
  loading.value = true;

  try {
    const state = await readFilterPageState(await getCurrentTabId());
    pageState.value = state;
    capabilities.value = normalizeCapabilities(state.globals);
    status.value = state.isIssueList ? null : { type: "error", text: NOT_ISSUE_LIST_MESSAGE };
  } catch (error) {
    pageState.value = null;
    capabilities.value = [];
    status.value = { type: "error", text: toErrorText(error) };
  } finally {
    loading.value = false;
  }
};

// 導向後頁面會重新載入，載入完成再讀一次才拿得到新的套用狀態
const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
  if (changeInfo.status === "complete") refresh();
};

onMounted(() => {
  refresh();
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
  chrome.tabs.onActivated.addListener(refresh);
});

onUnmounted(() => {
  chrome.tabs.onUpdated.removeListener(handleTabUpdated);
  chrome.tabs.onActivated.removeListener(refresh);
});

const navigate = async (conditions: FilterCondition[]) => {
  const baseUrl = pageState.value?.baseUrl;
  if (!baseUrl) return;

  status.value = null;

  try {
    await navigateWithFilters(await getCurrentTabId(), baseUrl, conditions, csvFields.value);
  } catch (error) {
    status.value = { type: "error", text: toErrorText(error) };
  }
};

/* ---------- 套用中的篩選 ---------- */

const dropCondition = (condition: FilterCondition) =>
  navigate(active.value.filter((item) => item.field !== condition.field));

const clearAll = () => navigate([]);

/* ---------- 從套用中的條件建立快捷 ---------- */

const toCondition = (shortcut: FilterShortcut): FilterCondition => ({
  field: shortcut.field,
  operator: shortcut.operator,
  values: shortcut.values,
});

const isConditionSaved = (condition: FilterCondition) =>
  shortcuts.value.some((shortcut) => isSameConditionSet([toCondition(shortcut)], [condition]));

/** 名稱直接沿用條件描述，與清單上顯示的文字一致 */
const saveAsShortcut = (condition: FilterCondition) => {
  if (isConditionSaved(condition)) return;

  shortcuts.value.push({
    id: uuidv4(),
    label: describe(condition),
    field: condition.field,
    operator: condition.operator,
    values: [...condition.values],
  });
};

const startNamingPreset = () => {
  presetLabel.value = active.value.map(describe).join("＋");
  isNamingPreset.value = true;
};

const cancelNamingPreset = () => {
  isNamingPreset.value = false;
  presetLabel.value = "";
};

const savePreset = () => {
  const label = presetLabel.value.trim();
  if (!label) return;

  presets.value.push({
    id: uuidv4(),
    label,
    conditions: active.value.map((condition) => ({ ...condition, values: [...condition.values] })),
  });

  cancelNamingPreset();
};

/* ---------- 僅顯示已勾選 ---------- */

const selectedIssuesCondition = computed<FilterCondition | null>(() =>
  selectedIssueIds.value.length ? { field: "issue_id", operator: "=", values: selectedIssueIds.value } : null
);

const isSelectedIssuesApplied = computed(
  () => !!selectedIssuesCondition.value && isFilterApplied(active.value, selectedIssuesCondition.value)
);

/** 取代而非聯集：按下去就是只看當下勾選的那幾筆 */
const toggleSelectedIssues = () => {
  const target = selectedIssuesCondition.value;
  if (!target) return;

  navigate(isSelectedIssuesApplied.value ? removeFilter(active.value, target) : replaceFilter(active.value, target));
};

/* ---------- 套用快捷與組合 ---------- */

const isShortcutApplied = (shortcut: FilterShortcut) => isFilterApplied(active.value, toCondition(shortcut));

const applyShortcut = (shortcut: FilterShortcut) => navigate(toggleFilter(active.value, toCondition(shortcut)));

const removeShortcut = (id: string) => {
  shortcuts.value = shortcuts.value.filter((shortcut) => shortcut.id !== id);
};

const isPresetApplied = (preset: FilterPreset) => isSameConditionSet(active.value, preset.conditions);

const applyPreset = (preset: FilterPreset) => navigate(preset.conditions);

const removePreset = (id: string) => {
  presets.value = presets.value.filter((preset) => preset.id !== id);
};
</script>

<template>
  <div class="filter-panel">
    <div class="section">
      <div class="section-header">
        <label>套用中的篩選</label>
        <button v-if="active.length" type="button" class="text-button" @click="clearAll">全部清除</button>
      </div>

      <div v-if="!isIssueList" class="empty-state">{{ NOT_ISSUE_LIST_MESSAGE }}</div>
      <div v-else-if="!active.length" class="empty-state">目前沒有套用任何篩選</div>

      <template v-else>
        <div v-for="condition in active" :key="condition.field" class="condition-row">
          <span class="condition-text">{{ describe(condition) }}</span>
          <button
            type="button"
            class="icon-button"
            :class="{ saved: isConditionSaved(condition) }"
            :disabled="isConditionSaved(condition)"
            :title="isConditionSaved(condition) ? '已存成快捷' : '存成快捷'"
            :aria-label="`把 ${fieldName(condition.field)} 存成快捷`"
            @click="saveAsShortcut(condition)"
          >
            ★
          </button>
          <button
            type="button"
            class="icon-button danger"
            title="從篩選中移除"
            :aria-label="`移除 ${fieldName(condition.field)}`"
            @click="dropCondition(condition)"
          >
            ✕
          </button>
        </div>

        <button v-if="!isNamingPreset" type="button" class="text-button block" @click="startNamingPreset">
          ★ 把這整組存成組合
        </button>

        <div v-else class="preset-form">
          <AppInput v-model="presetLabel" placeholder="組合名稱" />
          <div class="preset-form-actions">
            <AppButton :disabled="!presetLabel.trim()" @click="savePreset">儲存組合</AppButton>
            <button type="button" class="text-button" @click="cancelNamingPreset">取消</button>
          </div>
        </div>
      </template>
    </div>

    <div class="section">
      <label>條件快捷</label>

      <button
        type="button"
        class="shortcut-button"
        :class="{ applied: isSelectedIssuesApplied }"
        :disabled="!isIssueList || !selectedIssueIds.length"
        @click="toggleSelectedIssues"
      >
        僅顯示已勾選
        <span class="count">{{ selectedIssueIds.length }} 筆</span>
      </button>

      <div v-for="shortcut in shortcuts" :key="shortcut.id" class="shortcut">
        <button
          type="button"
          class="shortcut-button"
          :class="{ applied: isShortcutApplied(shortcut) }"
          :disabled="!isIssueList"
          @click="applyShortcut(shortcut)"
        >
          {{ shortcut.label }}
        </button>
        <button type="button" class="delete-button" :aria-label="`刪除 ${shortcut.label}`" @click="removeShortcut(shortcut.id)">✕</button>
      </div>

      <p class="hint">
        <template v-if="shortcuts.length">點一下疊加，再點一下移除。同欄位的值會累加。</template>
        <template v-else>在上方套用中的條件按 ★，就能存成可疊加的快捷。</template>
      </p>
    </div>

    <div class="section">
      <label>組合</label>

      <div v-if="!presets.length" class="empty-state">把整組篩選存起來，就能一鍵切換視角</div>

      <div v-for="preset in presets" :key="preset.id" class="shortcut">
        <button
          type="button"
          class="shortcut-button"
          :class="{ applied: isPresetApplied(preset) }"
          :disabled="!isIssueList"
          :title="preset.conditions.map(describe).join('＋') || '清空所有篩選'"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
          <span class="count">{{ preset.conditions.length }} 個條件</span>
        </button>
        <button type="button" class="delete-button" :aria-label="`刪除 ${preset.label}`" @click="removePreset(preset.id)">✕</button>
      </div>

      <p v-if="presets.length" class="hint">點一下整組套用，會取代目前的篩選。</p>
    </div>

    <AppButton :loading="loading" @click="refresh">重新讀取頁面狀態</AppButton>

    <p v-if="status" class="status" :class="status.type">{{ status.text }}</p>

    <p class="warning">
      ⚠️ 套用篩選會一併覆寫 Redmine 記住的篩選條件。之後直接開啟議題列表時，看到的會是這裡最後套用的結果。
    </p>
  </div>
</template>

<style scoped>
.section {
  margin-bottom: 1.25rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color);
}

.section-header label {
  margin-bottom: 0;
}

.text-button {
  padding: 0;
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--secondary-text);
  cursor: pointer;
}

.text-button:hover {
  color: var(--primary-color);
}

.text-button.block {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.5rem;
  border: 1px dashed var(--border-color);
  border-radius: 0.75rem;
  text-align: center;
}

.text-button.block:hover {
  border-color: var(--primary-color);
}

.empty-state {
  padding: 0.75rem;
  border: 1px dashed var(--border-color);
  border-radius: 0.75rem;
  font-size: 0.75rem;
  color: var(--secondary-text);
  text-align: center;
  line-height: 1.5;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
  padding: 0.5rem 0.625rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
}

.condition-text {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  color: var(--text-color);
  word-break: break-all;
}

.icon-button {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: var(--secondary-text);
  cursor: pointer;
  transition: all 0.15s;
}

.icon-button:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.icon-button.saved {
  color: var(--primary-color);
  cursor: default;
}

.icon-button.danger:hover {
  border-color: var(--error-color);
  color: var(--error-color);
}

.preset-form {
  margin-top: 0.5rem;
}

.preset-form-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.shortcut {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.shortcut-button {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-color);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}

.shortcut .shortcut-button {
  margin-bottom: 0;
}

.shortcut-button:hover:not(:disabled) {
  border-color: var(--primary-color);
}

.shortcut-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.shortcut-button.applied {
  background-color: rgba(var(--primary-rgb), 0.08);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.count {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--secondary-text);
}

.shortcut-button.applied .count {
  color: var(--primary-color);
}

.delete-button {
  flex-shrink: 0;
  width: 2rem;
  background-color: var(--error-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  font-size: 0.75rem;
  color: var(--error-color);
  cursor: pointer;
  transition: all 0.15s;
}

.delete-button:hover {
  background-color: var(--error-hover);
  border-color: var(--error-color);
}

.hint {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--secondary-text);
  line-height: 1.5;
}

.status {
  margin: 1rem 0 0;
  padding: 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.status.error {
  border: 1px solid var(--error-color);
  background-color: var(--error-bg);
  color: var(--error-color);
}

.status.success {
  border: 1px solid var(--success-color);
  background-color: rgba(16, 185, 129, 0.08);
  color: var(--success-color);
}

.warning {
  margin: 1.25rem 0 0;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  background-color: var(--input-bg);
  font-size: 0.75rem;
  color: var(--secondary-text);
  line-height: 1.6;
}
</style>
