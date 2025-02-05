<script setup lang="ts">
import { ref } from "vue";
import TabPanel from "./components/TabPanel.vue";
import FormatPanel from "./components/FormatPanel.vue";
import BatchPanel from "./components/BatchPanel.vue";
import NavPanel from "./components/NavPanel.vue";
import { TabType, TabLabel } from "../constants/tabs";

const activeTab = ref<TabType>(TabType.FORMAT);

const switchTab = (tab: TabType) => {
  activeTab.value = tab;
};
</script>

<template>
  <div class="container">
    <div class="tabs">
      <button v-for="tab in Object.values(TabType)" :key="tab" class="tab" :class="{ active: activeTab === tab }" @click="switchTab(tab)">
        {{ TabLabel[tab] }}
      </button>
    </div>

    <TabPanel :id="TabType.FORMAT" :active-tab="activeTab">
      <FormatPanel />
    </TabPanel>

    <TabPanel :id="TabType.BATCH" :active-tab="activeTab">
      <BatchPanel />
    </TabPanel>

    <TabPanel :id="TabType.NAV" :active-tab="activeTab">
      <NavPanel />
    </TabPanel>
  </div>
</template>

<style>
@import "../assets/styles/popup.css";
</style>
