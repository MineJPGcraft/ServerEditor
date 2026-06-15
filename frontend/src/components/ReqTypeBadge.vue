<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'create' | 'edit' | 'delete'
}>()

const label = computed(() => {
  switch (props.type) {
    case 'create': return '创建'
    case 'edit': return '修改'
    case 'delete': return '删除'
    default: return props.type
  }
})

const colorClass = computed(() => {
  switch (props.type) {
    case 'create': return 'bg-green-500/10 text-green-500'
    case 'edit': return 'bg-blue-500/10 text-blue-500'
    case 'delete': return 'bg-destructive/10 text-destructive'
    default: return 'bg-muted text-muted-foreground'
  }
})
</script>

<template>
  <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClass]">
    {{ label }}
  </span>
</template>