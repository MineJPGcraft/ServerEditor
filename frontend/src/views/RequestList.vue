<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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

const currentPage = ref(1)
const pageSize = 12

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

const totalPages = computed(() => Math.max(1, Math.ceil(requests.value.length / pageSize)))

const paginatedRequests = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return requests.value.slice(start, start + pageSize)
})

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

    <div v-else class="space-y-4">
      <div class="rounded-md border overflow-x-auto">
        <table class="w-full min-w-[640px]">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">服务器名</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">操作类型</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">状态</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">创建时间</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in paginatedRequests" :key="req.id" class="border-b last:border-0">
              <td class="px-4 py-3"><RequestServerName :req="req" /></td>
              <td class="px-4 py-3"><ReqTypeBadge :type="req.req_type" /></td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1">
                  <RequestStatusBadge :status="req.status" />
                  <span
                    v-if="req.status === 'rejected' && req.reject_reason"
                    class="text-xs text-destructive/90 break-all"
                  >
                    驳回原因：{{ req.reject_reason }}
                  </span>
                  <span
                    v-else-if="req.status === 'rejected'"
                    class="text-xs text-muted-foreground"
                  >
                    未提供驳回原因
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{{ new Date(req.created_at).toLocaleDateString('zh-CN') }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
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

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
        <button @click="currentPage = 1" :disabled="currentPage === 1" class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed" title="首页">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>
        </button>
        <button @click="currentPage--" :disabled="currentPage === 1" class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed" title="上一页">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <template v-for="p in totalPages" :key="p">
          <button
            v-if="p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)"
            @click="currentPage = p"
            :class="['inline-flex items-center justify-center h-8 min-w-[2rem] rounded-md text-sm', p === currentPage ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent']"
          >{{ p }}</button>
          <span v-else-if="p === currentPage - 3 || p === currentPage + 3" class="px-1 text-muted-foreground text-sm">...</span>
        </template>
        <button @click="currentPage++" :disabled="currentPage === totalPages" class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed" title="下一页">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed" title="末页">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m13 17 5-5-5-5"/><path d="m6 17 5-5-5-5"/></svg>
        </button>
        <span class="text-sm text-muted-foreground ml-2">共 {{ requests.length }} 条</span>
      </div>
    </div>
  </div>
</template>