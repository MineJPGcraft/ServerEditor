<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { Sun, Moon, Monitor } from 'lucide-vue-next'

const props = defineProps<{
  collapsed?: boolean
}>()

const { themeMode, cycleTheme } = useTheme()

const icon = computed(() => {
  switch (themeMode.value) {
    case 'light': return Sun
    case 'dark': return Moon
    case 'system': return Monitor
    default: return Monitor
  }
})

const label = computed(() => {
  switch (themeMode.value) {
    case 'light': return '浅色'
    case 'dark': return '深色'
    case 'system': return '跟随系统'
    default: return ''
  }
})
</script>

<template>
  <button
    @click="cycleTheme"
    class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-colors"
    :title="`主题: ${label}（点击切换）`"
  >
    <component :is="icon" class="h-4 w-4 shrink-0" />
    <span v-if="!collapsed">{{ label }}</span>
  </button>
</template>
