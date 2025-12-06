export interface User {
  id: number
  firstname: string
  lastname: string
  phone: string
  isActive: boolean
  role: string
  email: string
  createdAt: string
  updatedAt: string
  clientBusinesId?: number | null
  business?: any[]
  pointsales?: any[]
  clientBusines?: {
    id: number
    name: string
  } | null
}
