<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type ServerRequest } from '@/api'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import RequestStatusBadge from '@/components/RequestStatusBadge.vue'
import ReqTypeBadge from '@/components/ReqTypeBadge.vue'
import RequestServerName from '@/components/RequestServerName.vue'
import { Plus, Edit, Send, XCircle, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const requests = ref<ServerRequest[]>([])
const loading = ref(true)

onMounted(fetchRequests)

async function fetchRequests() {
  try {
    loading.value = true
    requests.value = await api.requests.list()
  } catch (e: any) {
    toast.error(e.response?.data || '获取申请列表失败')
  } finally {
    loading.value = false
  }
}

async function handleSubmit(id: string) {
  try {
    await api.requests.submit(id)
    toast.success('已提交审核')
    fetchRequests()
  } catch (e: any) {
    toast.error(e.response?.data || '提交失败')
  }
}

async function handleCancel(id: string) {
  try {
    await api.requests.cancel(id)
    toast.success('已撤回')
    fetchRequests()
  } catch (e: any) {
    toast.error(e.response?.data || '撤回失败')
  }
}

async function handleDelete(id: string) {
  if (!confirm('确定要删除这个草稿？')) return
  try {
    await api.requests.delete(id)
    toast.success('已删除')
    fetchRequests()
  } catch (e: any) {
    toast.error(e.response?.data || '删除失败')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">我的申请</h1>
      <button
        @click="router.push('/requests/new')"
        class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus class="h-4 w-4" />
        新建申请
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>

    <div v-else-if="requests.length === 0" class="text-center py-20 text-muted-foreground">
      <p>暂无申请记录</p>
      <button @click="router.push('/requests/new')" class="text-primary hover:underline mt-2 text-sm">去创建第一个申请</button>
    </div>

    <div v-else class="rounded-md border">
      <table class="w-full">
        <thead>
          <tr class="border-b bg-muted/50">
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">服务器名</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">操作类型</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">创建时间</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="req in requests" :key="req.id" class="border-b last:border-0">
            <td class="px-4 py-3"><RequestServerName :req="req" /></td>
            <td class="px-4 py-3"><ReqTypeBadge :type="req.req_type" /></td>
            <td class="px-4 py-3"><RequestStatusBadge :status="req.status" /></td>
            <td class="px-4 py-3 text-sm text-muted-foreground">{{ new Date(req.created_at).toLocaleDateString('zh-CN') }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button
                  v-if="req.status === 'draft' || req.status === 'rejected'"
                  @click="router.push(`/requests/${req.id}/edit`)"
                  class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent"
                  title="编辑"
                >
                  <Edit class="h-3 w-3" />
                  编辑
                </button>
                <button
                  v-if="req.status === 'draft'"
                  @click="handleSubmit(req.id)"
                  class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-green-500 hover:bg-green-500/10"
                  title="提交"
                >
                  <Send class="h-3 w-3" />
                  提交
                </button>
                <button
                  v-if="req.status === 'pending'"
                  @click="handleCancel(req.id)"
                  class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-yellow-500 hover:bg-yellow-500/10"
                  title="撤回"
                >
                  <XCircle class="h-3 w-3" />
                  撤回
                </button>
                <button
                  v-if="req.status === 'draft'"
                  @click="handleDelete(req.id)"
                  class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  title="删除"
                >
                  <Trash2 class="h-3 w-3" />
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>