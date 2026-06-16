<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type OidcProviderAdmin } from '@/api'
import { toast } from 'vue-sonner'
import OidcForm from '@/components/OidcForm.vue'
import { Plus, RefreshCw, Edit, Trash2, Key } from 'lucide-vue-next'

const providers = ref<OidcProviderAdmin[]>([])
const loading = ref(true)

const showFormDialog = ref(false)
const showDeleteConfirm = ref(false)
const editingProvider = ref<Partial<OidcProviderAdmin> | null>(null)
const isCreate = ref(false)
const deletingProvider = ref<OidcProviderAdmin | null>(null)

onMounted(fetchProviders)

async function fetchProviders() {
  try {
    loading.value = true
    providers.value = await api.oidc.adminList()
  } catch (e: any) {
    toast.error(e.response?.data || '获取 OIDC 列表失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  isCreate.value = true
  editingProvider.value = null
  showFormDialog.value = true
}

function openEdit(p: OidcProviderAdmin) {
  isCreate.value = false
  editingProvider.value = { ...p }
  showFormDialog.value = true
}

async function handleSubmit(data: Partial<OidcProviderAdmin>) {
  try {
    if (isCreate.value) {
      await api.oidc.create(data)
      toast.success('OIDC 已创建')
    } else if (data.id === undefined) {
      toast.error('缺少 OIDC ID')
      return
    } else if (data.secret) {
      // 填了新 secret → 走可改 secret 的编辑接口
      await api.oidc.edit(data as any)
      toast.success('OIDC 已更新')
    } else {
      // 未填 secret → 走不修改 secret 的接口，避免被覆盖
      const { secret: _omit, ...rest } = data
      await api.oidc.editNoSecret(rest as any)
      toast.success('OIDC 已更新（Secret 未改动）')
    }
    showFormDialog.value = false
    fetchProviders()
  } catch (e: any) {
    toast.error(e.response?.data || '保存失败')
  }
}

function openDelete(p: OidcProviderAdmin) {
  deletingProvider.value = p
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deletingProvider.value) return
  try {
    await api.oidc.delete(deletingProvider.value.id)
    toast.success('OIDC 已删除')
    showDeleteConfirm.value = false
    fetchProviders()
  } catch (e: any) {
    toast.error(e.response?.data || '删除失败')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">OIDC 配置</h1>
      <div class="flex gap-2">
        <button @click="fetchProviders" class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors">
          <RefreshCw class="h-4 w-4" />
          刷新
        </button>
        <button @click="openCreate" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus class="h-4 w-4" />
          新建
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>

    <div v-else-if="providers.length === 0" class="text-center py-20 text-muted-foreground">
      <Key class="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>暂无 OIDC 配置</p>
    </div>

    <div v-else class="rounded-md border">
      <table class="w-full">
        <thead>
          <tr class="border-b bg-muted/50">
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">名称</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">权限</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Auth URL</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in providers" :key="p.id" class="border-b last:border-0">
            <td class="px-4 py-3 text-xs font-mono text-muted-foreground">{{ p.id }}</td>
            <td class="px-4 py-3 text-sm font-medium">{{ p.name }}</td>
            <td class="px-4 py-3 text-sm">{{ p.perm ?? '默认' }}</td>
            <td class="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">{{ p.auth_url }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button @click="openEdit(p)" class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent">
                  <Edit class="h-3 w-3" />
                  编辑
                </button>
                <button @click="openDelete(p)" class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                  <Trash2 class="h-3 w-3" />
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Form dialog -->
    <div v-if="showFormDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showFormDialog = false">
      <div class="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-semibold mb-4">{{ isCreate ? '新建 OIDC' : '编辑 OIDC' }}</h2>
        <OidcForm :mode="isCreate ? 'create' : 'edit'" :initial="editingProvider" @submit="handleSubmit" />
        <div class="flex justify-start mt-4">
          <button @click="showFormDialog = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showDeleteConfirm = false">
      <div class="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg mx-4">
        <h2 class="text-lg font-semibold mb-2">确认删除</h2>
        <p class="text-sm text-muted-foreground mb-4">确定要删除 OIDC "{{ deletingProvider?.name }}" 吗？</p>
        <div class="flex justify-end gap-2">
          <button @click="showDeleteConfirm = false" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">取消</button>
          <button @click="confirmDelete" class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>