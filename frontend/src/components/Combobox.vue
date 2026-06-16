<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  options: string[]
  placeholder?: string
  required?: boolean
}>(), {
  placeholder: '请选择或输入',
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="relative">
    <input
      :value="modelValue"
      :list="`combo-${id}`"
      :placeholder="placeholder"
      :required="required"
      autocomplete="off"
      class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      @input="onInput"
    />
    <datalist :id="`combo-${id}`">
      <option v-for="opt in options" :key="opt" :value="opt" />
    </datalist>
  </div>
</template>
