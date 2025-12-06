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
    if (isAxiosError(error) && error.response?.status === 401) {
      return {
        ok: false,
        message: 'Usuario o Contraseña incorrectos',
      }
    }
    throw new Error('No se pudo realizar la peticion')
  }
}
