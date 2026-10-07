import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiError, http } from './api'
import type { AuthUser, UserType } from './types'

function readUser(): AuthUser | null {
  const raw = localStorage.getItem('portal_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

type PendingAcceptance = { email: string; password: string; whatsappUrl?: string }

const PENDING_KEY = 'portal_pending_acceptance'

function readPending(): PendingAcceptance | null {
  const raw = sessionStorage.getItem(PENDING_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingAcceptance
  } catch {
    return null
  }
}

let pendingAcceptance: PendingAcceptance | null = readPending()

export function needsTerms(user: AuthUser | null | undefined) {
  if (!user || (user.userType !== 'CLIENTE' && user.userType !== 'EMPRESARIO')) return false
  return user.termsAccepted !== true
}

export function safeNext(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return ''
  return value
}

export const usePortalAuth = defineStore('portalAuth', () => {
  const token = ref(localStorage.getItem('portal_token') || '')
  const user = ref<AuthUser | null>(readUser())

  const isAuthenticated = computed(() => Boolean(token.value && user.value))
  const userType = computed(() => user.value?.userType)
  const mustAcceptTerms = computed(() => isAuthenticated.value && needsTerms(user.value))

  function holdAcceptance(value: PendingAcceptance) {
    pendingAcceptance = value
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(value))
  }

  function peekAcceptance() {
    return pendingAcceptance || readPending()
  }

  function clearAcceptance() {
    pendingAcceptance = null
    sessionStorage.removeItem(PENDING_KEY)
  }

  function persist(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken
    user.value = nextUser
    localStorage.setItem('portal_token', nextToken)
    localStorage.setItem('portal_user', JSON.stringify(nextUser))
  }

  function setUser(nextUser: AuthUser) {
    if (!token.value) return
    const termsAccepted = typeof nextUser.termsAccepted === 'boolean' ? nextUser.termsAccepted : user.value?.termsAccepted
    persist(token.value, { ...nextUser, termsAccepted })
  }

  async function confirmTerms() {
    if (!user.value || user.value.termsAccepted === true) return
    if (user.value.userType !== 'CLIENTE' && user.value.userType !== 'EMPRESARIO') return
    try {
      const { data } = await http.get<{ termsAcceptedAt?: string | null }>(`/user/${user.value.id}`)
      if (data.termsAcceptedAt) setUser({ ...user.value, termsAccepted: true })
    } catch {
      // Si no se puede consultar, se mantiene la marca de esta sesión.
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    pendingAcceptance = null
    localStorage.removeItem('portal_token')
    localStorage.removeItem('portal_user')
  }

  async function login(email: string, password: string) {
    const { data } = await http.post<{ accessToken: string; user: AuthUser }>(
      '/auth/login',
      { email, password },
    )
    persist(data.accessToken, data.user)
    return data.user
  }

  async function register(payload: {
    firstName: string
    lastName: string
    phone: string
    email: string
    password: string
    userType: UserType
    plan?: string
    confirmUpgrade?: boolean
  }) {
    const { data } = await http.post<{ message: string; upgradedFromClient?: boolean; becameEmpresario?: boolean }>(
      '/auth/register',
      payload,
    )
    return data
  }

  function homeFor(type?: UserType) {
    if (type === 'EMPRESARIO' || type === 'ADMIN') return { name: 'panel' }
    return { name: 'home' }
  }

  return {
    token,
    user,
    isAuthenticated,
    userType,
    mustAcceptTerms,
    holdAcceptance,
    peekAcceptance,
    clearAcceptance,
    confirmTerms,
    login,
    register,
    logout,
    setUser,
    homeFor,
    apiError,
  }
})
