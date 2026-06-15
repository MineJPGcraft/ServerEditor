<script setup lang="ts">
import SidebarLayout from '@/layouts/SidebarLayout.vue'
import { Toaster } from 'vue-sonner'
</script>

<template>
  <SidebarLayout />
  <Toaster position="top-right" rich-colors close-button />
</template>