import { lavanderiaApi } from '@/api/lavanderiaApi'
import type { AuthResponse } from '../interfaces/auth.response'
import type { User } from '../interfaces/user.interface'
import { isAxiosError } from 'axios'
import type { Roles } from '../interfaces/role.enum'

export interface RegisterError {
  ok: false
  message: string
}
export interface RegisterSuccess {
  ok: true
  user: User
  token: string
}
export const registerAction = async (
  email: string,
  password: string,
  firstname: string,
  lastname: string,
  dni: string,
  role: Roles,
  phone: string,
): Promise<RegisterError | RegisterSuccess> => {
  try {
    // Log para verificar la baseURL
    console.log('Base URL:', import.meta.env.VITE_LAVANDERIA_API_URL)

    const { data } = await lavanderiaApi.post<AuthResponse>('/auth/register', {
      email,
      password,
      firstname,
      lastname,
      dni,
      role,
      phone,
    })
    console.log('Respuesta del backend:', data)
    return {
      ok: true,
      user: data.user,
      token: data.accessToken,
    }
  } catch (error) {
    console.error('Error en register:', error)
    if (isAxiosError(error) && error.response?.status === 401) {
      return {
        ok: false,
        message: 'Usuario o Contraseña incorrectos',
      }
    }
    throw new Error('No se pudo realizar la peticion')
  }
}
