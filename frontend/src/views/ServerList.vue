<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useServers } from '@/composables/useServers'
import { useAuth } from '@/composables/useAuth'
import { api, type Server } from '@/api'
import ServerCard from '@/components/ServerCard.vue'
import Combobox from '@/components/Combobox.vue'
import { toast } from 'vue-sonner'
import { Search, RefreshCw, Plus, X } from 'lucide-vue-next'

const { servers, types, versions, loading, fetchServers } = useServers()
const { isAdmin, isLoggedIn } = useAuth()
const router = useRouter()

const searchName = ref('')
const filterType = ref('')
const filterVersion = ref('')

// 分页
const currentPage = ref(1)
const pageSize = 12

// 普通用户：对卡片发起修改申请
function requestEdit(server: Server) {
  router.push({ path: '/requests/new', query: { target: server.uuid, mode: 'edit' } })
}

// 发起删除申请
function requestDelete(server: Server) {
  router.push({ path: '/requests/new', query: { target: server.uuid, mode: 'delete' } })
}

const filteredServers = computed(() => {
  return servers.value.filter(s => {
    if (searchName.value && !s.name.toLowerCase().includes(searchName.value.toLowerCase())) return false
    if (filterType.value && s.type !== filterType.value) return false
    if (filterVersion.value && s.version !== filterVersion.value) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredServers.value.length / pageSize)))

const paginatedServers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredServers.value.slice(start, start + pageSize)
})

watch([searchName, filterType, filterVersion], () => {
  currentPage.value = 1
})

// Edit/Delete dialog
const showEditDialog = ref(false)
const showDeleteConfirm = ref(false)
const editingServer = ref<Server | null>(null)
const editForm = ref({ name: '', type: '', version: '', icon: '', description: '', link: '', IP: '' })
const pictureList = ref<string[]>([])
const newPicture = ref('')

function addPicture() {
  const v = newPicture.value.trim()
  if (!v) return
  if (pictureList.value.includes(v)) { toast.error('图片链接已存在'); return }
  pictureList.value.push(v)
  newPicture.value = ''
}

function removePicture(index: number) {
  pictureList.value.splice(index, 1)
}

function openEdit(server: Server) {
  editingServer.value = server
  editForm.value = {
    name: server.name,
    type: server.type,
    version: server.version,
    icon: server.icon,
    description: server.description,
    link: server.link,
    IP: server.IP || '',
  }
  pictureList.value = Array.isArray(server.picture) ? [...server.picture] : []
  newPicture.value = ''
  showEditDialog.value = true
}

async function saveEdit() {
  if (!editingServer.value) return
  try {
    await api.servers.edit({ ...editForm.value, uuid: editingServer.value.uuid, IP: editForm.value.IP || null, picture: pictureList.value })
    toast.success('服务器已更新')
    showEditDialog.value = false
    fetchServers()
  } catch (e: any) {
    toast.error(e.response?.data || '更新失败')
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

onMounted(() => {
  fetchServers()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">服务器列表</h1>
      <button
        @click="fetchServers"
        class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors"
      >
        <RefreshCw class="h-4 w-4" />
        刷新
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          v-model="searchName"
          placeholder="搜索服务器名称..."
          class="flex h-9 w-full rounded-md border bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <select
        v-model="filterType"
        class="flex h-9 w-[140px] rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-background dark:text-foreground"
      >
        <option value="" class="bg-background text-foreground dark:bg-background dark:text-foreground">全部类型</option>
        <option v-for="t in types" :key="t" :value="t" class="bg-background text-foreground dark:bg-background dark:text-foreground">{{ t }}</option>
      </select>
      <select
        v-model="filterVersion"
        class="flex h-9 w-[140px] rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-background dark:text-foreground"
      >
        <option value="" class="bg-background text-foreground dark:bg-background dark:text-foreground">全部版本</option>
        <option v-for="v in versions" :key="v" :value="v" class="bg-background text-foreground dark:bg-background dark:text-foreground">{{ v }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>

    <!-- Empty -->
    <div v-else-if="filteredServers.length === 0" class="text-center py-20 text-muted-foreground">
      <p>暂无服务器</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ServerCard
        v-for="server in paginatedServers"
        :key="server.uuid"
        :server="server"
        :is-admin="isAdmin"
        :is-logged-in="isLoggedIn"
        @edit="openEdit"
        @delete="openDelete"
        @request-edit="requestEdit"
        @request-delete="requestDelete"
      />
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-2">
      <button
        @click="currentPage = 1"
        :disabled="currentPage === 1"
        class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        title="首页"
      >
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>
      </button>
      <button
        @click="currentPage--"
        :disabled="currentPage === 1"
        class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        title="上一页"
      >
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <template v-for="p in totalPages" :key="p">
        <button
          v-if="p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)"
          @click="currentPage = p"
          :class="[
            'inline-flex items-center justify-center h-8 min-w-[2rem] rounded-md text-sm',
            p === currentPage ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'
          ]"
        >
          {{ p }}
        </button>
        <span v-else-if="p === currentPage - 3 || p === currentPage + 3" class="px-1 text-muted-foreground text-sm">...</span>
      </template>

      <button
        @click="currentPage++"
        :disabled="currentPage === totalPages"
        class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        title="下一页"
      >
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
      </button>
      <button
        @click="currentPage = totalPages"
        :disabled="currentPage === totalPages"
        class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        title="末页"
      >
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m13 17 5-5-5-5"/><path d="m6 17 5-5-5-5"/></svg>
      </button>
      <span class="text-sm text-muted-foreground ml-2">
        共 {{ filteredServers.length }} 条
      </span>
    </div>

    <!-- Edit Dialog -->
    <div v-if="showEditDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showEditDialog = false">
      <div class="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold mb-4">编辑服务器</h2>
        <form @submit.prevent="saveEdit">
        <div class="space-y-3">
          <div class="space-y-1.5">
            <label class="text-sm font-medium">名称 <span class="text-destructive">*</span></label>
            <input v-model="editForm.name" required class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">类型 <span class="text-destructive">*</span></label>
              <Combobox v-model="editForm.type" :options="types" placeholder="选择或输入类型" required />
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium">版本 <span class="text-destructive">*</span></label>
              <Combobox v-model="editForm.version" :options="versions" placeholder="选择或输入版本" required />
            </div>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">图标 URL <span class="text-destructive">*</span></label>
            <input v-model="editForm.icon" required class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">描述 <span class="text-destructive">*</span></label>
            <textarea v-model="editForm.description" required rows="3" class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">链接 <span class="text-destructive">*</span></label>
            <input v-model="editForm.link" required class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium">IP (可选)</label>
            <input v-model="editForm.IP" class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" />
          </div>
          <!-- 图片列表 -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium">宣传图片 (可选)</label>
            <div class="flex flex-wrap gap-2 min-h-[40px]">
              <div
                v-for="(pic, i) in pictureList"
                :key="i"
                class="group inline-flex items-center gap-1.5 rounded-md bg-secondary pl-1.5 pr-2 py-1 text-sm"
              >
                <img
                  :src="pic"
                  referrerpolicy="no-referrer"
                  class="h-5 w-5 rounded object-cover bg-muted shrink-0"
                  @error="(e: Event) => { (e.target as HTMLImageElement).style.display='none' }"
                />
                <span class="max-w-[120px] truncate text-secondary-foreground">{{ pic }}</span>
                <button @click="removePicture(i)" class="hover:text-destructive shrink-0">
                  <X class="h-3 w-3" />
                </button>
              </div>
              <span v-if="pictureList.length === 0" class="text-sm text-muted-foreground">暂无图片</span>
            </div>
            <div class="flex gap-2 mt-1.5">
              <input
                v-model="newPicture"
                @keyup.enter="addPicture"
                placeholder="输入图片链接..."
                class="flex h-9 flex-1 rounded-md border bg-transparent px-3 py-1 text-sm"
              />
              <button type="button" @click="addPicture" class="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm hover:bg-accent">
                <Plus class="h-4 w-4" /> 添加
              </button>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button type="button" @click="showEditDialog = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button type="submit" class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">保存</button>
        </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirm -->
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
