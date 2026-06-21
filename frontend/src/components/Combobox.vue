<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  options: string[]
  placeholder?: string
  required?: boolean
}>(), {
  placeholder: '请选择',
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isCustom = ref(false)
const customValue = ref('')

// 判断当前值是否在预设选项中
watch(() => props.modelValue, (val) => {
  if (val && !props.options.includes(val)) {
    isCustom.value = true
    customValue.value = val
  } else {
    isCustom.value = false
  }
}, { immediate: true })

function onSelectChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  if (val === '__custom__') {
    isCustom.value = true
    customValue.value = ''
    emit('update:modelValue', '')
  } else {
    isCustom.value = false
    emit('update:modelValue', val)
  }
}

function onCustomInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  customValue.value = val
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="space-y-1.5">
    <select
      :value="isCustom ? '__custom__' : modelValue"
      :required="required && !isCustom"
      class="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-background dark:text-foreground"
      @change="onSelectChange"
    >
      <option value="" disabled class="bg-background text-foreground dark:bg-background dark:text-foreground">{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt" :value="opt" class="bg-background text-foreground dark:bg-background dark:text-foreground">{{ opt }}</option>
      <option value="__custom__" class="bg-background text-foreground dark:bg-background dark:text-foreground">✏️ 自定义...</option>
    </select>
    <input
      v-if="isCustom"
      :value="customValue"
      :placeholder="placeholder"
      class="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-background dark:text-foreground"
      @input="onCustomInput"
    />
  </div>
</template>
