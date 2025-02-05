<script setup lang="ts">
import AppButton from "@/components/app/AppButton.vue";
import AppInput from "@/components/app/AppInput.vue";
import { useGetCurrentTabId } from "@/composables/useGetCurrentTabId";
import { ref } from "vue";

const formatTemplate = ref("- [#{id}]({url})");
const showOnlySelected = ref(false);
const result = ref("");

const { getCurrentTabId } = useGetCurrentTabId();

const formatData = async () => {
  try {
    const tabId = await getCurrentTabId();

    chrome.tabs.sendMessage(tabId, { action: "getSelectedData" }, (response: MessageResponse) => {
      if (chrome.runtime.lastError) {
        console.error("Error:", chrome.runtime.lastError);
        return;
      }

      if (response?.data) {
        result.value = response.data
          .map((item: RedmineItem) => {
            let formatted = formatTemplate.value;
            Object.entries(item).forEach(([key, value]) => {
              formatted = formatted.replace(`{${key}}`, String(value));
            });
            return formatted;
          })
          .join("\n");
      }
    });
  } catch (error) {
    console.error("Error:", error);
  }
};

const toggleVisibility = async () => {
  try {
    const tabId = await getCurrentTabId();

    chrome.tabs.sendMessage(
      tabId,
      {
        action: "toggleVisibility",
        showOnlySelected: showOnlySelected.value,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error:", chrome.runtime.lastError);
        }
      }
    );
  } catch (error) {
    console.error("Error:", error);
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

label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
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
