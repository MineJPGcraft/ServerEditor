import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { routes, setupRouterGuards } from './router'
import { initTheme } from './composables/useTheme'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

setupRouterGuards(router)
initTheme()

const app = createApp(App)
app.use(router)
app.mount('#app')