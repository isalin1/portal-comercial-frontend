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
