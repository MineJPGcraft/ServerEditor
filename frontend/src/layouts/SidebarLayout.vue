<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useTheme } from '@/composables/useTheme'
import ThemeToggle from '@/components/ThemeToggle.vue'
import {
  Server, LayoutDashboard, ClipboardList, Users, Shield, Key, Tags,
  LogIn, LogOut, ChevronLeft, ChevronRight, Menu
} from 'lucide-vue-next'

const { perm, userId, userName, isLoggedIn, isAdmin, isSuperAdmin, checkAuth, logout } = useAuth()
const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const mobileOpen = ref(false)

const navItems = computed(() => {
  const items: { label: string; to: string; icon: any; show: boolean }[] = [
    { label: '服务器列表', to: '/', icon: Server, show: true },
    { label: '我的申请', to: '/requests', icon: ClipboardList, show: isLoggedIn.value },
    { label: '审核申请', to: '/admin/requests', icon: Shield, show: isAdmin.value },
    { label: '服务器管理', to: '/admin/servers', icon: LayoutDashboard, show: isAdmin.value },
    { label: 'Tag 管理', to: '/admin/tags', icon: Tags, show: isAdmin.value },
    { label: '用户管理', to: '/admin/users', icon: Users, show: isSuperAdmin.value },
    { label: 'OIDC 配置', to: '/admin/oidc', icon: Key, show: isSuperAdmin.value },
  ]
  return items.filter(i => i.show)
})

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const permLabel = computed(() => {
  const p = perm.value
  if (p === 3) return '超级管理员'
  if (p === 2) return '管理员'
  if (p === 1) return '普通用户'
  if (p === 0) return '已封禁'
  return ''
})

onMounted(() => {
  checkAuth()
})

function closeMobile() {
  mobileOpen.value = false
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <!-- Mobile overlay -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="closeMobile"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <!-- Logo -->
      <div class="flex h-14 items-center justify-center border-b px-3">
        <button @click="router.push('/')" class="flex items-center">
          <Server class="h-6 w-6 text-primary shrink-0" />
          <span v-if="!collapsed" class="ml-2 font-semibold text-sm whitespace-nowrap">
            MCJPG 服务器列表
          </span>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-2 px-2">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors mb-0.5',
            isActive(item.to)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          ]"
          :title="collapsed ? item.label : ''"
          @click="closeMobile"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- Bottom section: user info -> theme toggle -> logout -->
      <div class="border-t p-3 space-y-1">
        <!-- 用户信息（在主题切换上方） -->
        <template v-if="isLoggedIn && !collapsed">
          <div class="text-xs text-muted-foreground px-1 pb-1">
            <div class="truncate font-medium text-foreground">{{ userName || userId }}</div>
            <div class="mt-0.5">{{ permLabel }}</div>
          </div>
        </template>
        <ThemeToggle :collapsed="collapsed" />
        <template v-if="isLoggedIn">
          <button
            @click="closeMobile(); logout().then(() => router.push('/'))"
            class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
            :title="collapsed ? '登出' : ''"
          >
            <LogOut class="h-4 w-4 shrink-0" />
            <span v-if="!collapsed">登出</span>
          </button>
        </template>
        <button
          v-else
          @click="closeMobile(); router.push('/login')"
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-colors"
          :title="collapsed ? '登录' : ''"
        >
          <LogIn class="h-4 w-4 shrink-0" />
          <span v-if="!collapsed">登录</span>
        </button>
      </div>

      <!-- Collapse toggle (desktop) -->
      <button
        @click="collapsed = !collapsed"
        class="hidden lg:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground z-10"
      >
        <ChevronRight v-if="collapsed" class="h-3 w-3" />
        <ChevronLeft v-else class="h-3 w-3" />
      </button>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Mobile header -->
      <header class="flex lg:hidden items-center gap-2 border-b px-4 h-14 shrink-0">
        <button @click="mobileOpen = true" class="text-foreground">
          <Menu class="h-5 w-5" />
        </button>
        <span class="font-semibold text-sm">MCJPG 服务器列表</span>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
