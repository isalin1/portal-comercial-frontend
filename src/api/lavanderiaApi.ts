import axios from 'axios'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const lavanderiaApi = axios.create({
  baseURL: (import.meta.env.VITE_LAVANDERIA_API_URL as string) || 'http://localhost:3002/api',
})

// Debug: Verificar que las variables de entorno se carguen
console.log('🔧 API Base URL:', import.meta.env.VITE_LAVANDERIA_API_URL)
console.log('🔧 API Base URL Final:', lavanderiaApi.defaults.baseURL)

// Interceptor para agregar el token a cada petición
lavanderiaApi.interceptors.request.use((config) => {
  // IMPORTANTE: accede al store dentro del interceptor
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
    console.log('Token enviado en request:', authStore.token)
  } else {
    console.log('No hay token en el store')
  }
  return config
})

// Interceptor para manejar respuestas
lavanderiaApi.interceptors.response.use(
  (response) => {
    console.log('✅ Respuesta exitosa:', response.config.method?.toUpperCase(), response.config.url, response.status)
    return response
  },
  (error) => {
    console.error('❌ Error en respuesta:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, error.message)
    
    // Si el error es 401 (Unauthorized), el token puede estar expirado
    if (error.response?.status === 401) {
      console.log('🔒 Token expirado o inválido, limpiando estado y redirigiendo al login')
      const authStore = useAuthStore()
      authStore.clearAuthState()
      // Redirigir al login
      window.location.href = '/auth-presentation'
    }
    
    return Promise.reject(error)
  }
)

// Tipos de respuesta
export interface Program {
  id: number
  programname: string
  districtId: number
  district: {
    id: number
    name: string
    provinceId: number
    province: {
      id: number
      name: string
      departmentId: number
      department: {
        id: number
        name: string
      }
    }
  }
}

export interface Lot {
  id: number
  lotCode: string
  price: string
  area: string
  programId: number
  program: Program
}

export async function getProgramas(): Promise<Program[]> {
  const { data } = await lavanderiaApi.get('/programs')
  return data
}

export async function getLotesByPrograma(programId: number): Promise<Lot[]> {
  const { data } = await lavanderiaApi.get(`/lots/by-program/${programId}`)
  return data
}

export async function getTasaByMoneda(moneda: string): Promise<number> {
  const { data } = await lavanderiaApi.get(`/teas/by-money/${moneda}`)
  return parseFloat(data.teaValue)
}

export interface CalcularSimulacionPayload {
  [key: string]: unknown
}

export interface GuardarSimulacionPayload {
  [key: string]: unknown
}

export interface GuardarCotizacionPayload {
  [key: string]: unknown
}

export async function calcularSimulacion(payload: CalcularSimulacionPayload) {
  const { data } = await lavanderiaApi.post('/simulations/calculate', payload)
  return data
}

export async function guardarSimulacion(payload: GuardarSimulacionPayload) {
  const { data } = await lavanderiaApi.post('/simulations', payload)
  return data
}

export async function guardarCotizacion(payload: GuardarCotizacionPayload) {
  const { data } = await lavanderiaApi.post('/quotations', payload)
  return data
}

export async function getQuotationById(id: number) {
  const { data } = await lavanderiaApi.get(`/quotations/${id}`)
  return data
}

export async function getAllQuotations() {
  const { data } = await lavanderiaApi.get('/quotations')
  return data
}

export async function getFormQuotationBySimulationId(simulationId: number) {
  const { data } = await lavanderiaApi.get(`/quotations/simulation/${simulationId}/form-data`)
  return data
}

export async function getQuotationsByUser(userId: number) {
  const { data } = await lavanderiaApi.get(`/quotations/filtered?userId=${userId}`)
  return data
}

export interface CrearClientePayload {
  firstname: string
  lastname: string
  phone: string
  dni?: string
  email?: string
  password?: string
  role?: string
  isActive?: boolean
  isEmailVerified?: boolean
  department?: string
  province?: string
  district?: string
  address?: string
}

export async function crearCliente(payload: CrearClientePayload) {
  const { data } = await lavanderiaApi.post('/user/clients', payload)
  return data
}

// Funciones para manejo de clientes
export async function getClients(businesId?: number) {
  // Usar endpoint que filtra por negocio del usuario logueado
  const { data } = await lavanderiaApi.get('/user/clientes')
  return data
}

export async function getClientById(id: number) {
  const { data } = await lavanderiaApi.get(`/user/clients/${id}`)
  return data
}

export async function updateClient(id: number, payload: Partial<CrearClientePayload>) {
  const { data } = await lavanderiaApi.patch(`/user/clients/${id}`, payload)
  return data
}

export async function deleteClient(id: number) {
  const { data } = await lavanderiaApi.delete(`/user/clients/${id}`)
  return data
}

export async function updateClientStatus(id: number, isActive: boolean) {
  const { data } = await lavanderiaApi.patch(`/user/clients/${id}/status`, { isActive })
  return data
}

export async function getAllUsers() {
  const { data } = await lavanderiaApi.get('/user')
  return data
}

export async function updateUserIsActive(userId: number, isActive: boolean) {
  const { data } = await lavanderiaApi.patch(`/user/${userId}/status`, { isActive })
  return data
}

export async function updateUser(userId: number, userData: { firstname?: string; lastname?: string; phone?: string; dni?: string }) {
  const { data } = await lavanderiaApi.patch(`/user/${userId}`, userData)
  return data
}

// Funciones para datos de empresa y punto de venta
export async function getBusinessData() {
  const { data } = await lavanderiaApi.get('/busines')
  return data
}

export async function createBusiness(businessData: any) {
  const { data } = await lavanderiaApi.post('/busines', businessData)
  return data
}

export async function updateBusiness(id: number, businessData: any) {
  const { data } = await lavanderiaApi.patch(`/busines/${id}`, businessData)
  return data
}

export async function getAllBusinesses() {
  const { data } = await lavanderiaApi.get('/busines')
  return data
}

// Funciones para ubicación
export async function getAllDepartments() {
  const { data } = await lavanderiaApi.get('/departments')
  return data
}

export async function getAllProvinces() {
  const { data } = await lavanderiaApi.get('/provinces')
  return data
}

export async function getAllDistricts() {
  const { data } = await lavanderiaApi.get('/districts')
  return data
}

// Funciones para PointSale
export async function createPointSale(pointSaleData: any) {
  const { data } = await lavanderiaApi.post('/pointsale', pointSaleData)
  return data
}

export async function getAllPointSales() {
  const { data } = await lavanderiaApi.get('/pointsale')
  return data
}

export async function updatePointSale(id: number, pointSaleData: any) {
  const { data } = await lavanderiaApi.patch(`/pointsale/${id}`, pointSaleData)
  return data
}

// Función para registrar usuarios (incluyendo colaboradores)
export async function registerUser(userData: any) {
  const { data } = await lavanderiaApi.post('/auth/register', userData)
  return data
}

// Función para asignar colaborador a un punto de venta
export async function assignCollaboratorToPointSale(pointSaleId: number, userId: number) {
  const { data } = await lavanderiaApi.patch(`/pointsale/${pointSaleId}`, { userId })
  return data
}

// Función para crear y asignar colaborador automáticamente
export async function createAndAssignCollaborator(pointSaleId: number, collaboratorData: any) {
  const { data } = await lavanderiaApi.post(`/pointsale/${pointSaleId}/create-collaborator`, collaboratorData)
  return data
}

// ServiceCategory API calls
export async function getServiceCategories(businesId: number) {
  const { data } = await lavanderiaApi.get(`/servicecategory?businesId=${businesId}`)
  return data
}

export async function createServiceCategory(categoryData: any) {
  const { data } = await lavanderiaApi.post('/servicecategory', categoryData)
  return data
}

export async function updateServiceCategory(id: number, categoryData: any) {
  const { data } = await lavanderiaApi.patch(`/servicecategory/${id}`, categoryData)
  return data
}

export async function deleteServiceCategory(id: number) {
  const { data } = await lavanderiaApi.delete(`/servicecategory/${id}`)
  return data
}

// ListService API calls
export async function getListServices(businesId: number) {
  const { data } = await lavanderiaApi.get(`/listservice?businesId=${businesId}`)
  return data
}

export async function getServiceEnums() {
  const { data } = await lavanderiaApi.get('/listservice/enums')
  return data
}

export async function createListService(serviceData: any) {
  const { data } = await lavanderiaApi.post('/listservice', serviceData)
  return data
}

export async function updateListService(id: number, serviceData: any) {
  const { data } = await lavanderiaApi.patch(`/listservice/${id}`, serviceData)
  return data
}

export async function deleteListService(id: number) {
  const response = await lavanderiaApi.delete(`/listservice/${id}`)
  console.log('✅ Respuesta DELETE exitosa:', response.status, response.statusText, response.data)
  return response.data || { success: true }
}

// PointSaleService API calls
export async function getPointSaleServices(pointsaleId: number) {
  const { data } = await lavanderiaApi.get(`/pointsaleservice/pointsale/${pointsaleId}`)
  return data
}

export async function createOrUpdatePointSaleService(serviceData: any) {
  const { data } = await lavanderiaApi.post('/pointsaleservice', serviceData)
  return data
}

export async function updatePointSaleServicePrice(id: number, price: number) {
  const { data } = await lavanderiaApi.patch(`/pointsaleservice/${id}/price`, { price })
  return data
}

export async function togglePointSaleServiceActive(id: number) {
  const { data } = await lavanderiaApi.patch(`/pointsaleservice/${id}/toggle`)
  return data
}

export async function getPointSaleData() {
  const { data } = await lavanderiaApi.get('/pointsale')
  return data
}

// Email verification functions
export async function verifyEmail(token: string) {
  const { data } = await lavanderiaApi.get(`/auth/verify-email?token=${token}`)
  return data
}

export async function resendVerificationEmail(email: string) {
  const { data } = await lavanderiaApi.post('/auth/resend-verification', { email })
  return data
}

// Change password function
export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await lavanderiaApi.patch('/auth/change-password', {
    currentPassword,
    newPassword
  })
  return data
}

// Expenses API calls
export interface CreateExpensePayload {
  pointsaleId: number
  date: string
  recipient: string
  concept: string
  amount: number
}

export async function createExpense(payload: CreateExpensePayload) {
  const { data } = await lavanderiaApi.post('/expenses', payload)
  return data
}

export async function getExpenses(params?: { pointsaleId?: number; date?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.pointsaleId) {
    queryParams.append('pointsaleId', params.pointsaleId.toString())
  }
  if (params?.date) {
    queryParams.append('date', params.date)
  }
  const queryString = queryParams.toString()
  const url = queryString ? `/expenses?${queryString}` : '/expenses'
  const { data } = await lavanderiaApi.get(url)
  return data
}

export async function getExpenseById(id: number) {
  const { data } = await lavanderiaApi.get(`/expenses/${id}`)
  return data
}

// Cash Contributions (Aportes a la Caja)
export interface CreateCashContributionPayload {
  pointsaleId: number
  date: string
  amount: number
  concept?: string
  notes?: string
}

export async function getCashContributions(params?: { pointsaleId?: number; date?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.pointsaleId) {
    queryParams.append('pointsaleId', params.pointsaleId.toString())
  }
  if (params?.date) {
    queryParams.append('date', params.date)
  }
  const queryString = queryParams.toString()
  const url = queryString ? `/cash-contributions?${queryString}` : '/cash-contributions'
  const { data } = await lavanderiaApi.get(url)
  return data
}

export async function createCashContribution(payload: CreateCashContributionPayload) {
  const { data } = await lavanderiaApi.post('/cash-contributions', payload)
  return data
}

export async function deleteCashContribution(id: number) {
  const { data } = await lavanderiaApi.delete(`/cash-contributions/${id}`)
  return data
}

// Cash Withdrawals API
export interface CreateCashWithdrawalPayload {
  pointsaleId: number
  date: string
  amount: number
  concept?: string
  notes?: string
}

export async function getCashWithdrawals(params?: { pointsaleId?: number; date?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.pointsaleId) {
    queryParams.append('pointsaleId', params.pointsaleId.toString())
  }
  if (params?.date) {
    queryParams.append('date', params.date)
  }
  const queryString = queryParams.toString()
  const url = queryString ? `/cash-withdrawals?${queryString}` : '/cash-withdrawals'
  const { data } = await lavanderiaApi.get(url)
  return data
}

export async function createCashWithdrawal(payload: CreateCashWithdrawalPayload) {
  const { data } = await lavanderiaApi.post('/cash-withdrawals', payload)
  return data
}

export async function deleteCashWithdrawal(id: number) {
  const { data } = await lavanderiaApi.delete(`/cash-withdrawals/${id}`)
  return data
}

export async function updateExpense(id: number, payload: Partial<CreateExpensePayload>) {
  const { data } = await lavanderiaApi.patch(`/expenses/${id}`, payload)
  return data
}

export async function deleteExpense(id: number) {
  const { data } = await lavanderiaApi.delete(`/expenses/${id}`)
  return data
}

// Plans API calls
export interface Plan {
  id: number
  tipo: string
  nombrePeriodo: string
  diasPeriodo: number
  costo: number | null
  createdAt?: string
  updatedAt?: string
}

export interface CreatePlanPayload {
  tipo: string
  nombrePeriodo: string
  diasPeriodo: number
  costo?: number | null
}

export async function getPlans() {
  const { data } = await lavanderiaApi.get('/plans')
  return data
}

export async function getPlanById(id: number) {
  const { data } = await lavanderiaApi.get(`/plans/${id}`)
  return data
}

export async function createPlan(payload: CreatePlanPayload) {
  const { data } = await lavanderiaApi.post('/plans', payload)
  return data
}

export async function updatePlan(id: number, payload: Partial<CreatePlanPayload>) {
  const { data } = await lavanderiaApi.patch(`/plans/${id}`, payload)
  return data
}

export async function deletePlan(id: number) {
  const { data } = await lavanderiaApi.delete(`/plans/${id}`)
  return data
}

// Business Plans API calls
export interface BusinessPlan {
  id: number
  businesId: number
  planId: number
  fechaInicio: string
  fechaFin: string
  estado: string
  fechaPago: string | null
  business?: {
    id: number
    name: string
    isActive?: boolean
  }
  plan?: Plan
  createdAt?: string
  updatedAt?: string
}

export interface CreateBusinessPlanPayload {
  businesId: number
  planId: number
  fechaInicio: string
  fechaFin: string
  estado?: string
  fechaPago?: string
}

export async function getBusinessPlans(params?: { businesId?: number; estado?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.businesId) {
    queryParams.append('businesId', params.businesId.toString())
  }
  if (params?.estado) {
    queryParams.append('estado', params.estado)
  }
  const queryString = queryParams.toString()
  const url = queryString ? `/business-plans?${queryString}` : '/business-plans'
  const { data } = await lavanderiaApi.get(url)
  return data
}

export async function getActiveBusinessPlan(businesId: number) {
  const { data } = await lavanderiaApi.get(`/business-plans/business/${businesId}/active`)
  return data
}

export async function getBusinessPlanStatus(businesId: number) {
  const { data } = await lavanderiaApi.get(`/business-plans/business/${businesId}/status`)
  return data
}

export async function createBusinessPlan(payload: CreateBusinessPlanPayload) {
  const { data } = await lavanderiaApi.post('/business-plans', payload)
  return data
}

export async function renewBusinessPlan(id: number) {
  const { data } = await lavanderiaApi.patch(`/business-plans/${id}/renew`)
  return data
}

export async function suspendBusinessPlan(id: number) {
  const { data } = await lavanderiaApi.patch(`/business-plans/${id}/suspend`)
  return data
}

export async function activateBusinessPlan(id: number) {
  const { data } = await lavanderiaApi.patch(`/business-plans/${id}/activate`)
  return data
}

export async function getExpiringPlans(days: number = 7) {
  const { data } = await lavanderiaApi.get(`/business-plans/expiring?days=${days}`)
  return data
}

export async function getExpiredPlans() {
  const { data } = await lavanderiaApi.get('/business-plans/expired')
  return data
}

// Plan Payments API calls
export interface PlanPayment {
  id: number
  businessPlanId: number
  monto: number
  fechaPago: string
  metodoPago: string | null
  comprobante: string | null
  estado: string
  createdAt?: string
  updatedAt?: string
}

export interface CreatePlanPaymentPayload {
  businesId: number
  planId: number
  monto: number
  fechaPago: string
  metodoPago?: string
  comprobante?: string
  notas?: string
}

export async function getPlanPayments(params?: { businessPlanId?: number; businesId?: number }) {
  const queryParams = new URLSearchParams()
  if (params?.businessPlanId) {
    queryParams.append('businessPlanId', params.businessPlanId.toString())
  }
  if (params?.businesId) {
    queryParams.append('businesId', params.businesId.toString())
  }
  const queryString = queryParams.toString()
  const url = queryString ? `/plan-payments?${queryString}` : '/plan-payments'
  const { data } = await lavanderiaApi.get(url)
  return data
}

export async function createPlanPayment(payload: CreatePlanPaymentPayload) {
  const { data } = await lavanderiaApi.post('/plan-payments', payload)
  return data
}

export async function approvePlanPayment(id: number) {
  const { data } = await lavanderiaApi.patch(`/plan-payments/${id}/approve`)
  return data
}

export async function rejectPlanPayment(id: number) {
  const { data } = await lavanderiaApi.patch(`/plan-payments/${id}/reject`)
  return data
}

export { lavanderiaApi }
