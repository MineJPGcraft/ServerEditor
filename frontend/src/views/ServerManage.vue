<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { api, type Server, type UserInfo } from '@/api'
import { useAuth } from '@/composables/useAuth'
import { toast } from 'vue-sonner'
import Combobox from '@/components/Combobox.vue'
import { Plus, RefreshCw, UserCog, ArrowLeftRight, Search, GripVertical, X, Image } from 'lucide-vue-next'

const { isSuperAdmin } = useAuth()

const servers = ref<Server[]>([])
const types = ref<string[]>([])
const versions = ref<string[]>([])

const searchName = ref('')
const filterType = ref('')
const filterVersion = ref('')
const currentPage = ref(1)
const pageSize = 12

// ── 图片拖拽状态 ──
const drag = ref<{
  index: number
  startX: number
  startY: number
  pointerId: number
  started: boolean
} | null>(null)
const dragOverIndex = ref<number | null>(null)
const ghost = ref<{ text: string; x: number; y: number } | null>(null)
const DRAG_THRESHOLD = 6

function getPictures() { return pictureList.value }
function onPointerDown(index: number, e: PointerEvent) {
  if (e.button !== undefined && e.button !== 0) return
  const pics = getPictures()
  drag.value = { index, startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, started: false }
  ghost.value = { text: pics[index], x: e.clientX, y: e.clientY }
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}
function onPointerMove(e: PointerEvent) {
  if (!drag.value || e.pointerId !== drag.value.pointerId) return
  const dx = e.clientX - drag.value.startX, dy = e.clientY - drag.value.startY
  if (!drag.value.started) { if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return; drag.value.started = true }
  e.preventDefault()
  if (ghost.value) { ghost.value.x = e.clientX; ghost.value.y = e.clientY }
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const picEl = el?.closest('[data-pic-index]') as HTMLElement | null
  if (!picEl) { dragOverIndex.value = null; return }
  const overIndex = Number(picEl.dataset.picIndex)
  if (Number.isNaN(overIndex)) { dragOverIndex.value = null; return }
  dragOverIndex.value = overIndex
  if (overIndex !== drag.value.index) {
    const arr = [...pictureList.value]
    const [moved] = arr.splice(drag.value.index, 1)
    arr.splice(overIndex, 0, moved)
    pictureList.value = arr
    drag.value.index = overIndex
  }
}
function onPointerUp(e: PointerEvent) {
  if (!drag.value || e.pointerId !== drag.value.pointerId) return
  endDrag()
}
function endDrag() {
  drag.value = null; dragOverIndex.value = null; ghost.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}
onBeforeUnmount(() => { endDrag() })

function safeUrl(v: string | null | undefined): string | null {
  if (!v) return null
  const s = String(v).trim()
  try { const u = new URL(s); if (u.protocol === 'http:' || u.protocol === 'https:') return s; return null } catch { return null }
}
function safeIcon(v: string | null | undefined): string {
  if (!v) return ''
  const s = String(v).trim()
  if (/^data:image\//i.test(s) && !/^data:image\/svg/i.test(s)) return s
  return safeUrl(s) ?? ''
}
const fallbackIcon = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23666%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2260%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%2240%22%3E?%3C/text%3E%3C/svg%3E"

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

// ── 表单 ──
const showFormDialog = ref(false)
const showDeleteConfirm = ref(false)
const editingServer = ref<Server | null>(null)
const isCreate = ref(false)

const form = ref({ uuid: '', name: '', type: '', version: '', icon: '', description: '', link: '', IP: '' })
const pictureList = ref<string[]>([])
const newPicture = ref('')

onMounted(() => {
  fetchAdminServers()
})

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

function openCreate() {
  isCreate.value = true
  editingServer.value = null
  form.value = { uuid: '', name: '', type: '', version: '', icon: '', description: '', link: '', IP: '' }
  pictureList.value = []
  newPicture.value = ''
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
  pictureList.value = Array.isArray(server.picture) ? [...server.picture] : []
  newPicture.value = ''
  showFormDialog.value = true
}

async function saveForm() {
  try {
    const data = { ...form.value, IP: form.value.IP || null, picture: pictureList.value }
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

    <div v-if="filteredServers.length === 0" class="text-center py-20 text-muted-foreground">
      <p>暂无服务器</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="server in paginatedServers"
        :key="server.uuid"
        class="group relative rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      >
        <div class="p-4">
          <div class="flex items-center gap-3 mb-3 min-w-0">
            <img
              :src="safeIcon(server.icon) || fallbackIcon"
              :alt="server.name"
              referrerpolicy="no-referrer"
              class="h-12 w-12 rounded-lg object-cover bg-muted shrink-0"
              @error="(e: Event) => { (e.target as HTMLImageElement).src = fallbackIcon }"
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

          <p class="text-sm text-muted-foreground line-clamp-3 mb-3 break-words whitespace-pre-line">
            {{ server.description || '暂无描述' }}
          </p>

          <!-- 图片缩略图横条 -->
          <div v-if="server.picture && server.picture.length > 0" class="flex gap-1 mb-3 overflow-x-auto">
            <img
              v-for="(pic, idx) in server.picture.slice(0, 4)"
              :key="idx"
              :src="pic"
              referrerpolicy="no-referrer"
              class="h-10 w-10 rounded object-cover bg-muted shrink-0"
              @error="(e: Event) => { (e.target as HTMLImageElement).style.display='none' }"
            />
            <span v-if="server.picture.length > 4" class="text-xs text-muted-foreground self-center shrink-0">+{{ server.picture.length - 4 }}</span>
          </div>

          <div class="flex items-center gap-2 text-xs text-muted-foreground mb-2 min-w-0">
            <span class="truncate flex-1">{{ server.link }}</span>
            <span v-if="server.IP" class="text-xs text-muted-foreground shrink-0">{{ server.IP }}</span>
          </div>
          <div class="flex items-center justify-between text-xs border-t pt-2 mt-2 min-w-0">
            <span class="text-muted-foreground inline-flex items-center gap-1 min-w-0">
              <UserCog class="h-3 w-3 shrink-0" />
              <span class="truncate">所有者：{{ server.owner_name || server.userid || '未分配' }}</span>
            </span>
            <button
              v-if="isSuperAdmin"
              @click="openTransfer(server)"
              class="inline-flex items-center gap-1 text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
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
          <!-- 图片列表 -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium">宣传图片 (可选, 拖拽排序)</label>
            <div class="flex flex-wrap gap-2 min-h-[40px]">
              <div
                v-for="(pic, i) in pictureList"
                :key="i"
                :data-pic-index="i"
                @pointerdown="onPointerDown(i, $event)"
                :class="[
                  'group inline-flex items-center gap-1.5 rounded-md bg-secondary pl-1.5 pr-2 py-1 text-sm transition-all touch-none select-none',
                  drag?.started && drag.index === i ? 'opacity-40' : '',
                  dragOverIndex === i ? 'ring-2 ring-primary' : ''
                ]"
              >
                <GripVertical class="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                <img
                  :src="pic"
                  referrerpolicy="no-referrer"
                  class="h-5 w-5 rounded object-cover bg-muted shrink-0"
                  @error="(e: Event) => { (e.target as HTMLImageElement).style.display='none' }"
                />
                <span class="max-w-[160px] truncate text-secondary-foreground">{{ pic }}</span>
                <button @click="removePicture(i)" @pointerdown.stop class="hover:text-destructive shrink-0">
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
            <select v-model="transferUserId" class="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm dark:bg-background dark:text-foreground">
              <option value="" class="bg-background text-foreground dark:bg-background dark:text-foreground">请选择用户</option>
              <option v-for="u in users" :key="u.id" :value="u.id" class="bg-background text-foreground dark:bg-background dark:text-foreground">
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

    <!-- 拖拽浮层 -->
    <Teleport to="body">
      <div
        v-if="ghost && drag?.started"
        class="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground shadow-lg opacity-90 max-w-[200px] truncate"
        :style="{ left: ghost.x + 'px', top: ghost.y + 'px' }"
      >
        {{ ghost.text }}
      </div>
    </Teleport>
  </div>
</template>
