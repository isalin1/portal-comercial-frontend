import { lavanderiaApi } from '@/api/lavanderiaApi'
import type { AuthResponse } from '../interfaces/auth.response'
import type { User } from '../interfaces/user.interface'
import { isAxiosError } from 'axios'

export interface loginError {
  ok: false
  message: string
}
export interface loginSuccess {
  ok: true
  user: User
  token: string
}
export const loginAction = async (
  email: string,
  password: string,
): Promise<loginError | loginSuccess> => {
  try {
    // Log para verificar la baseURL
    console.log('Base URL:', import.meta.env.VITE_LAVANDERIA_API_URL)

    const { data } = await lavanderiaApi.post<AuthResponse>('/auth/login', {
      email,
      password,
    })
    console.log('Respuesta del backend:', data)
    return {
      ok: true,
      user: data.user,
      token: data.accessToken,
    }
  } catch (error) {
    console.error('Error en login:', error)
    if (isAxiosError(error)) {
      // Manejar error de CORS o conexión
      if (!error.response && (error.code === 'ERR_NETWORK' || error.message?.includes('CORS') || error.message?.includes('Network Error'))) {
        return {
          ok: false,
          message: 'Error de conexión con el servidor. Por favor, verifica que el backend esté disponible y la URL de la API esté correctamente configurada.',
        }
      }
      
      // Manejar error 401 (No autorizado - credenciales incorrectas)
      if (error.response?.status === 401) {
        return {
          ok: false,
          message: 'Usuario o Contraseña incorrectos',
        }
      }
      
      // Manejar error 403 (Prohibido - usuario inactivo, etc.)
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || 
          error.response?.data?.error || 
          'Acceso denegado. Contacte al administrador.'
        return {
          ok: false,
          message: errorMessage,
        }
      }
      
      // Manejar otros errores con mensaje del backend
      if (error.response?.data?.message) {
        return {
          ok: false,
          message: error.response.data.message,
        }
      }
      
      // Error genérico si no hay mensaje específico
      return {
        ok: false,
        message: `Error al iniciar sesión: ${error.response?.status ? `Código ${error.response.status}` : 'Error de conexión'}`,
      }
    }
    return {
      ok: false,
      message: 'No se pudo realizar la petición. Por favor, verifica tu conexión y que el backend esté disponible.',
    }
  }
}
