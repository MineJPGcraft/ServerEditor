<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type UserInfo } from '@/api'
import { toast } from 'vue-sonner'
import { RefreshCw, Trash2 } from 'lucide-vue-next'

const users = ref<UserInfo[]>([])
const loading = ref(true)
const savingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const pendingDelete = ref<UserInfo | null>(null)
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

function openDelete(user: UserInfo) {
  pendingDelete.value = user
  showDeleteConfirm.value = true
}

async function confirmDelete() {
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

    <div v-else class="rounded-md border">
      <table class="w-full">
        <thead>
          <tr class="border-b bg-muted/50">
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">名称</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">权限</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-b last:border-0">
            <td class="px-4 py-3 text-xs text-muted-foreground font-mono">{{ user.id }}</td>
            <td class="px-4 py-3 text-sm font-medium">{{ user.name }}</td>
            <td class="px-4 py-3">
              <select
                :value="user.perm"
                @change="(e: any) => openPermChange(user, parseInt(e.target.value))"
                :disabled="savingId === user.id"
                :class="['flex h-8 w-32 rounded-md border bg-transparent px-2 py-1 text-sm', permColor(user.perm)]"
              >
                <option :value="0">已封禁</option>
                <option :value="1">普通用户</option>
                <option :value="2">管理员</option>
                <option :value="3">超级管理员</option>
              </select>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                @click="openDelete(user)"
                :disabled="deletingId === user.id"
                class="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                <Trash2 class="h-3 w-3 mr-1" />
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Delete confirm -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showDeleteConfirm = false">
      <div class="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg mx-4">
        <h2 class="text-lg font-semibold mb-2">确认删除用户</h2>
        <p class="text-sm text-muted-foreground mb-4">确定要删除用户 "{{ pendingDelete?.name }}"（{{ pendingDelete?.id }}）吗？该用户的所有会话将立即失效。</p>
        <div class="flex justify-end gap-2">
          <button @click="showDeleteConfirm = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button @click="confirmDelete" class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90">删除</button>
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