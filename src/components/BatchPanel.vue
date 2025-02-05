<script setup lang="ts">
import { ref } from "vue";
import AppSelect from "./AppSelect.vue";
import AppButton from "./app/AppButton.vue";
import { useGetCurrentTabId } from "@/composables/useGetCurrentTabId";

const { getCurrentTabId } = useGetCurrentTabId();

const statusOptions = [
  { label: "New", value: "New" },
  { label: "開發處理中", value: "開發處理中" },
  { label: "開發處理完畢", value: "開發處理完畢" },
];

const selectedField = ref("");
const selectedValue = ref("");

const fieldOptions = [{ label: "狀態", value: "狀態" }];

const loading = ref(false);

const handleUpdate = async () => {
  if (!selectedField.value || !selectedValue.value) {
    return;
  }

  try {
    loading.value = true;
    // 獲取當前活動的標籤頁
    const tabId = await getCurrentTabId();
    if (!tabId) return;

    // 發送消息到 content script
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "batchUpdate",
      key: selectedField.value,
      value: selectedValue.value,
    });

    if (response.success) {
      alert("更新成功");
    } else {
      alert(`更新失敗: ${response.error}`);
    }
  } catch (error) {
    alert(`執行失敗: ${error}`);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="batch-panel">
    <div class="form-group">
      <label>選擇欄位</label>
      <AppSelect v-model="selectedField" :options="fieldOptions" placeholder="請選擇要修改的欄位" />
    </div>

    <div class="form-group">
      <label>選擇值</label>
      <AppSelect v-model="selectedValue" :options="statusOptions" placeholder="請選擇要設定的值" :disabled="!selectedField" />
    </div>

    <AppButton :loading="loading" :disabled="!selectedField || !selectedValue" @click="handleUpdate"> 更新 </AppButton>
  </div>
</template>

<style scoped>
.batch-panel {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}
</style>
