<script setup lang="ts">
interface Props {
  id: string;
  activeTab: string;
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
