<script setup lang="ts">
defineProps<{
  modelValue: string;
  placeholder?: string;
  id?: string;
  spellcheck?: boolean;
}>();

defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();
</script>

<template>
  <input
    type="text"
    :value="modelValue"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    :placeholder="placeholder"
    :id="id"
    :spellcheck="spellcheck"
  />
</template>

<style scoped>
input[type="text"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  background-color: var(--input-bg);
  font-size: 0.875rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

input[type="text"]:hover {
  border-color: #d1d5db;
}

input[type="text"]:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
</style>
