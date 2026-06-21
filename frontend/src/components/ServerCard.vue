<script setup lang="ts">
import { computed } from 'vue'
import type { Server } from '@/api'
import { Pencil, Trash2, FilePen, FileX2, UserCog } from 'lucide-vue-next'

const props = defineProps<{
  server: Server
  isAdmin: boolean
  isLoggedIn: boolean
}>()

const emit = defineEmits<{
  edit: [server: Server]
  delete: [server: Server]
  requestEdit: [server: Server]
  requestDelete: [server: Server]
}>()

function copyIP(ip: string) {
  navigator.clipboard?.writeText(ip)
}

function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const v = String(value).trim()
  try {
    const u = new URL(v)
    if (u.protocol === 'http:' || u.protocol === 'https:') return v
    return null
  } catch {
    return null
  }
}

function safeIcon(value: string | null | undefined): string {
  if (!value) return ''
  const v = String(value).trim()
  if (/^data:image\//i.test(v) && !/^data:image\/svg/i.test(v)) return v
  return safeUrl(v) ?? ''
}

const safeLink = computed(() => safeUrl(props.server.link))
const safeIconUrl = computed(() => safeIcon(props.server.icon))
const fallbackIcon =
  "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23666%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2260%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%2240%22%3E?%3C/text%3E%3C/svg%3E"
</script>

<template>
  <div class="group relative rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow overflow-hidden">
    <div class="p-4">
      <div class="flex items-center gap-3 mb-3 min-w-0">
        <img
          :src="safeIconUrl || fallbackIcon"
          :alt="server.name"
          referrerpolicy="no-referrer"
          class="h-12 w-12 rounded-lg object-cover bg-muted shrink-0"
          @error="(e: Event) => { (e.target as HTMLImageElement).src = fallbackIcon }"
        />
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-sm truncate">{{ server.name }}</h3>
          <div class="flex gap-1 mt-1">
            <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
              {{ server.type }}
            </span>
            <span class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {{ server.version }}
            </span>
          </div>
        </div>
      </div>

      <p class="text-sm text-muted-foreground line-clamp-3 mb-3 break-words whitespace-pre-line">
        {{ server.description || '暂无描述' }}
      </p>

      <div class="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <a
          v-if="safeLink"
          :href="safeLink"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline truncate"
        >
          {{ server.link }}
        </a>
        <span v-else class="text-xs text-muted-foreground truncate">
          {{ server.link }}
        </span>
        <button
          v-if="server.IP"
          @click="copyIP(server.IP)"
          class="text-xs text-muted-foreground hover:text-foreground shrink-0"
          title="复制 连接地址"
        >
          {{ server.IP }}
        </button>
      </div>

      <div v-if="server.owner_name || server.userid" class="flex items-center gap-1 text-xs text-muted-foreground border-t pt-2 mt-2 min-w-0">
        <UserCog class="h-3 w-3 shrink-0" />
        <span class="truncate">{{ server.owner_name || server.userid }}</span>
      </div>
    </div>

    <div
      v-if="isLoggedIn"
      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 items-center"
    >
      <template v-if="isAdmin">
        <button
          @click="emit('edit', server)"
          class="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent"
          title="直接编辑"
        >
          <Pencil class="h-3.5 w-3.5" />
        </button>
        <button
          @click="emit('delete', server)"
          class="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background hover:bg-destructive/10 hover:text-destructive"
          title="直接删除"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </template>
      <template v-else>
        <button
          @click="emit('requestEdit', server)"
          class="h-7 w-7 inline-flex items-center justify-center rounded-md border border-dashed bg-background hover:bg-accent"
          title="申请修改（需审核）"
        >
          <FilePen class="h-3.5 w-3.5" />
        </button>
        <button
          @click="emit('requestDelete', server)"
          class="h-7 w-7 inline-flex items-center justify-center rounded-md border border-dashed bg-background hover:bg-destructive/10 hover:text-destructive"
          title="申请删除（需审核）"
        >
          <FileX2 class="h-3.5 w-3.5" />
        </button>
      </template>
    </div>
  </div>
</template>
