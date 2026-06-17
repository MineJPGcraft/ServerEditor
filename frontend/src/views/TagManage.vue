<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useServers } from '@/composables/useServers'
import { api } from '@/api'
import { toast } from 'vue-sonner'
import { Plus, X, Save, RefreshCw, Tags, Layers, ArrowDownAZ, ArrowUpAZ, GripVertical } from 'lucide-vue-next'

const { types, versions, fetchServers } = useServers()

const localTypes = ref<string[]>([])
const localVersions = ref<string[]>([])
const newType = ref('')
const newVersion = ref('')
const savingType = ref(false)
const savingVersion = ref(false)

type ListName = 'types' | 'versions'

// 拖拽状态
const drag = ref<{
  list: ListName
  index: number      // 当前正在移动元素的索引（会随重排更新）
  startX: number
  startY: number
  pointerId: number
  started: boolean   // 是否已超过阈值，真正进入拖拽
} | null>(null)

const dragOverIndex = ref<number | null>(null)
// 浮动跟随元素的样式
const ghost = ref<{ text: string; x: number; y: number } | null>(null)

const DRAG_THRESHOLD = 6 // 移动超过 6px 才算拖拽，避免误触影响点击删除

onMounted(async () => {
  await fetchServers()
  localTypes.value = [...types.value]
  localVersions.value = [...versions.value]
})

onBeforeUnmount(() => {
  removeGlobalListeners()
})

async function reload() {
  await fetchServers()
  localTypes.value = [...types.value]
  localVersions.value = [...versions.value]
  toast.success('已重新加载')
}

function addType() {
  const t = newType.value.trim()
  if (!t) return
  if (localTypes.value.includes(t)) {
    toast.error('类型已存在')
    return
  }
  localTypes.value.push(t)
  newType.value = ''
}

function removeType(t: string) {
  localTypes.value = localTypes.value.filter(x => x !== t)
}

function addVersion() {
  const v = newVersion.value.trim()
  if (!v) return
  if (localVersions.value.includes(v)) {
    toast.error('版本已存在')
    return
  }
  localVersions.value.push(v)
  newVersion.value = ''
}

function removeVersion(v: string) {
  localVersions.value = localVersions.value.filter(x => x !== v)
}

// ===== 字母排序 =====
function sortList(list: ListName, desc = false) {
  const target = list === 'types' ? localTypes : localVersions
  target.value = [...target.value].sort((a, b) => {
    const r = a.localeCompare(b, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
    return desc ? -r : r
  })
}

function getList(list: ListName) {
  return list === 'types' ? localTypes : localVersions
}

// ===== Pointer 拖拽（鼠标 + 触摸通用）=====
function onPointerDown(list: ListName, index: number, e: PointerEvent) {
  // 仅响应主键 / 单指
  if (e.button !== undefined && e.button !== 0) return
  const target = getList(list)
  drag.value = {
    list,
    index,
    startX: e.clientX,
    startY: e.clientY,
    pointerId: e.pointerId,
    started: false,
  }
  ghost.value = { text: target.value[index], x: e.clientX, y: e.clientY }
  addGlobalListeners()
}

function onPointerMove(e: PointerEvent) {
  if (!drag.value || e.pointerId !== drag.value.pointerId) return

  const dx = e.clientX - drag.value.startX
  const dy = e.clientY - drag.value.startY

  // 超过阈值才正式开始拖拽
  if (!drag.value.started) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    drag.value.started = true
  }

  // 拖拽中阻止页面滚动
  e.preventDefault()

  // 更新跟随浮层位置
  if (ghost.value) {
    ghost.value.x = e.clientX
    ghost.value.y = e.clientY
  }

  // 找到手指/鼠标下方的标签元素
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const tagEl = el?.closest('[data-drag-list]') as HTMLElement | null
  if (!tagEl) {
    dragOverIndex.value = null
    return
  }
  const overList = tagEl.dataset.dragList as ListName
  const overIndex = Number(tagEl.dataset.dragIndex)
  // 必须是同一列表
  if (overList !== drag.value.list || Number.isNaN(overIndex)) {
    dragOverIndex.value = null
    return
  }

  dragOverIndex.value = overIndex

  // 实时重排：把当前元素移动到目标位置
  if (overIndex !== drag.value.index) {
    const target = getList(drag.value.list)
    const arr = [...target.value]
    const [moved] = arr.splice(drag.value.index, 1)
    arr.splice(overIndex, 0, moved)
    target.value = arr
    drag.value.index = overIndex
  }
}

function onPointerUp(e: PointerEvent) {
  if (!drag.value || e.pointerId !== drag.value.pointerId) return
  endDrag()
}

function endDrag() {
  drag.value = null
  dragOverIndex.value = null
  ghost.value = null
  removeGlobalListeners()
}

function addGlobalListeners() {
  // passive: false 才能在 move 中 preventDefault 阻止滚动
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function removeGlobalListeners() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

async function saveTypes() {
  savingType.value = true
  try {
    await api.tags.edit('types', localTypes.value)
    toast.success('类型已保存')
    await fetchServers()
    localTypes.value = [...types.value]
  } catch (e: any) {
    toast.error(e.response?.data || '保存失败')
  } finally {
    savingType.value = false
  }
}

async function saveVersions() {
  savingVersion.value = true
  try {
    await api.tags.edit('versions', localVersions.value)
    toast.success('版本已保存')
    await fetchServers()
    localVersions.value = [...versions.value]
  } catch (e: any) {
    toast.error(e.response?.data || '保存失败')
  } finally {
    savingVersion.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Tag 管理</h1>
      <button @click="reload" class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors">
        <RefreshCw class="h-4 w-4" />
        重新加载
      </button>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <!-- Types -->
      <div class="rounded-lg border p-5 space-y-4">
        <div class="flex items-center gap-2">
          <Tags class="h-5 w-5 text-primary" />
          <h2 class="font-semibold">类型</h2>
          <span class="text-xs text-muted-foreground">({{ localTypes.length }})</span>
          <div class="ml-auto flex items-center gap-1">
            <button @click="sortList('types', false)" title="升序排列 (A→Z)"
              class="inline-flex items-center justify-center rounded-md border p-1.5 hover:bg-accent">
              <ArrowDownAZ class="h-4 w-4" />
            </button>
            <button @click="sortList('types', true)" title="降序排列 (Z→A)"
              class="inline-flex items-center justify-center rounded-md border p-1.5 hover:bg-accent">
              <ArrowUpAZ class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          <input
            v-model="newType"
            @keyup.enter="addType"
            placeholder="添加新类型..."
            class="flex h-9 flex-1 rounded-md border bg-transparent px-3 py-1 text-sm"
          />
          <button @click="addType" class="inline-flex items-center justify-center rounded-md border px-3 hover:bg-accent">
            <Plus class="h-4 w-4" />
          </button>
        </div>

        <div class="flex flex-wrap gap-2 min-h-[40px]">
          <span
            v-for="(t, i) in localTypes"
            :key="t"
            data-drag-list="types"
            :data-drag-index="i"
            @pointerdown="onPointerDown('types', i, $event)"
            :class="[
              'group inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm text-secondary-foreground transition-all touch-none select-none',
              drag?.started && drag.list === 'types' && drag.index === i ? 'opacity-40' : '',
              dragOverIndex === i && drag?.list === 'types' ? 'ring-2 ring-primary' : '',
            ]"
          >
            <GripVertical class="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 cursor-grab active:cursor-grabbing" />
            {{ t }}
            <button @click="removeType(t)" @pointerdown.stop class="hover:text-destructive">
              <X class="h-3 w-3" />
            </button>
          </span>
          <span v-if="localTypes.length === 0" class="text-sm text-muted-foreground">暂无类型</span>
        </div>

        <button
          @click="saveTypes"
          :disabled="savingType"
          class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Save class="h-4 w-4" />
          保存类型
        </button>
      </div>

      <!-- Versions -->
      <div class="rounded-lg border p-5 space-y-4">
        <div class="flex items-center gap-2">
          <Layers class="h-5 w-5 text-primary" />
          <h2 class="font-semibold">版本</h2>
          <span class="text-xs text-muted-foreground">({{ localVersions.length }})</span>
          <div class="ml-auto flex items-center gap-1">
            <button @click="sortList('versions', false)" title="升序排列 (A→Z)"
              class="inline-flex items-center justify-center rounded-md border p-1.5 hover:bg-accent">
              <ArrowDownAZ class="h-4 w-4" />
            </button>
            <button @click="sortList('versions', true)" title="降序排列 (Z→A)"
              class="inline-flex items-center justify-center rounded-md border p-1.5 hover:bg-accent">
              <ArrowUpAZ class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          <input
            v-model="newVersion"
            @keyup.enter="addVersion"
            placeholder="添加新版本..."
            class="flex h-9 flex-1 rounded-md border bg-transparent px-3 py-1 text-sm"
          />
          <button @click="addVersion" class="inline-flex items-center justify-center rounded-md border px-3 hover:bg-accent">
            <Plus class="h-4 w-4" />
          </button>
        </div>

        <div class="flex flex-wrap gap-2 min-h-[40px]">
          <span
            v-for="(v, i) in localVersions"
            :key="v"
            data-drag-list="versions"
            :data-drag-index="i"
            @pointerdown="onPointerDown('versions', i, $event)"
            :class="[
              'group inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm text-secondary-foreground transition-all touch-none select-none',
              drag?.started && drag.list === 'versions' && drag.index === i ? 'opacity-40' : '',
              dragOverIndex === i && drag?.list === 'versions' ? 'ring-2 ring-primary' : '',
            ]"
          >
            <GripVertical class="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 cursor-grab active:cursor-grabbing" />
            {{ v }}
            <button @click="removeVersion(v)" @pointerdown.stop class="hover:text-destructive">
              <X class="h-3 w-3" />
            </button>
          </span>
          <span v-if="localVersions.length === 0" class="text-sm text-muted-foreground">暂无版本</span>
        </div>

        <button
          @click="saveVersions"
          :disabled="savingVersion"
          class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Save class="h-4 w-4" />
          保存版本
        </button>
      </div>
    </div>

    <!-- 拖拽时跟随手指/鼠标的浮层 -->
    <Teleport to="body">
      <div
        v-if="ghost && drag?.started"
        class="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground shadow-lg opacity-90"
        :style="{ left: ghost.x + 'px', top: ghost.y + 'px' }"
      >
        {{ ghost.text }}
      </div>
    </Teleport>
  </div>
</template>