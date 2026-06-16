<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useServers } from '@/composables/useServers'
import { api, type Server } from '@/api'
import { toast } from 'vue-sonner'
import ServerCard from '@/components/ServerCard.vue'
import Combobox from '@/components/Combobox.vue'
import { Plus, RefreshCw } from 'lucide-vue-next'

const { servers, types, versions, fetchServers } = useServers()

const showFormDialog = ref(false)
const showDeleteConfirm = ref(false)
const editingServer = ref<Server | null>(null)
const isCreate = ref(false)

const form = ref({ uuid: '', name: '', type: '', version: '', icon: '', description: '', link: '', IP: '' })

onMounted(() => {
  fetchServers()
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
    fetchServers()
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
    fetchServers()
  } catch (e: any) {
    toast.error(e.response?.data || '删除失败')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">服务器管理</h1>
      <div class="flex gap-2">
        <button @click="fetchServers" class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors">
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
      <ServerCard
        v-for="server in servers"
        :key="server.uuid"
        :server="server"
        :is-admin="true"
        :is-logged-in="true"
        @edit="openEdit"
        @delete="openDelete"
      />
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
            <label class="text-sm font-medium">IP (可选)</label>
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
  </div>
</template>