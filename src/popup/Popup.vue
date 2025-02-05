<script setup lang="ts">
import { ref } from "vue";
import TabPanel from "./components/TabPanel.vue";

const activeTab = ref("general");
const formatTemplate = ref("- [#{id}]({url})");
const showOnlySelected = ref(false);
const result = ref("");

const switchTab = (tab: string) => {
  activeTab.value = tab;
};

const formatData = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  chrome.tabs.sendMessage(tab.id, { action: "getSelectedData" }, (response: MessageResponse) => {
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
};

const toggleVisibility = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  chrome.tabs.sendMessage(tab.id, {
    action: "toggleVisibility",
    showOnlySelected: showOnlySelected.value,
  });
};
</script>

<template>
  <div class="container">
    <div class="tabs">
      <button v-for="tab in ['general', 'settings', 'about']" :key="tab" class="tab" :class="{ active: activeTab === tab }" @click="switchTab(tab)">
        {{ tab === "general" ? "一般" : tab === "settings" ? "設定" : "關於" }}
      </button>
    </div>

    <TabPanel id="general" :active-tab="activeTab">
      <div class="visibility-toggle">
        <label class="toggle">
          <input type="checkbox" v-model="showOnlySelected" @change="toggleVisibility" />
          <span class="toggle-label">僅顯示已選取項目</span>
        </label>
      </div>

      <div class="format-input">
        <label for="format">格式化模板</label>
        <input type="text" id="format" v-model="formatTemplate" placeholder="- [#{id}]({url})" spellcheck="false" />
      </div>

      <div class="keywords">
        💡 可用關鍵字：
        <code v-for="keyword in ['project', 'tracker', 'status', 'subject', 'url', 'id']" :key="keyword"> {{ "{" }}{{ keyword }}{{ "}" }} </code>
      </div>

      <button id="format-btn" @click="formatData">格式化</button>

      <div class="result">
        <textarea id="result" v-model="result" readonly placeholder="格式化結果將顯示在這裡..."></textarea>
      </div>
    </TabPanel>

    <TabPanel id="settings" :active-tab="activeTab">
      <!-- 設定頁面內容 -->
    </TabPanel>

    <TabPanel id="about" :active-tab="activeTab">
      <!-- 關於頁面內容 -->
    </TabPanel>
  </div>
</template>

<style>
@import "../assets/styles/popup.css";
</style>
