import { computed, shallowRef, watch, type Ref } from "vue";

export interface LazyProps {
  /**
   * 是否立即渲染
   * 為 true 時，會立即渲染
   */
  eager?: boolean;

  /**
   * 是否使用 keepalive
   * 為 true 時，會在離開後保留內容，下次進入時會重新顯示
   * 為 false 時，會在離開後銷毀內容，下次進入時會重新渲染
   */
  keepalive?: boolean;
}

/**
 * 懶加載
 * @param props 懶加載屬性
 * @param isActive 外部控制是否激活
 * @returns 返回 isBooted, hasContent, onAfterLeave
 *
 * @description
 * - 內部會使用 isBooted 控制是否已經啟用，初始為 false
 *
 * 當 eager = false時：
 * - 初始 isBooted 為 false， hasContent 會為 false，表示不渲染
 * - 切換 isActive 為 true 過後，isBooted為true， hasContent 為 true，表示渲染
 * - 再切換 isActive 為 false後，如果 keepalive，則表示不銷毀組件，因為 isBooted 已經為 true，表示仍會渲染，但外部可以透過控制 v-show="isActive" 來隱藏組件
 * - 如果不 keepalive，表示會銷毀組件，因此 hasContent 直接由 isActive 來控制
 *
 * 當 eager = true 時：
 * - 一開始 hasContent 就會為 true，因此一開始便會渲染，但外部仍然可以透過 isActive 來控制 v-show
 *
 * @example
 * ```html
 * <div v-if="hasContent" v-show="isOpen"></div>
 * ```
 */
export function useLazy(props: LazyProps, isActive: Ref<boolean>) {
  // 控制是否已經啟用，初始為 false
  const isBooted = shallowRef(false);

  // 計算是否應該渲染內容
  const hasContent = computed(() => {
    if (props.eager) return true;
    if (props.keepalive) {
      return isBooted.value || isActive.value;
    }
    return isActive.value;
  });

  // 監聽 isActive 的變化，當變為 true 時，設置 isBooted 為 true
  watch(
    isActive,
    (newVal) => {
      if (newVal) isBooted.value = true;
    },
    { immediate: true }
  );

  /**
   * 動畫結束後關閉
   * 當 eager 為 false 時，設置 isBooted 為 false
   */
  function onAfterLeave() {
    if (!props.eager) isBooted.value = false;
  }

  return { isBooted, hasContent, onAfterLeave };
}
