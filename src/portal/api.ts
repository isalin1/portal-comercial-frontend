import axios from 'axios'

const baseURL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_LAVANDERIA_API_URL ||
  'http://localhost:3002/api'

export const http = axios.create({ baseURL })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('portal_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = (error as { response?: { status?: number } })?.response?.status
    const url = String((error as { config?: { url?: string } })?.config?.url || '')
    const isLogin = url.includes('/auth/login') || url.includes('/auth/recuperar') || url.includes('/auth/restablecer')
    const hadSession = Boolean(localStorage.getItem('portal_token') || localStorage.getItem('portal_user'))
    if (status === 401 && !isLogin && hadSession && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('portal_token')
      localStorage.removeItem('portal_user')
      const next = window.location.pathname + window.location.search
      window.location.assign(`/login?redirect=${encodeURIComponent(next)}&aviso=sesion`)
    }
    return Promise.reject(error)
  },
)

export function apiError(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] | { code?: string; message?: string }; code?: string } } })
    ?.response?.data
  const message = data?.message
  if (Array.isArray(message)) return message.join('. ')
  if (message && typeof message === 'object') return message.message || 'No se pudo completar la operación'
  if (typeof message === 'string') return message
  return 'No se pudo completar la operación'
}

export function apiErrorCode(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string | string[] | { code?: string; message?: string }; code?: string } } })
    ?.response?.data
  if (!data) return ''
  if (typeof data.code === 'string' && data.code) return data.code
  const message = data.message
  if (message && typeof message === 'object' && !Array.isArray(message)) return message.code || ''
  return ''
}
