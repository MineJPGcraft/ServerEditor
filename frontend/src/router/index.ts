import type { RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'ServerList',
    component: () => import('@/views/ServerList.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/requests',
    name: 'RequestList',
    component: () => import('@/views/RequestList.vue'),
    meta: { minPerm: 1 },
  },
  {
    path: '/requests/new',
    name: 'RequestCreate',
    component: () => import('@/views/RequestForm.vue'),
    meta: { minPerm: 1 },
  },
  {
    path: '/requests/:id/edit',
    name: 'RequestEdit',
    component: () => import('@/views/RequestForm.vue'),
    meta: { minPerm: 1 },
  },
  {
    path: '/admin/requests',
    name: 'RequestAdmin',
    component: () => import('@/views/RequestAdmin.vue'),
    meta: { minPerm: 2 },
  },
  {
    path: '/admin/servers',
    name: 'ServerManage',
    component: () => import('@/views/ServerManage.vue'),
    meta: { minPerm: 2 },
  },
  {
    path: '/admin/tags',
    name: 'TagManage',
    component: () => import('@/views/TagManage.vue'),
    meta: { minPerm: 2 },
  },
  {
    path: '/admin/users',
    name: 'UserAdmin',
    component: () => import('@/views/UserAdmin.vue'),
    meta: { minPerm: 3 },
  },
  {
    path: '/admin/oidc',
    name: 'OidcAdmin',
    component: () => import('@/views/OidcAdmin.vue'),
    meta: { minPerm: 3 },
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/views/Setup.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export async function setupRouterGuards(router: any) {
  const { ensureReady, perm } = useAuth()

  router.beforeEach(async (to: any) => {
    if (to.meta.minPerm === undefined) return true
    await ensureReady()
    const required = to.meta.minPerm as number
    if (perm.value === null || perm.value < required) {
      return { name: 'Login' }
    }
    return true
  })
}