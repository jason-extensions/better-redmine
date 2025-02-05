<script setup lang="ts">
import { TabType } from "../../constants/tabs";

interface Props {
  id: TabType;
  activeTab: TabType;
}

defineProps<Props>();
</script>

<template>
  <div class="tab-content" :class="{ active: id === activeTab }">
    <slot></slot>
  </div>
</template>

<style scoped>
.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}
</style>
