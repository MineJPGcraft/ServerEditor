<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useServers } from '@/composables/useServers'
import { api } from '@/api'
import { toast } from 'vue-sonner'
import { Plus, X, Save, RefreshCw, Tags, Layers } from 'lucide-vue-next'

const { types, versions, fetchServers } = useServers()

const localTypes = ref<string[]>([])
const localVersions = ref<string[]>([])
const newType = ref('')
const newVersion = ref('')
const savingType = ref(false)
const savingVersion = ref(false)

onMounted(async () => {
  await fetchServers()
  localTypes.value = [...types.value]
  localVersions.value = [...versions.value]
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
            v-for="t in localTypes"
            :key="t"
            class="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1 text-sm text-secondary-foreground"
          >
            {{ t }}
            <button @click="removeType(t)" class="hover:text-destructive">
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
            v-for="v in localVersions"
            :key="v"
            class="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1 text-sm text-secondary-foreground"
          >
            {{ v }}
            <button @click="removeVersion(v)" class="hover:text-destructive">
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
  </div>
</template>