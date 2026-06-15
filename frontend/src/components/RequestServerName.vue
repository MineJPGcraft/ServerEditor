<script setup lang="ts">
import type { ServerRequest } from '@/api'

const props = defineProps<{
  req: ServerRequest
}>()

import { computed } from 'vue'

const displayName = computed(() => {
  switch (props.req.req_type) {
    case 'delete':
      // 优先显示目标服务器名，查不到说明已被删除
      return props.req.target_name || '此服务器已被删除'
    case 'edit':
      // 优先显示目标服务器名，查不到则显示申请内将改为的名字
      return props.req.target_name || props.req.data?.name || '(无名称)'
    case 'create':
    default:
      return props.req.data?.name || '(无名称)'
  }
})

const isMissing = computed(() => props.req.req_type === 'delete' && !props.req.target_name)
</script>

<template>
  <span :class="['text-sm', isMissing ? 'text-destructive italic' : '']">
    {{ displayName }}
  </span>
</template>