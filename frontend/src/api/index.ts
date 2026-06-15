import axios from 'axios'

const http = axios.create({
  baseURL: '/',
  withCredentials: true,
})

export interface Server {
  uuid: string
  name: string
  type: string
  version: string
  icon: string
  description: string
  link: string
  IP: string | null
}

export interface OidcProvider {
  id: string
  name: string
  redirect_uri: string
  auth_url: string
}

export interface OidcProviderAdmin extends OidcProvider {
  secret: string
  perm: number | null
  frontend: string | null
  apipoint: string
}

export interface ServerListData {
  servers: Server[]
  types: string[]
  versions: string[]
}

export interface ServerRequest {
  id: string
  userid: string
  username?: string
  req_type: 'create' | 'edit' | 'delete'
  target_uuid: string | null
  target_name?: string | null
  data: Record<string, any>
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  reject_reason: string | null
}

export interface UserInfo {
  id: string
  name: string
  perm: number
}

export const api = {
  auth: {
    check: () => http.get('/api/auth/check').then(r => r.data),
    logout: () => http.post('/api/auth/logout').then(r => r.data),
    tokenLogin: (token: string) => http.post('/api/auth/token', { token }).then(r => r.data),
  },

  oidc: {
    list: () => http.get<OidcProvider[]>('/api/oidcConfig/list').then(r => r.data),
    adminList: () => http.get<OidcProviderAdmin[]>('/api/oidcConfig/admin/list').then(r => r.data),
    create: (data: Partial<OidcProviderAdmin>) =>
      http.post('/api/oidcConfig/admin/create', data).then(r => r.data),
    edit: (data: Partial<OidcProviderAdmin> & { id: string }) =>
      http.post('/api/oidcConfig/admin/edit', data).then(r => r.data),
    delete: (clientId: string) =>
      http.post('/api/oidcConfig/admin/delete', { clientId }).then(r => r.data),
  },

  servers: {
    getJson: () => http.get<ServerListData>('/api/getjson').then(r => r.data),
    create: (data: Partial<Server>) =>
      http.post('/api/admin/create', data).then(r => r.data),
    edit: (data: Partial<Server> & { uuid: string }) =>
      http.post('/api/admin/edit', data).then(r => r.data),
    delete: (uuid: string) =>
      http.post('/api/admin/delete', { uuid }).then(r => r.data),
  },

  requests: {
    list: () => http.get<ServerRequest[]>('/api/request/list').then(r => r.data),
    create: (data: { req_type: string; target_uuid?: string; data: Record<string, any> }) =>
      http.post('/api/request/create', data).then(r => r.data),
    edit: (data: { id: string; data: Record<string, any>; req_type?: string; target_uuid?: string }) =>
      http.post('/api/request/edit', data).then(r => r.data),
    submit: (id: string) =>
      http.post('/api/request/submit', { id }).then(r => r.data),
    cancel: (id: string) =>
      http.post('/api/request/cancel', { id }).then(r => r.data),
    delete: (id: string) =>
      http.post('/api/request/delete', { id }).then(r => r.data),
  },

  adminRequests: {
    list: () => http.get<ServerRequest[]>('/api/admin/request/list').then(r => r.data),
    edit: (data: { id: string; data?: Record<string, any>; req_type?: string; target_uuid?: string }) =>
      http.post('/api/admin/request/edit', data).then(r => r.data),
    approve: (id: string, forceCreate?: boolean) =>
      http.post('/api/admin/request/approve', { id, force_create: forceCreate }).then(r => r.data),
    reject: (id: string, reason?: string) =>
      http.post('/api/admin/request/reject', { id, reason }).then(r => r.data),
    submit: (id: string) =>
      http.post('/api/admin/request/submit', { id }).then(r => r.data),
  },

  users: {
    list: () => http.get<UserInfo[]>('/api/admin/user/list').then(r => r.data),
    edit: (id: string, perm: number) =>
      http.post('/api/admin/user/edit', { id, perm }).then(r => r.data),
    delete: (id: string) =>
      http.post('/api/admin/user/delete', { id }).then(r => r.data),
  },

  tags: {
    edit: (tag: string, data: string[]) =>
      http.post(`/api/admin/tag/${tag}/edit`, { tag: data }).then(r => r.data),
  },

  setup: {
    status: () => http.get('/api/setup/status').then(r => r.data),
    oidc: (data: Record<string, any>) =>
      http.post('/api/setup/oidc', data).then(r => r.data),
    promote: () => http.post('/api/setup/promote').then(r => r.data),
    promoteById: (userid: string) =>
      http.post('/api/setup/promote-by-id', { userid }).then(r => r.data),
  },
}