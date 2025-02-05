<script setup lang="ts">
interface Props {
  /**
   * 選項列表
   */
  options: {
    label: string;
    value: string;
  }[];
  /**
   * 當前選中的值
   */
  modelValue?: string;
  /**
   * 預設提示文字
   */
  placeholder?: string;
  /**
   * 是否禁用
   */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "請選擇",
  disabled: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:modelValue", target.value);
};
</script>

<template>
  <select class="app-select" :value="modelValue" :disabled="disabled" @change="handleChange">
    <option value="" disabled selected>{{ placeholder }}</option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>

<style scoped>
.app-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
  font-size: 14px;
  color: #606266;
  outline: none;
  transition: border-color 0.2s;
}

.app-select:hover {
  border-color: #c0c4cc;
}

.app-select:focus {
  border-color: #409eff;
}

.app-select:disabled {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
  cursor: not-allowed;
}
</style>
