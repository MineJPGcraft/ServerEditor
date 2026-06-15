import { ref } from 'vue'
import { api, type ServerListData } from '@/api'

const servers = ref<ServerListData['servers']>([])
const types = ref<string[]>([])
const versions = ref<string[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useServers() {
  async function fetchServers() {
    try {
      loading.value = true
      error.value = null
      const data = await api.servers.getJson()
      servers.value = data.servers
      types.value = data.types
      versions.value = data.versions
    } catch (e: any) {
      error.value = e.message || '获取服务器列表失败'
    } finally {
      loading.value = false
    }
  }

  return {
    servers,
    types,
    versions,
    loading,
    error,
    fetchServers,
  }
}