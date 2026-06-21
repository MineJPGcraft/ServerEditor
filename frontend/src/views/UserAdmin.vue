<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { api, type UserInfo, type Server } from '@/api'
import { toast } from 'vue-sonner'
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-vue-next'

const users = ref<UserInfo[]>([])
const loading = ref(true)
const savingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

const currentPage = ref(1)
const pageSize = 12

// 简单删除确认
const showDeleteConfirm = ref(false)
const pendingDelete = ref<UserInfo | null>(null)

// 有服务器的删除对话框
const showServerDeleteDialog = ref(false)
const serverDeleteUser = ref<UserInfo | null>(null)
const userServers = ref<Server[]>([])
const serverCount = ref(0)
const checkingServers = ref(false)
const deleteMode = ref<'transfer' | 'cascade'>('transfer')
const transferTargetId = ref('')

// 权限修改确认
const showPermConfirm = ref(false)
const pendingPerm = ref<{ user: UserInfo; perm: number } | null>(null)

onMounted(fetchUsers)

async function fetchUsers() {
  try {
    loading.value = true
    users.value = await api.users.list()
  } catch (e: any) {
    toast.error(e.response?.data || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(users.value.length / pageSize)))

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return users.value.slice(start, start + pageSize)
})

async function changePerm(user: UserInfo, perm: number) {
  savingId.value = user.id
  try {
    await api.users.edit(user.id, perm)
    user.perm = perm
    toast.success('权限已更新')
  } catch (e: any) {
    toast.error(e.response?.data || '更新失败')
  } finally {
    savingId.value = null
  }
}

function openPermChange(user: UserInfo, newPerm: number) {
  pendingPerm.value = { user, perm: newPerm }
  showPermConfirm.value = true
}

async function confirmPermChange() {
  if (!pendingPerm.value) return
  const { user, perm } = pendingPerm.value
  showPermConfirm.value = false
  await changePerm(user, perm)
}

function permLabel(p: number) {
  return ['已封禁', '普通用户', '管理员', '超级管理员'][p] || '未知'
}

function cancelPermChange() {
  showPermConfirm.value = false
  pendingPerm.value = null
}

// ── 删除逻辑 ──

async function openDelete(user: UserInfo) {
  // 先检查该用户是否有服务器
  checkingServers.value = true
  try {
    const res = await api.users.servers(user.id)
    if (res.count > 0) {
      // 有服务器，弹出选择对话框
      serverDeleteUser.value = user
      userServers.value = res.servers
      serverCount.value = res.count
      deleteMode.value = 'transfer'
      transferTargetId.value = ''
      showServerDeleteDialog.value = true
    } else {
      // 无服务器，直接确认删除
      pendingDelete.value = user
      showDeleteConfirm.value = true
    }
  } catch (e: any) {
    toast.error(e.response?.data || '查询失败')
  } finally {
    checkingServers.value = false
  }
}

async function confirmSimpleDelete() {
  if (!pendingDelete.value) return
  deletingId.value = pendingDelete.value.id
  try {
    await api.users.delete(pendingDelete.value.id)
    toast.success('用户已删除')
    showDeleteConfirm.value = false
    fetchUsers()
  } catch (e: any) {
    toast.error(e.response?.data || '删除失败')
  } finally {
    deletingId.value = null
  }
}

async function confirmServerDelete() {
  if (!serverDeleteUser.value) return
  deletingId.value = serverDeleteUser.value.id
  try {
    if (deleteMode.value === 'transfer') {
      if (!transferTargetId.value) {
        toast.error('请选择转移目标用户')
        return
      }
      await api.users.delete(serverDeleteUser.value.id, 'transfer', transferTargetId.value)
      toast.success(`用户已删除，${serverCount.value} 个服务器已转移`)
    } else {
      await api.users.delete(serverDeleteUser.value.id, 'cascade')
      toast.success(`用户已删除，${serverCount.value} 个服务器已一并删除`)
    }
    showServerDeleteDialog.value = false
    fetchUsers()
  } catch (e: any) {
    toast.error(e.response?.data || '删除失败')
  } finally {
    deletingId.value = null
  }
}

function permColor(p: number) {
  if (p === 3) return 'text-purple-500'
  if (p === 2) return 'text-blue-500'
  if (p === 1) return 'text-muted-foreground'
  return 'text-destructive'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">用户管理</h1>
      <button @click="fetchUsers" class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors">
        <RefreshCw class="h-4 w-4" />
        刷新
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>

    <div v-else class="space-y-4">
      <div class="rounded-md border overflow-x-auto">
        <table class="w-full min-w-[560px]">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">ID</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">名称</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">权限</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in paginatedUsers" :key="user.id" class="border-b last:border-0">
              <td class="px-4 py-3 text-xs text-muted-foreground font-mono">{{ user.id }}</td>
              <td class="px-4 py-3 text-sm font-medium whitespace-nowrap">{{ user.name }}</td>
              <td class="px-4 py-3">
                <select
                  :value="user.perm"
                  @change="(e: any) => openPermChange(user, parseInt(e.target.value))"
                  :disabled="savingId === user.id"
                  :class="['flex h-8 w-32 rounded-md border bg-background px-2 py-1 text-sm dark:bg-background', permColor(user.perm)]"
                >
                  <option :value="0" class="bg-background text-foreground dark:bg-background dark:text-foreground">已封禁</option>
                  <option :value="1" class="bg-background text-foreground dark:bg-background dark:text-foreground">普通用户</option>
                  <option :value="2" class="bg-background text-foreground dark:bg-background dark:text-foreground">管理员</option>
                  <option :value="3" class="bg-background text-foreground dark:bg-background dark:text-foreground">超级管理员</option>
                </select>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button
                  @click="openDelete(user)"
                  :disabled="deletingId === user.id || checkingServers"
                  class="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  <Trash2 class="h-3 w-3 mr-1" />
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
        <button @click="currentPage = 1" :disabled="currentPage === 1" class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed" title="首页">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>
        </button>
        <button @click="currentPage--" :disabled="currentPage === 1" class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed" title="上一页">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <template v-for="p in totalPages" :key="p">
          <button
            v-if="p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)"
            @click="currentPage = p"
            :class="['inline-flex items-center justify-center h-8 min-w-[2rem] rounded-md text-sm', p === currentPage ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent']"
          >{{ p }}</button>
          <span v-else-if="p === currentPage - 3 || p === currentPage + 3" class="px-1 text-muted-foreground text-sm">...</span>
        </template>
        <button @click="currentPage++" :disabled="currentPage === totalPages" class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed" title="下一页">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed" title="末页">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m13 17 5-5-5-5"/><path d="m6 17 5-5-5-5"/></svg>
        </button>
        <span class="text-sm text-muted-foreground ml-2">共 {{ users.length }} 条</span>
      </div>
    </div>

    <!-- 简单删除确认（无服务器） -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showDeleteConfirm = false">
      <div class="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg mx-4">
        <h2 class="text-lg font-semibold mb-2">确认删除用户</h2>
        <p class="text-sm text-muted-foreground mb-1">确定要删除用户 <strong>{{ pendingDelete?.name }}</strong>（{{ pendingDelete?.id }}）吗？</p>
        <p class="text-xs text-muted-foreground mb-4">该用户没有拥有任何服务器，删除后其所有会话将立即失效。</p>
        <div class="flex justify-end gap-2">
          <button @click="showDeleteConfirm = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button @click="confirmSimpleDelete" class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 有服务器的删除对话框 -->
    <div v-if="showServerDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showServerDeleteDialog = false">
      <div class="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-start gap-3 mb-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle class="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 class="text-lg font-semibold">用户拥有 {{ serverCount }} 个服务器</h2>
            <p class="text-sm text-muted-foreground mt-1">
              用户 <strong>{{ serverDeleteUser?.name }}</strong>（{{ serverDeleteUser?.id }}）拥有以下服务器，请选择处理方式：
            </p>
          </div>
        </div>

        <!-- 服务器列表 -->
        <div class="max-h-32 overflow-y-auto rounded-md border bg-muted/30 px-3 py-2 mb-4">
          <ul class="text-xs space-y-1">
            <li v-for="s in userServers" :key="s.uuid" class="text-muted-foreground">
              <span class="font-mono text-[10px] opacity-50">{{ s.uuid.slice(0, 8) }}</span>
              &mdash; {{ s.name }}
            </li>
          </ul>
        </div>

        <!-- 处理方式 -->
        <div class="space-y-3 mb-4">
          <label class="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50 transition-colors" :class="{ 'border-primary bg-primary/5': deleteMode === 'transfer' }">
            <input type="radio" v-model="deleteMode" value="transfer" class="mt-0.5" />
            <div class="flex-1">
              <div class="text-sm font-medium">转移给其他用户</div>
              <div class="text-xs text-muted-foreground mt-0.5">将服务器所有权转移给指定用户，然后删除此用户</div>
              <select
                v-if="deleteMode === 'transfer'"
                v-model="transferTargetId"
                class="mt-2 flex h-8 w-full rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="">-- 请选择目标用户 --</option>
                <option v-for="u in users.filter(u => u.id !== serverDeleteUser?.id)" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.id }})
                </option>
              </select>
            </div>
          </label>

          <label class="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50 transition-colors" :class="{ 'border-destructive bg-destructive/5': deleteMode === 'cascade' }">
            <input type="radio" v-model="deleteMode" value="cascade" class="mt-0.5" />
            <div>
              <div class="text-sm font-medium text-destructive">连同服务器一起删除</div>
              <div class="text-xs text-muted-foreground mt-0.5">删除用户的同时删除其名下所有 {{ serverCount }} 个服务器，不可恢复</div>
            </div>
          </label>
        </div>

        <div class="flex justify-end gap-2">
          <button @click="showServerDeleteDialog = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button
            @click="confirmServerDelete"
            :disabled="deletingId !== null || (deleteMode === 'transfer' && !transferTargetId)"
            class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {{ deleteMode === 'cascade' ? '删除用户及服务器' : '转移并删除用户' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Perm change confirm -->
    <div v-if="showPermConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="cancelPermChange">
      <div class="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg mx-4">
        <h2 class="text-lg font-semibold mb-2">确认修改权限</h2>
        <p class="text-sm text-muted-foreground mb-4">
          确定要将用户 "{{ pendingPerm?.user.name }}" 的权限从
          <span class="font-medium">{{ permLabel(pendingPerm?.user.perm ?? 0) }}</span>
          改为
          <span class="font-medium">{{ permLabel(pendingPerm?.perm ?? 0) }}</span>
          吗？
        </p>
        <div class="flex justify-end gap-2">
          <button @click="cancelPermChange" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button @click="confirmPermChange" class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">确认修改</button>
        </div>
      </div>
    </div>
  </div>
</template>