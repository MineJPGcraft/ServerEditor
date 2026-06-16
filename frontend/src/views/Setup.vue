<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { toast } from 'vue-sonner'
import OidcForm from '@/components/OidcForm.vue'
import { CheckCircle2, AlertCircle, ChevronRight } from 'lucide-vue-next'

const router = useRouter()
const { checkAuth, perm } = useAuth()

type StepStatus = 'pending' | 'current' | 'done'
const currentStep = ref(0)

const setupActive = ref<boolean | null>(null) // null = unknown
const checkingStatus = ref(false)

const showOidcForm = ref(false)
const oidcInitial = ref<Record<string, any> | null>(null)

const steps = [
  { title: '检查初始化状态', desc: '确认系统是否需要初始化' },
  { title: '配置 OIDC 提供商', desc: '添加至少一个 OIDC 登录方式' },
  { title: 'OIDC 登录', desc: '通过配置的 OIDC 登录获取会话' },
  { title: '提升为管理员', desc: '将自己提升为超级管理员' },
]

onMounted(async () => {
  await checkSetupStatus()
  await checkAuth()
})

async function checkSetupStatus() {
  checkingStatus.value = true
  try {
    await api.setup.status()
    setupActive.value = true
  } catch {
    setupActive.value = false
  } finally {
    checkingStatus.value = false
  }
}

function getStepStatus(idx: number): StepStatus {
  if (idx < currentStep.value) return 'done'
  if (idx === currentStep.value) return 'current'
  return 'pending'
}

async function handleOidcSubmit(data: Record<string, any>) {
  try {
    await api.setup.oidc(data)
    toast.success('OIDC 已保存')
    showOidcForm.value = false
    currentStep.value = Math.max(currentStep.value, 2)
  } catch (e: any) {
    toast.error(e.response?.data || '保存 OIDC 失败')
  }
}

async function handlePromote() {
  try {
    await api.setup.promote()
    toast.success('已提升为超级管理员')
    await checkAuth()
    currentStep.value = 4
    setTimeout(() => router.push('/'), 1500)
  } catch (e: any) {
    toast.error(e.response?.data || '提升失败，请确保已登录')
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8">
    <!-- Not in setup mode -->
    <div v-if="setupActive === false" class="text-center py-20">
      <CheckCircle2 class="h-16 w-16 mx-auto mb-4 text-green-500" />
      <h1 class="text-2xl font-bold mb-2">系统已初始化</h1>
      <p class="text-muted-foreground mb-6">已经存在超级管理员，无需初始化。</p>
      <button @click="router.push('/')" class="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm text-primary-foreground hover:bg-primary/90">
        返回首页
      </button>
    </div>

    <!-- Setup mode -->
    <div v-else>
      <h1 class="text-2xl font-bold mb-2">系统初始化</h1>
      <p class="text-muted-foreground mb-8">按步骤完成初始化配置</p>

      <!-- Steps -->
      <div class="space-y-3 mb-8">
        <div
          v-for="(step, idx) in steps"
          :key="idx"
          @click="currentStep = idx"
          :class="[
            'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
            getStepStatus(idx) === 'current' ? 'border-primary bg-primary/5' : 'hover:bg-accent',
          ]"
        >
          <div
            :class="[
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium shrink-0',
              getStepStatus(idx) === 'done' ? 'bg-green-500 text-white' :
              getStepStatus(idx) === 'current' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            ]"
          >
            <CheckCircle2 v-if="getStepStatus(idx) === 'done'" class="h-4 w-4" />
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">{{ step.title }}</div>
            <div class="text-xs text-muted-foreground">{{ step.desc }}</div>
          </div>
          <ChevronRight class="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <!-- Step content -->
      <div class="rounded-lg border p-6">
        <!-- Step 0: Status -->
        <div v-if="currentStep === 0">
          <h2 class="font-semibold mb-3">初始化状态</h2>
          <div v-if="checkingStatus" class="text-muted-foreground">检查中...</div>
          <div v-else class="flex items-center gap-2">
            <AlertCircle class="h-5 w-5 text-yellow-500" />
            <span class="text-sm">系统尚未初始化，需要进行配置。</span>
          </div>
          <button @click="currentStep = 1" class="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            下一步
          </button>
        </div>

        <!-- Step 1: OIDC config -->
        <div v-else-if="currentStep === 1">
          <h2 class="font-semibold mb-3">配置 OIDC 提供商</h2>
          <p class="text-sm text-muted-foreground mb-4">添加一个 OIDC 提供商用于登录。</p>
          <button @click="showOidcForm = !showOidcForm" class="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent mb-4">
            {{ showOidcForm ? '收起表单' : '添加 OIDC 配置' }}
          </button>
          <OidcForm v-if="showOidcForm" :initial="oidcInitial" @submit="handleOidcSubmit" />
          <div class="flex gap-2 mt-4">
            <button @click="currentStep = 0" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
            <button @click="currentStep = 2" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
              下一步
            </button>
          </div>
        </div>

        <!-- Step 2: Login -->
        <div v-else-if="currentStep === 2">
          <h2 class="font-semibold mb-3">OIDC 登录</h2>
          <p class="text-sm text-muted-foreground mb-4">请通过刚才配置的 OIDC 提供商完成登录，登录后会自动跳回此页面。</p>
          <div class="rounded-md bg-secondary p-4 text-sm mb-4">
            当前状态：{{ perm !== null ? '已登录' : '未登录' }}
          </div>
          <button @click="router.push('/login')" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 mb-4">
            前往登录页
          </button>
          <div class="flex gap-2">
            <button @click="currentStep = 1" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
            <button @click="currentStep = 3" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
              下一步
            </button>
          </div>
        </div>

        <!-- Step 3: Promote -->
        <div v-else-if="currentStep === 3">
          <h2 class="font-semibold mb-3">提升为超级管理员</h2>
          <p class="text-sm text-muted-foreground mb-4">将当前登录用户提升为超级管理员，完成初始化。</p>
          <div v-if="perm === null" class="rounded-md bg-yellow-500/10 text-yellow-500 p-3 text-sm mb-4">
            请先完成上一步的登录。
          </div>
          <button
            @click="handlePromote"
            :disabled="perm === null"
            class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 mb-2"
          >
            提升自己为超级管理员
          </button>
          <div class="mt-4">
            <button @click="currentStep = 2" class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">上一步</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>