<script setup lang="ts">
import { computed } from "vue";
import { TabType } from "../../constants/tabs";
import { useLazy, type LazyProps } from "../composables/useLazy";

interface Props extends LazyProps {
  id: TabType;
  activeTab: TabType;
}

const props = defineProps<Props>();

const isActive = computed(() => props.id === props.activeTab);

const { hasContent } = useLazy(props, isActive);
</script>

<template>
  <div class="tab-content" v-if="hasContent" v-show="isActive">
    <slot></slot>
  </div>
</template>
