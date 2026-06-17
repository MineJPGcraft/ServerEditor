import { ref, computed } from 'vue'
import { api } from '@/api'

const perm = ref<number | null>(null)
const userId = ref<string | null>(null)
const userName = ref<string | null>(null)
const loading = ref(true)
let readyPromise: Promise<void> | null = null

export function useAuth() {
  const isLoggedIn = computed(() => perm.value !== null)
  const isAdmin = computed(() => perm.value !== null && perm.value >= 2)
  const isSuperAdmin = computed(() => perm.value !== null && perm.value >= 3)

  async function checkAuth() {
    try {
      loading.value = true
      const res = await api.auth.check()
      perm.value = res.perm
      userId.value = res.userId ?? null
      userName.value = res.userName ?? null
    } catch {
      perm.value = null
      userId.value = null
      userName.value = null
    } finally {
      loading.value = false
    }
  }

  function ensureReady(): Promise<void> {
    if (!readyPromise) {
      readyPromise = checkAuth().then(() => {})
    }
    return readyPromise
  }

  async function logout() {
    try {
      await api.auth.logout()
    } catch {
      // ignore
    }
    perm.value = null
    userId.value = null
    userName.value = null
  }

  async function tokenLogin(token: string) {
    await api.auth.tokenLogin(token)
    await checkAuth()
  }

  return {
    perm,
    userId,
    userName,
    loading,
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    checkAuth,
    ensureReady,
    logout,
    tokenLogin,
  }
}
