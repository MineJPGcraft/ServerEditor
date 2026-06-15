<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type OidcProvider } from '@/api'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { LogIn, Key } from 'lucide-vue-next'

const { tokenLogin } = useAuth()
const router = useRouter()

const providers = ref<OidcProvider[]>([])
const loading = ref(true)
const showTokenInput = ref(false)
const token = ref('')

onMounted(async () => {
  try {
    providers.value = await api.oidc.list()
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
})

function loginWith(provider: OidcProvider) {
  const redirectUri = encodeURIComponent(provider.redirect_uri)
  const url = `${provider.auth_url}?client_id=${provider.id}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile&state=${provider.id}`
  window.location.href = url
}

async function handleTokenLogin() {
  if (!token.value.trim()) return
  try {
    await tokenLogin(token.value.trim())
    toast.success('Token 登录成功')
    router.push('/')
  } catch (e: any) {
    toast.error(e.response?.data || 'Token 登录失败')
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-12">
    <div class="text-center mb-8">
      <LogIn class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h1 class="text-2xl font-bold mb-2">登录</h1>
      <p class="text-sm text-muted-foreground">选择一个 OIDC 提供商登录</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-10">
      <div class="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>

    <div v-else-if="providers.length === 0" class="text-center py-10 text-muted-foreground">
      <p>暂无可用的登录方式</p>
    </div>

    <div v-else class="space-y-3">
      <button
        v-for="p in providers"
        :key="p.id"
        @click="loginWith(p)"
        class="flex items-center gap-3 w-full rounded-lg border p-4 text-left hover:bg-accent transition-colors"
      >
        <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Key class="h-5 w-5 text-primary" />
        </div>
        <div>
          <div class="font-medium">{{ p.name }}</div>
          <div class="text-xs text-muted-foreground">点击跳转登录</div>
        </div>
      </button>
    </div>

    <!-- Token login -->
    <div class="mt-8 border-t pt-6">
      <button
        @click="showTokenInput = !showTokenInput"
        class="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {{ showTokenInput ? '收起' : '使用 Token 登录' }}
      </button>
      <div v-if="showTokenInput" class="flex gap-2 mt-3">
        <input
          v-model="token"
          type="password"
          placeholder="请输入 Token"
          class="flex h-9 flex-1 rounded-md border bg-transparent px-3 py-1 text-sm"
          @keyup.enter="handleTokenLogin"
        />
        <button
          @click="handleTokenLogin"
          class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          登录
        </button>
      </div>
    </div>
  </div>
</template>