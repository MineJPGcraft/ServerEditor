<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type ServerRequest } from '@/api'
import { toast } from 'vue-sonner'
import RequestStatusBadge from '@/components/RequestStatusBadge.vue'
import ReqTypeBadge from '@/components/ReqTypeBadge.vue'
import RequestServerName from '@/components/RequestServerName.vue'
import { Check, X, Eye, RefreshCw } from 'lucide-vue-next'

const requests = ref<ServerRequest[]>([])
const loading = ref(true)

// Approve flow state
const showForceDialog = ref(false)
const forceRequestId = ref<string | null>(null)
const showRejectDialog = ref(false)
const rejectRequestId = ref<string | null>(null)
const rejectReason = ref('')
// Detail dialog
const showDetailDialog = ref(false)
const detailRequest = ref<ServerRequest | null>(null)

onMounted(fetchRequests)

async function fetchRequests() {
  try {
    loading.value = true
    requests.value = await api.adminRequests.list()
  } catch (e: any) {
    toast.error(e.response?.data || '获取待审核列表失败')
  } finally {
    loading.value = false
  }
}

async function handleApprove(req: ServerRequest) {
  try {
    await api.adminRequests.approve(req.id)
    toast.success('已通过')
    fetchRequests()
  } catch (e: any) {
    if (e.response?.status === 409) {
      // target_not_found
      forceRequestId.value = req.id
      showForceDialog.value = true
    } else {
      toast.error(e.response?.data || '通过失败')
    }
  }
}

async function confirmForceCreate() {
  if (!forceRequestId.value) return
  try {
    await api.adminRequests.approve(forceRequestId.value, true)
    toast.success('已强制创建并通过')
    showForceDialog.value = false
    forceRequestId.value = null
    fetchRequests()
  } catch (e: any) {
    toast.error(e.response?.data || '强制创建失败')
  }
}

function openReject(id: string) {
  rejectRequestId.value = id
  rejectReason.value = ''
  showRejectDialog.value = true
}

async function confirmReject() {
  if (!rejectRequestId.value) return
  try {
    await api.adminRequests.reject(rejectRequestId.value, rejectReason.value)
    toast.success('已驳回')
    showRejectDialog.value = false
    rejectRequestId.value = null
    fetchRequests()
  } catch (e: any) {
    toast.error(e.response?.data || '驳回失败')
  }
}

</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">审核申请</h1>
      <button
        @click="fetchRequests"
        class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors"
      >
        <RefreshCw class="h-4 w-4" />
        刷新
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>

    <div v-else-if="requests.length === 0" class="text-center py-20 text-muted-foreground">
      <Check class="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>暂无待审核申请</p>
    </div>

    <div v-else class="rounded-md border overflow-x-auto">
      <table class="w-full min-w-[640px]">
        <thead>
          <tr class="border-b bg-muted/50">
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">服务器名</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">申请人</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">类型</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">提交时间</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="req in requests" :key="req.id" class="border-b last:border-0">
            <td class="px-4 py-3"><RequestServerName :req="req" /></td>
            <td class="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{{ req.username || req.userid }}</td>
            <td class="px-4 py-3"><ReqTypeBadge :type="req.req_type" /></td>
            <td class="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{{ new Date(req.created_at).toLocaleDateString('zh-CN') }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                <button
                  @click="detailRequest = req; showDetailDialog = true"
                  class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent"
                >
                  <Eye class="h-3 w-3" />
                  详情
                </button>
                <button
                  @click="handleApprove(req)"
                  class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-green-500 hover:bg-green-500/10"
                >
                  <Check class="h-3 w-3" />
                  通过
                </button>
                <button
                  @click="openReject(req.id)"
                  class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  <X class="h-3 w-3" />
                  驳回
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Detail dialog -->
    <div v-if="showDetailDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showDetailDialog = false">
      <div class="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg mx-4 max-h-[80vh] overflow-y-auto">
        <h2 class="text-lg font-semibold mb-4">申请详情</h2>
        <div v-if="detailRequest" class="space-y-2 text-sm">
          <div><span class="text-muted-foreground">类型:</span> {{ detailRequest.req_type }}</div>
          <div><span class="text-muted-foreground">目标:</span> {{ detailRequest.target_uuid || '新建' }}</div>
          <div v-for="(v, k) in detailRequest.data" :key="k" class="flex gap-2">
            <span class="text-muted-foreground shrink-0">{{ k }}:</span>
            <span class="break-all">{{ v }}</span>
          </div>
        </div>
        <div class="flex justify-end mt-6">
          <button @click="showDetailDialog = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">关闭</button>
        </div>
      </div>
    </div>

    <!-- Force create dialog -->
    <div v-if="showForceDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showForceDialog = false">
      <div class="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg mx-4">
        <h2 class="text-lg font-semibold mb-2">目标服务器已被删除</h2>
        <p class="text-sm text-muted-foreground mb-4">该申请指向的服务器已不存在，是否强制创建为新的服务器？</p>
        <div class="flex justify-end gap-2">
          <button @click="showForceDialog = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button @click="confirmForceCreate" class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">强制创建</button>
        </div>
      </div>
    </div>

    <!-- Reject dialog -->
    <div v-if="showRejectDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showRejectDialog = false">
      <div class="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg mx-4">
        <h2 class="text-lg font-semibold mb-2">驳回申请</h2>
        <p class="text-sm text-muted-foreground mb-3">请输入驳回理由（可选）</p>
        <textarea v-model="rejectReason" rows="3" class="flex w-full rounded-md border bg-transparent px-3 py-2 text-sm" placeholder="驳回理由..." />
        <div class="flex justify-end gap-2 mt-4">
          <button @click="showRejectDialog = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button @click="confirmReject" class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90">确认驳回</button>
        </div>
      </div>
    </div>
  </div>
</template>
