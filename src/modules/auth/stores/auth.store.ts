import { defineStore } from 'pinia'
import { AuthStatus } from '../interfaces/auth-status.enum'
import type { User } from '../interfaces/user.interface'
import { computed, ref } from 'vue'
import { loginAction } from '../actions/login.actions'

export const useAuthStore = defineStore('auth', () => {
  //Estados
  const authStatus = ref<AuthStatus>(AuthStatus.Checking)
  const user = ref<User | undefined>()
  const token = ref(localStorage.getItem('auth_token') || '')

  // Verificar si el token está expirado
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      return payload.exp < currentTime
    } catch (error) {
      console.error('Error al verificar token:', error)
      return true
    }
  }

  // Definir logout antes de checkAuthStatus para evitar errores de inicialización
  const logout = () => {
    authStatus.value = AuthStatus.Unauthenticated
    user.value = undefined
    token.value = ''

    // Limpiar localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')

    console.log('✅ Logout - Estado limpiado')
    return false
  }

  // Verificar token al inicializar
  const checkAuthStatus = () => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')

    if (savedToken && savedUser) {
      try {
        // Verificar si el token está expirado
        if (isTokenExpired(savedToken)) {
          console.log('❌ Token expirado, haciendo logout automático')
          logout()
          return
        }

        token.value = savedToken
        user.value = JSON.parse(savedUser)
        authStatus.value = AuthStatus.Authenticated
        console.log('✅ Estado de autenticación restaurado desde localStorage')
      } catch (error) {
        console.error('Error al restaurar estado de autenticación:', error)
        logout()
      }
    } else {
      authStatus.value = AuthStatus.Unauthenticated
      console.log('❌ No hay estado de autenticación guardado')
    }
  }

  // Verificar estado al inicializar
  checkAuthStatus()

  // Función para limpiar completamente el estado de autenticación
  const clearAuthState = () => {
    authStatus.value = AuthStatus.Unauthenticated
    user.value = undefined
    token.value = ''
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    console.log('🧹 Estado de autenticación completamente limpiado')
  }

  //Accciones (funciones que cambiar/actualizan los valores de los estados)
  const login = async (email: string, password: string) => {
    try {
      console.log('🔄 Intentando login con:', { email, password: '***' })
      
      const loginResp = await loginAction(email, password)
      
      console.log('📦 Respuesta de loginAction:', { 
        ok: loginResp.ok, 
        hasUser: !!loginResp.user,
        hasToken: !!loginResp.token,
        user: loginResp.user
      })
      
      if (!loginResp.ok) {
        console.log('❌ Login fallido - Credenciales incorrectas')
        return 'Usuario o contraseña incorrectos'
      }
      
      if (loginResp.user && loginResp.user.isActive === false) {
        console.log('❌ Login fallido - Usuario inactivo')
        return 'Usuario inactivo. Contacte al administrador.'
      }
      
      user.value = loginResp.user
      token.value = loginResp.token

      // Guardar en localStorage
      localStorage.setItem('auth_token', loginResp.token)
      localStorage.setItem('auth_user', JSON.stringify(loginResp.user))

      console.log('✅ Login exitoso - Token guardado:', token.value)
      console.log('✅ Usuario guardado:', user.value)
      authStatus.value = AuthStatus.Authenticated
      return true
    } catch (error) {
      console.error('❌ Error en login:', error)
      return logout()
    }
  }

  return {
    user,
    token,
    authStatus,

    //Getters (valores que dependen de procesar los estados)
    isChecking: computed(() => authStatus.value === AuthStatus.Checking),
    isAuthenticated: computed(() => authStatus.value === AuthStatus.Authenticated),

    userName: computed(() => user.value?.lastname),

    login,
    logout,
    clearAuthState,
  }
})
