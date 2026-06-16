<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import { useServers } from '@/composables/useServers'
import { useAuth } from '@/composables/useAuth'
import Combobox from '@/components/Combobox.vue'
import { toast } from 'vue-sonner'
import { Save, Send } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { servers, types, versions, fetchServers } = useServers()
const { isLoggedIn } = useAuth()

// 编辑已有草稿：/requests/:id/edit
const requestId = computed(() => route.params.id as string | undefined)
// 基于已有服务器发起申请：/requests/new?target=<uuid>&mode=edit|delete
const target = computed(() => (route.query.target as string) || undefined)
const mode = computed(() => (route.query.mode as string) || 'edit')

const reqType = ref<'create' | 'edit' | 'delete'>('create')
const targetUuid = ref<string | null>(null)

const form = ref({
  name: '',
  type: '',
  version: '',
  icon: '',
  description: '',
  link: '',
  IP: '',
})

const loading = ref(false)

// 当前正在编辑的申请记录（用于在被驳回时展示驳回原因）
const requestRecord = ref<any>(null)

const isDelete = computed(() => reqType.value === 'delete')

const pageTitle = computed(() => {
  if (requestId.value) return '编辑申请'
  if (target.value && isDelete.value) return '申请删除服务器'
  if (target.value) return '申请修改服务器'
  return '新建申请'
})

onMounted(async () => {
  // 未登录用户不能发起申请，跳转登录
  if (!isLoggedIn.value) {
    toast.info('请先登录')
    router.replace('/login')
    return
  }
  await fetchServers()
  if (requestId.value) {
    // 加载已有草稿
    try {
      const requests = await api.requests.list()
      const existing = requests.find((r: any) => r.id === requestId.value)
      if (existing) {
        requestRecord.value = existing
        form.value = {
          name: existing.data.name || '',
          type: existing.data.type || '',
          version: existing.data.version || '',
          icon: existing.data.icon || '',
          description: existing.data.description || '',
          link: existing.data.link || '',
          IP: existing.data.IP || '',
        }
        reqType.value = existing.req_type
        targetUuid.value = existing.target_uuid
      }
    } catch {
      toast.error('获取申请数据失败')
    }
  } else if (target.value) {
    // 基于服务器发起修改/删除申请
    const server = servers.value.find(s => s.uuid === target.value)
    if (server) {
      form.value = {
        name: server.name,
        type: server.type,
        version: server.version,
        icon: server.icon,
        description: server.description,
        link: server.link,
        IP: server.IP || '',
      }
      reqType.value = mode.value === 'delete' ? 'delete' : 'edit'
      targetUuid.value = target.value
    } else {
      toast.error('未找到目标服务器')
      router.replace('/requests')
    }
  }
})

async function buildPayload() {
  // delete 类型后端只需 target_uuid，data 可空
  const data = isDelete.value ? {} : { ...form.value, IP: form.value.IP || null }
  return {
    req_type: reqType.value,
    target_uuid: targetUuid.value || undefined,
    data,
  }
}

async function saveDraft() {
  loading.value = true
  try {
    const payload = await buildPayload()
    if (requestId.value) {
      await api.requests.edit({
        id: requestId.value,
        data: payload.data,
        req_type: reqType.value,
        target_uuid: targetUuid.value || undefined,
      })
      toast.success('草稿已保存')
    } else {
      await api.requests.create(payload)
      toast.success('草稿已创建')
      router.push('/requests')
    }
  } catch (e: any) {
    toast.error(e.response?.data || '保存失败')
  } finally {
    loading.value = false
  }
}

async function submitRequest() {
  loading.value = true
  try {
    const payload = await buildPayload()
    if (requestId.value) {
      await api.requests.edit({
        id: requestId.value,
        data: payload.data,
        req_type: reqType.value,
        target_uuid: targetUuid.value || undefined,
      })
      await api.requests.submit(requestId.value)
    } else {
      const result = await api.requests.create(payload)
      await api.requests.submit(result.id)
    }
    toast.success('已提交审核')
    router.push('/requests')
  } catch (e: any) {
    toast.error(e.response?.data || '提交失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto space-y-6">
    <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>

    <div v-if="isDelete" class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 space-y-2">
      <p class="text-sm text-destructive font-medium">
        确认要申请删除服务器 "{{ form.name }}" 吗？
      </p>
      <p class="text-xs text-muted-foreground">
        删除申请提交后由管理员审核，审核通过后该服务器将被永久删除。
      </p>
    </div>
    <div v-else-if="reqType === 'edit'" class="rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs text-muted-foreground">
      修改申请：提交后将由管理员审核，审核通过后才会应用到服务器。
    </div>

    <!-- 上次被驳回的原因（仅在编辑被驳回的申请时展示） -->
    <div v-if="requestRecord?.status === 'rejected' && requestRecord.reject_reason" class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 space-y-1">
      <p class="text-sm text-destructive font-medium">上次驳回原因</p>
      <p class="text-xs text-destructive/90 break-all">{{ requestRecord.reject_reason }}</p>
    </div>

    <!-- 删除申请：只展示目标信息，不展示表单 -->
    <form @submit.prevent="submitRequest">
    <div v-if="!isDelete" class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium">服务器名称 <span class="text-destructive">*</span></label>
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
        <input v-model="form.icon" required class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" placeholder="https://example.com/icon.png" />
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">描述 <span class="text-destructive">*</span></label>
        <textarea v-model="form.description" required rows="4" class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm" placeholder="服务器描述..." />
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">链接 <span class="text-destructive">*</span></label>
        <input v-model="form.link" required class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" placeholder="https://..." />
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">IP (可选)</label>
        <input v-model="form.IP" class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" />
      </div>
    </div>

    <div class="flex justify-end gap-3 mt-6">
      <button
        type="button"
        @click="router.back()"
        class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent"
      >
        取消
      </button>
      <button
        v-if="!isDelete"
        type="button"
        @click="saveDraft"
        :disabled="loading"
        class="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
      >
        <Save class="h-4 w-4" />
        保存草稿
      </button>
      <button
        type="submit"
        :disabled="loading"
        :class="[
          'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm text-primary-foreground',
          isDelete ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90',
        ]"
      >
        <Send class="h-4 w-4" />
        {{ isDelete ? '提交删除申请' : '提交审核' }}
      </button>
    </div>
    </form>
  </div>
</template>