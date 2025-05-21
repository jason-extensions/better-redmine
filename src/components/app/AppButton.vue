<script setup lang="ts">
interface Props {
  /** 按鈕類型 */
  type?: "button" | "submit" | "reset";
  /** 載入狀態 */
  loading?: boolean;
  /** 禁用狀態 */
  disabled?: boolean;
}

defineProps<Props>();
</script>

<template>
  <button :type="type || 'button'" class="app-button" :class="{ 'is-loading': loading }" :disabled="disabled || loading">
    <div v-if="loading" class="loading-spinner"></div>
    <span :class="{ 'content-loading': loading }">
      <slot></slot>
    </span>
  </button>
</template>

<style scoped>
.app-button {
  position: relative;
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
  box-shadow: var(--shadow-sm);
}

.app-button:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.app-button:active:not(:disabled) {
  transform: translateY(0);
}

.app-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.content-loading {
  visibility: hidden;
}

@keyframes spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
</style>
