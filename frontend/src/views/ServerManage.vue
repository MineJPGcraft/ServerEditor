<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type Server, type UserInfo } from '@/api'
import { useAuth } from '@/composables/useAuth'
import { toast } from 'vue-sonner'
import ServerCard from '@/components/ServerCard.vue'
import Combobox from '@/components/Combobox.vue'
import { Plus, RefreshCw, UserCog, ArrowLeftRight } from 'lucide-vue-next'

const { isSuperAdmin } = useAuth()

const servers = ref<Server[]>([])
const types = ref<string[]>([])
const versions = ref<string[]>([])

async function fetchAdminServers() {
  try {
    const data = await api.servers.adminList()
    servers.value = data

    // 同时获取 types/versions 用于表单下拉
    const pub = await api.servers.getJson()
    types.value = pub.types
    versions.value = pub.versions
  } catch (e: any) {
    toast.error(e.response?.data || '获取服务器列表失败')
  }
}

// ── 表单 ──
const showFormDialog = ref(false)
const showDeleteConfirm = ref(false)
const editingServer = ref<Server | null>(null)
const isCreate = ref(false)

const form = ref({ uuid: '', name: '', type: '', version: '', icon: '', description: '', link: '', IP: '' })

onMounted(() => {
  fetchAdminServers()
})

function openCreate() {
  isCreate.value = true
  editingServer.value = null
  form.value = { uuid: '', name: '', type: '', version: '', icon: '', description: '', link: '', IP: '' }
  showFormDialog.value = true
}

function openEdit(server: Server) {
  isCreate.value = false
  editingServer.value = server
  form.value = {
    uuid: server.uuid,
    name: server.name,
    type: server.type,
    version: server.version,
    icon: server.icon,
    description: server.description,
    link: server.link,
    IP: server.IP || '',
  }
  showFormDialog.value = true
}

async function saveForm() {
  try {
    const data = { ...form.value, IP: form.value.IP || null }
    if (isCreate.value) {
      await api.servers.create(data)
      toast.success('服务器已创建')
    } else {
      await api.servers.edit(data as any)
      toast.success('服务器已更新')
    }
    showFormDialog.value = false
    fetchAdminServers()
  } catch (e: any) {
    toast.error(e.response?.data || '保存失败')
  }
}

function openDelete(server: Server) {
  editingServer.value = server
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!editingServer.value) return
  try {
    await api.servers.delete(editingServer.value.uuid)
    toast.success('服务器已删除')
    showDeleteConfirm.value = false
    fetchAdminServers()
  } catch (e: any) {
    toast.error(e.response?.data || '删除失败')
  }
}

// ── 转移所有权 ──
const showTransferDialog = ref(false)
const transferServer = ref<Server | null>(null)
const transferUserId = ref('')
const users = ref<UserInfo[]>([])

async function openTransfer(server: Server) {
  transferServer.value = server
  transferUserId.value = server.userid || ''
  try {
    users.value = await api.users.list()
  } catch {
    users.value = []
  }
  showTransferDialog.value = true
}

async function confirmTransfer() {
  if (!transferServer.value || !transferUserId.value) return
  try {
    await api.servers.transfer(transferServer.value.uuid, transferUserId.value)
    toast.success('所有权已转移')
    showTransferDialog.value = false
    fetchAdminServers()
  } catch (e: any) {
    toast.error(e.response?.data || '转移失败')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">服务器管理</h1>
      <div class="flex gap-2">
        <button @click="fetchAdminServers" class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors">
          <RefreshCw class="h-4 w-4" />
          刷新
        </button>
        <button @click="openCreate" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus class="h-4 w-4" />
          新建服务器
        </button>
      </div>
    </div>

    <div v-if="servers.length === 0" class="text-center py-20 text-muted-foreground">
      <p>暂无服务器</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="server in servers"
        :key="server.uuid"
        class="group relative rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow"
      >
        <!-- ServerCard 内联（含所有者信息 & 转移按钮） -->
        <div class="p-4">
          <div class="flex items-center gap-3 mb-3">
            <img
              :src="server.icon || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23666%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2260%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%2240%22%3E?%3C/text%3E%3C/svg%3E'"
              :alt="server.name"
              referrerpolicy="no-referrer"
              class="h-12 w-12 rounded-lg object-cover bg-muted"
              @error="(e: Event) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23666%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2260%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%2240%22%3E?%3C/text%3E%3C/svg%3E' }"
            />
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-sm truncate">{{ server.name }}</h3>
              <div class="flex gap-1 mt-1">
                <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
                  {{ server.type }}
                </span>
                <span class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {{ server.version }}
                </span>
              </div>
            </div>
          </div>

          <p class="text-sm text-muted-foreground line-clamp-3 mb-3">
            {{ server.description || '暂无描述' }}
          </p>

          <div class="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span class="truncate flex-1">{{ server.link }}</span>
            <span v-if="server.IP" class="text-xs text-muted-foreground">{{ server.IP }}</span>
          </div>

          <!-- 所有者信息 -->
          <div class="flex items-center justify-between text-xs border-t pt-2 mt-2">
            <span class="text-muted-foreground inline-flex items-center gap-1">
              <UserCog class="h-3 w-3" />
              所有者：{{ server.owner_name || server.userid || '未分配' }}
            </span>
            <button
              v-if="isSuperAdmin"
              @click="openTransfer(server)"
              class="inline-flex items-center gap-1 text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
              title="转移所有权"
            >
              <ArrowLeftRight class="h-3 w-3" />
              转移
            </button>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            @click="openEdit(server)"
            class="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent"
            title="编辑"
          >
            <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          </button>
          <button
            @click="openDelete(server)"
            class="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-destructive/10 hover:text-destructive"
            title="删除"
          >
            <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Form dialog -->
    <div v-if="showFormDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showFormDialog = false">
      <div class="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold mb-4">{{ isCreate ? '新建服务器' : '编辑服务器' }}</h2>
        <form @submit.prevent="saveForm">
        <div class="space-y-3">
          <div class="space-y-1.5">
            <label class="text-sm font-medium">名称 <span class="text-destructive">*</span></label>
            <input v-model="form.name" required class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">类型 <span class="text-destructive">*</span></label>
              <Combobox v-model="form.type" :options="types" placeholder="选择或输入类型" required />
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium">版本 <span class="text-destructive">*</span></label>
              <Combobox v-model="form.version" :options="versions" placeholder="选择或输入版本" required />
            </div>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">图标 URL <span class="text-destructive">*</span></label>
            <input v-model="form.icon" required class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">描述 <span class="text-destructive">*</span></label>
            <textarea v-model="form.description" required rows="3" class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">链接 <span class="text-destructive">*</span></label>
            <input v-model="form.link" required class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">连接地址(可选)</label>
            <input v-model="form.IP" class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button type="button" @click="showFormDialog = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button type="submit" class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">保存</button>
        </div>
        </form>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showDeleteConfirm = false">
      <div class="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg mx-4">
        <h2 class="text-lg font-semibold mb-2">确认删除</h2>
        <p class="text-sm text-muted-foreground mb-4">确定要删除服务器 "{{ editingServer?.name }}" 吗？此操作不可撤销。</p>
        <div class="flex justify-end gap-2">
          <button @click="showDeleteConfirm = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button @click="confirmDelete" class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90">删除</button>
        </div>
      </div>
    </div>

    <!-- Transfer ownership dialog -->
    <div v-if="showTransferDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showTransferDialog = false">
      <div class="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg mx-4">
        <h2 class="text-lg font-semibold mb-2">转移所有权</h2>
        <p class="text-sm text-muted-foreground mb-4">
          将服务器 "<strong>{{ transferServer?.name }}</strong>" 的所有权转移给其他用户。
        </p>
        <div class="space-y-3">
          <div class="space-y-1.5">
            <label class="text-sm font-medium">当前所有者</label>
            <input disabled :value="transferServer?.owner_name || transferServer?.userid || '未分配'" class="flex h-9 w-full rounded-md border bg-muted px-3 py-1 text-sm text-muted-foreground" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">新所有者 <span class="text-destructive">*</span></label>
            <select v-model="transferUserId" class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm">
              <option value="">请选择用户</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.name }} ({{ u.id }}) — 权限 {{ u.perm }}
              </option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button @click="showTransferDialog = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button @click="confirmTransfer" :disabled="!transferUserId" class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">确认转移</button>
        </div>
      </div>
    </div>
  </div>
</template>
