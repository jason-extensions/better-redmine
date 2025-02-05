<script setup lang="ts">
defineProps<{
  type?: "button" | "submit" | "reset";
}>();
</script>

<template>
  <button :type="type || 'button'" class="app-button">
    <slot></slot>
  </button>
</template>

<style scoped>
.app-button {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-sm);
}

.app-button:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.app-button:active {
  transform: translateY(0);
}
</style>
