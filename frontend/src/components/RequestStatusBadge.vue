<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const variant = computed(() => {
  switch (props.status) {
    case 'draft': return 'secondary'
    case 'pending': return 'default'
    case 'approved': return 'default'
    case 'rejected': return 'destructive'
    default: return 'secondary'
  }
})

const label = computed(() => {
  switch (props.status) {
    case 'draft': return '草稿'
    case 'pending': return '审核中'
    case 'approved': return '已通过'
    case 'rejected': return '已驳回'
    default: return props.status
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      status === 'draft' && 'bg-muted text-muted-foreground',
      status === 'pending' && 'bg-yellow-500/10 text-yellow-500',
      status === 'approved' && 'bg-green-500/10 text-green-500',
      status === 'rejected' && 'bg-destructive/10 text-destructive',
    ]"
  >
    {{ label }}
  </span>
</template>