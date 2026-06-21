<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import type { OidcProviderAdmin } from '@/api'
import { isValidPerm, isValidUrl } from '@/utils/validate'
import { toast } from 'vue-sonner'
import { Search, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  initial: Partial<OidcProviderAdmin> | null
  // create = 新建（secret 必填）；edit = 编辑（secret 可选，留空表示不修改）
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  submit: [data: Partial<OidcProviderAdmin>]
}>()

const isEdit = computed(() => props.mode === 'edit')

const form = ref({
  id: '',
  name: '',
  secret: '',
  perm: null as number | null,
  frontend: '' as string | null,
  redirect_uri: '',
  apipoint: '',
  auth_url: '',
})

// 自动探测：输入 OIDC issuer URL，拉取 .well-known/openid-configuration
const issuerUrl = ref('')
const discovering = ref(false)

watch(
  () => props.initial,
  (val) => {
    if (val) {
      form.value = { ...form.value, ...val }
      // 编辑模式下后端 admin/list 返回的 secret 是脱敏占位（"qwq"），清空以触发"留空=不修改"语义
      if (isEdit.value) form.value.secret = ''
    }
  },
  { immediate: true }
)

async function discover() {
  let base = issuerUrl.value.trim()
  if (!base) {
    toast.error('请先输入 Issuer URL')
    return
  }
  // 规范化：去掉末尾斜杠
  base = base.replace(/\/+$/, '')
  const discoveryUrl = `${base}/.well-known/openid-configuration`

  discovering.value = true
  try {
    const { data } = await axios.get(discoveryUrl, { timeout: 10000 })
    if (data.authorization_endpoint) form.value.auth_url = data.authorization_endpoint
    if (data.token_endpoint) form.value.apipoint = data.token_endpoint
    if (!form.value.name && data.issuer) {
      // 用 issuer 主机名作为默认名称
      try {
        form.value.name = new URL(data.issuer).hostname
      } catch {
        form.value.name = data.issuer
      }
    }
    toast.success('已自动探测并填充 Auth URL 和 API Point')
  } catch (e: any) {
    const msg = e.response
      ? `探测失败 (${e.response.status})`
      : e.code === 'ERR_NETWORK'
        ? '网络/CORS 错误：目标站点可能不允许跨域访问，请手动填写'
        : '探测失败：' + (e.message || '未知错误')
    toast.error(msg)
  } finally {
    discovering.value = false
  }
}

function handleSubmit() {
  // perm 校验：填了就必须是 0-3
  if (form.value.perm !== null && form.value.perm !== undefined && !isValidPerm(form.value.perm)) {
    toast.error('权限等级必须是 0-3 的整数')
    return
  }
  // URL 协议校验
  if (form.value.auth_url && !isValidUrl(form.value.auth_url)) {
    toast.error('Auth URL 必须是 http:// 或 https:// 开头')
    return
  }
  if (form.value.apipoint && !isValidUrl(form.value.apipoint)) {
    toast.error('API Point 必须是 http:// 或 https:// 开头')
    return
  }
  if (form.value.redirect_uri && !isValidUrl(form.value.redirect_uri)) {
    toast.error('Redirect URI 必须是 http:// 或 https:// 开头')
    return
  }
  if (form.value.frontend && !isValidUrl(form.value.frontend)) {
    toast.error('Frontend URL 必须是 http:// 或 https:// 开头')
    return
  }
  // perm 为空时不覆盖，后端按 OIDC 提供商 perm 与用户 perm 取最大值
  const payload: Partial<OidcProviderAdmin> = {
    ...form.value,
    perm: form.value.perm === null ? undefined : form.value.perm,
  }
  // 编辑模式下，secret 留空 = 不修改；此时不要把 secret 发给后端（由父组件改走 edit-nosecret）
  if (isEdit.value && !form.value.secret) {
    delete (payload as any).secret
  }
  emit('submit', payload)
}

// 提交按钮是否可用：新建需填 secret；编辑时可留空
const submitDisabled = computed(() => !isEdit.value && !form.value.secret)
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- 自动探测区 -->
    <div class="rounded-md border border-dashed p-3 space-y-2 bg-muted/30">
      <label class="text-sm font-medium flex items-center gap-1.5">
        <Search class="h-3.5 w-3.5" />
        自动探测（可选）
      </label>
      <p class="text-xs text-muted-foreground">
        输入 OIDC Issuer URL（如 https://auth.example.com），点击探测可自动填充下方 Auth URL 与 API Point。
      </p>
      <div class="flex gap-2">
        <input
          v-model="issuerUrl"
          placeholder="https://auth.example.com"
          class="flex h-9 flex-1 rounded-md border bg-transparent px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          :disabled="discovering"
          @click="discover"
          class="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          <Loader2 v-if="discovering" class="h-3.5 w-3.5 animate-spin" />
          探测
        </button>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-1.5">
        <label class="text-sm font-medium">Client ID</label>
        <input
          v-model="form.id"
          required
          class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">名称</label>
        <input
          v-model="form.name"
          required
          class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">
          Secret
          <span v-if="isEdit" class="text-xs font-normal text-muted-foreground">（留空表示不修改）</span>
        </label>
        <input
          v-model="form.secret"
          :required="!isEdit"
          :placeholder="isEdit ? '留空则保持原 Secret 不变' : '请输入 Secret'"
          class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">权限等级</label>
        <input
          v-model.number="form.perm"
          type="number"
          class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">Redirect URI</label>
        <input
          v-model="form.redirect_uri"
          required
          class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">API Point</label>
        <input
          v-model="form.apipoint"
          required
          class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div class="space-y-1.5 sm:col-span-2">
        <label class="text-sm font-medium">Auth URL</label>
        <input
          v-model="form.auth_url"
          required
          class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-sm font-medium">Frontend URL (可选)</label>
        <input
          v-model="form.frontend"
          class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
    <button
      type="submit"
      :disabled="submitDisabled"
      class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      保存
    </button>
  </form>
</template>