<script setup lang="ts">
import { ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import { BASE_URL } from "../../constants/site";
import type { NavItem } from "../../types/nav";

const navItems = ref<NavItem[]>([]);
const newPath = ref("");
const newLabel = ref("");

/**
 * 新增導航項目
 */
const addNavItem = () => {
  if (!newPath.value || !newLabel.value) return;

  navItems.value.push({
    id: uuidv4(),
    path: newPath.value.startsWith("/") ? newPath.value : `/${newPath.value}`,
    label: newLabel.value,
  });

  // 清空輸入框
  newPath.value = "";
  newLabel.value = "";

  // 保存到 storage
  saveNavItems();
};

/**
 * 刪除導航項目
 */
const removeNavItem = (id: string) => {
  navItems.value = navItems.value.filter((item) => item.id !== id);
  saveNavItems();
};

/**
 * 導航到目標頁面
 */
const navigateTo = (path: string) => {
  const url = `${BASE_URL}${path}`;
  chrome.tabs.create({ url });
};

/**
 * 保存導航項目到 storage
 */
const saveNavItems = () => {
  chrome.storage.sync.set({ navItems: navItems.value });
};

/**
 * 從 storage 載入導航項目
 */
const loadNavItems = async () => {
  const result = await chrome.storage.sync.get("navItems");
  if (result.navItems) {
    navItems.value = result.navItems;
  }
};

// 初始化時載入儲存的導航項目
loadNavItems();
</script>

<template>
  <div class="nav-panel">
    <div class="nav-form">
      <div class="input-group">
        <input type="text" v-model="newLabel" placeholder="導航名稱" @keyup.enter="addNavItem" />
        <input type="text" v-model="newPath" placeholder="路徑 (例如: /issues)" @keyup.enter="addNavItem" />
        <button @click="addNavItem" :disabled="!newPath || !newLabel">新增</button>
      </div>
    </div>

    <div class="nav-list">
      <div v-if="navItems.length === 0" class="empty-state">尚未新增任何導航項目</div>

      <div v-for="item in navItems" :key="item.id" class="nav-item">
        <button class="nav-button" @click="navigateTo(item.path)">
          {{ item.label }}
        </button>
        <button class="delete-button" @click="removeNavItem(item.id)">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-panel {
  padding: 16px;
}

.nav-form {
  margin-bottom: 16px;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-group input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nav-button {
  flex: 1;
  padding: 8px 16px;
  background-color: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.nav-button:hover {
  background-color: #e0e0e0;
}

.delete-button {
  padding: 4px 8px;
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-button:hover {
  background-color: #cc0000;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 16px;
}
</style>
