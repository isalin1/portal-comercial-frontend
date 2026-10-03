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
  const data = (error as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data
  const message = data?.message
  if (Array.isArray(message)) return message.join('. ')
  if (typeof message === 'string') return message
  return 'No se pudo completar la operación'
}
