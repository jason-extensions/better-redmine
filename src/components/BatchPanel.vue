<script setup lang="ts">
import { ref } from "vue";
import AppSelect from "./AppSelect.vue";

const statusOptions = [
  { label: "New", value: "New" },
  { label: "開發處理中", value: "開發處理中" },
  { label: "開發處理完畢", value: "開發處理完畢" },
];

const selectedField = ref("");
const selectedValue = ref("");

const fieldOptions = [{ label: "狀態", value: "狀態" }];

const handleUpdate = async () => {
  if (!selectedField.value || !selectedValue.value) {
    return;
  }

  try {
    // 獲取當前活動的標籤頁
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    // 發送消息到 content script
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: "batchUpdate",
        key: selectedField.value,
        value: selectedValue.value,
      },
      (response) => {
        console.log("🚀 ~ BatchPanel.vue:33 ~ handleUpdate ~ response:", response);

        if (response.success) {
          alert("更新成功");
        } else {
          alert(`更新失敗: ${response.error}`);
        }
      }
    );
  } catch (error) {
    alert(`執行失敗: ${error}`);
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

    <button class="update-button" :disabled="!selectedField || !selectedValue" @click="handleUpdate">更新</button>
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

.update-button {
  width: 100%;
  padding: 8px 16px;
  background-color: #409eff;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.update-button:hover {
  background-color: #66b1ff;
}

.update-button:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}
</style>
