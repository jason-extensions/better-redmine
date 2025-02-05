<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import type { NavItem } from "@/types/nav";
import AppButton from "@/components/app/AppButton.vue";
import AppInput from "@/components/app/AppInput.vue";
import { ref } from "vue";
import { useStorage } from "@/composables/useStorage";
import { useSetting } from "@/composables/useSetting";

const newPath = ref("");
const newLabel = ref("");

const { siteUrl } = useSetting();

// 使用 useStorage 來管理導航項目
const { data: navItems } = useStorage<NavItem[]>({
  key: "navItems",
  defaultValue: [],
});

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
};

/**
 * 刪除導航項目
 */
const removeNavItem = (id: string) => {
  navItems.value = navItems.value.filter((item) => item.id !== id);
};

/**
 * 導航到目標頁面
 */
const navigateTo = (path: string) => {
  const url = `${siteUrl.value}${path}`;
  chrome.tabs.create({ url });
};
</script>

<template>
  <div class="nav-panel">
    <div class="nav-form">
      <div class="input-group">
        <AppInput v-model="newLabel" placeholder="導航名稱" @keyup.enter="addNavItem" />
        <AppInput v-model="newPath" placeholder="路徑 (例如: /issues)" @keyup.enter="addNavItem" />
      </div>
      <AppButton @click="addNavItem" :disabled="!newPath || !newLabel"> 新增 </AppButton>
    </div>

    <div class="nav-list">
      <div v-if="navItems.length === 0" class="empty-state">尚未新增任何導航項目</div>

      <div v-for="item in navItems" :key="item.id" class="nav-item">
        <button class="nav-link" @click="navigateTo(item.path)">
          {{ item.label }}
        </button>
        <button class="delete-button" @click="removeNavItem(item.id)">
          <span class="delete-icon">✕</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-panel {
  padding: 1rem;
}

.nav-form {
  margin-bottom: 1.25rem;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-state {
  text-align: center;
  color: var(--secondary-text);
  padding: 1rem;
  background-color: var(--input-bg);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
}

.nav-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.nav-link {
  flex: 1;
  padding: 0.75rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  color: var(--text-color);
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.nav-link:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.delete-button {
  padding: 0.5rem;
  background-color: var(--error-bg);
  color: var(--error-color);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.delete-button:hover {
  background-color: var(--error-hover);
  transform: translateY(-1px);
}

.delete-icon {
  font-size: 0.75rem;
  line-height: 1;
}
</style>
