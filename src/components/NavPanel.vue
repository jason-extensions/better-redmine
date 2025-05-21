<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import type { NavItem } from "@/types/nav";
import AppButton from "@/components/app/AppButton.vue";
import AppInput from "@/components/app/AppInput.vue";
import { ref, onMounted, computed } from "vue";
import { useStorage } from "@/composables/useStorage";
import { useSetting } from "@/composables/useSetting";

const newPath = ref("");
const newLabel = ref("");
const currentTabUrl = ref("");
const currentTabUrlObject = ref<URL | null>(null);

// 計算完整路徑（包含 path、query 和 hash）
const fullPath = computed(() => {
  if (!currentTabUrlObject.value) return "";

  let result = currentTabUrlObject.value.pathname || "";

  if (currentTabUrlObject.value.search) {
    result += `?${currentTabUrlObject.value.search}`;
  }

  if (currentTabUrlObject.value.hash) {
    result += currentTabUrlObject.value.hash;
  }

  return result;
});

const { siteUrl } = useSetting();

// 使用 useStorage 來管理導航項目
const { data: navItems } = useStorage<NavItem[]>({
  key: "navItems",
  defaultValue: [],
});

/**
 * 獲取當前頁面的 URL、路徑、查詢參數和錨點
 */
const getCurrentTabInfo = async () => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.url) {
      currentTabUrl.value = activeTab.url;

      // 解析 URL 獲取 path、query 和 hash
      const url = new URL(activeTab.url);
      currentTabUrlObject.value = url;
    }
  } catch (error) {
    console.error("獲取當前頁面資訊失敗:", error);
  }
};

/**
 * 使用當前頁面路徑添加導航項目（包含 query 和 hash）
 */
const addNavWithCurrentPath = () => {
  if (!newLabel.value || !fullPath.value) return;

  navItems.value.push({
    id: uuidv4(),
    path: fullPath.value,
    label: newLabel.value,
  });

  // 清空輸入框
  newLabel.value = "";
};

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

// 頁面加載時獲取當前頁面資訊
onMounted(() => {
  getCurrentTabInfo();

  // 監聽標籤頁變更，更新當前路徑
  chrome.tabs.onActivated.addListener(() => {
    getCurrentTabInfo();
  });

  // 監聽頁面導航變更
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      getCurrentTabInfo();
    }
  });
});
</script>

<template>
  <div class="nav-panel">
    <div class="nav-form">
      <!-- 使用當前路徑新增導航 -->
      <div class="quick-add">
        <div class="input-group">
          <AppInput v-model="newLabel" placeholder="導航名稱" @keyup.enter="addNavWithCurrentPath" />
          <AppButton @click="addNavWithCurrentPath" :disabled="!newLabel" class="quick-add-btn"> 快速添加 </AppButton>
        </div>
        <div class="current-path">
          <span class="path-label">當前路徑:</span>
          <span class="path-value">{{ fullPath }}</span>
        </div>
      </div>

      <div class="divider">或者</div>

      <!-- 手動輸入路徑新增導航 -->
      <div class="input-group">
        <AppInput v-model="newLabel" placeholder="導航名稱" @keyup.enter="addNavItem" />
        <AppInput v-model="newPath" placeholder="路徑 (例如: /issues)" @keyup.enter="addNavItem" />
      </div>
      <AppButton @click="addNavItem" :disabled="!newPath || !newLabel">手動新增</AppButton>
    </div>

    <div class="nav-list">
      <div v-if="navItems.length === 0" class="empty-state">尚未新增任何導航項目</div>

      <div v-for="item in navItems" :key="item.id" class="nav-item">
        <button class="nav-link" @click="navigateTo(item.path)">
          {{ item.label }}
          <span class="path-preview">{{ item.path }}</span>
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

.quick-add {
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  padding: 0.75rem;
  border-radius: 0.75rem;
  background-color: rgba(var(--primary-rgb), 0.05);
}

.quick-add-btn {
  background-color: var(--primary-color);
  color: white;
}

.current-path {
  font-size: 0.75rem;
  color: var(--secondary-text);
  margin-top: 0.5rem;
  word-break: break-all;
}

.path-label {
  font-weight: 600;
  margin-right: 0.25rem;
}

.path-value {
  font-family: monospace;
  background-color: var(--input-bg);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.divider {
  text-align: center;
  margin: 1rem 0;
  position: relative;
  color: var(--secondary-text);
  font-size: 0.75rem;
}

.divider::before,
.divider::after {
  content: "";
  position: absolute;
  top: 50%;
  width: calc(50% - 1.5rem);
  height: 1px;
  background-color: var(--border-color);
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
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
  position: relative;
  min-width: 0;
}

.nav-link:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.path-preview {
  display: block;
  font-size: 0.7rem;
  color: var(--secondary-text);
  font-family: monospace;
  margin-top: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
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
