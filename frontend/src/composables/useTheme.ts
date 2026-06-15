import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const themeMode = ref<ThemeMode>('system')
const isDark = ref(true)

function applyTheme() {
  let dark: boolean
  if (themeMode.value === 'system') {
    dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  } else {
    dark = themeMode.value === 'dark'
  }
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

let mediaQuery: MediaQueryList | null = null
let mediaHandler: (() => void) | null = null

function startMediaListener() {
  if (mediaQuery) return
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaHandler = () => {
    if (themeMode.value === 'system') applyTheme()
  }
  mediaQuery.addEventListener('change', mediaHandler)
}

function stopMediaListener() {
  if (mediaQuery && mediaHandler) {
    mediaQuery.removeEventListener('change', mediaHandler)
  }
  mediaQuery = null
  mediaHandler = null
}

watch(themeMode, (mode) => {
  localStorage.setItem(STORAGE_KEY, mode)
  applyTheme()
  // system 模式下需要监听浏览器偏好变化
  if (mode === 'system') startMediaListener()
  else stopMediaListener()
})

export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  themeMode.value = stored ?? 'system'
  applyTheme()
  if (themeMode.value === 'system') startMediaListener()
}

export function useTheme() {
  function setTheme(mode: ThemeMode) {
    themeMode.value = mode
  }

  function cycleTheme() {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const idx = order.indexOf(themeMode.value)
    themeMode.value = order[(idx + 1) % order.length]
  }

  return {
    themeMode,
    isDark,
    setTheme,
    cycleTheme,
  }
}
