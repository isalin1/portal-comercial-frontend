<template>
  <div class="cash-balance-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Cuadre de Caja Efectivo x Dia</h1>
    </header>

    <!-- Content -->
    <div class="content">
      <!-- Filtros -->
      <div class="filters-section">
        <!-- Punto de Venta -->
        <div class="filter-group">
          <label for="pointsale-select" class="filter-label">Punto de Venta</label>
          <select 
            id="pointsale-select"
            v-model="selectedPointSaleId"
            class="filter-select"
            :disabled="loadingPointSales || userRole === 'COLABORADOR'"
            @change="onPointSaleChange"
          >
            <option :value="null">Selecciona punto de venta</option>
            <option 
              v-for="pointsale in availablePointSales" 
              :key="pointsale.id" 
              :value="pointsale.id"
            >
              {{ pointsale.name }}
            </option>
          </select>
        </div>

        <!-- Fecha -->
        <div class="filter-group">
          <label for="date-input" class="filter-label">Elegir Dia</label>
          <div class="date-input-wrapper">
            <input 
              id="date-input"
              type="date" 
              v-model="selectedDate"
              class="filter-input date-input"
              :max="todayString"
              @change="onDateChange"
            >
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <svg class="filter-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </div>
        </div>
      </div>

      <!-- Resumen del día -->
      <div v-if="selectedPointSaleId && selectedDate" class="summary-section">
        <div class="summary-header">
          <span class="summary-date">{{ formatDate(selectedDate) }}</span>
          <span class="summary-total">S/. {{ formatPrice(balance) }}</span>
        </div>

        <!-- Contenedor principal -->
        <div class="balance-box">
          <!-- Caja Inicial -->
          <div class="balance-section">
            <div class="section-header">
              <h3 class="section-title">Caja Inicial</h3>
              <span class="section-total">S/. {{ formatPrice(initialCash) }}</span>
            </div>
            <div class="info-message">
              <p>Saldo final del día anterior</p>
            </div>
          </div>

          <!-- Cobranzas en Efectivo -->
          <div class="balance-section">
            <div class="section-header">
              <h3 class="section-title">Cobranzas en Efectivo</h3>
              <span class="section-total">S/. {{ formatPrice(totalCashPayments) }}</span>
            </div>
            <div v-if="loading" class="loading-message">
              <p>Cargando información...</p>
            </div>
            <div v-else-if="cashPayments.length === 0" class="empty-message">
              <p>No hay cobranzas en efectivo para esta fecha</p>
            </div>
            <div v-else class="items-list">
              <div 
                v-for="payment in cashPayments" 
                :key="payment.id"
                class="item-row"
              >
                <span class="item-name">{{ getClientName(payment) }}</span>
                <span class="item-amount">S/. {{ formatPrice(payment.amount) }}</span>
              </div>
            </div>
          </div>

          <!-- Aportes a la Caja -->
          <div class="balance-section">
            <div class="section-header">
              <h3 class="section-title">Aportes a la Caja</h3>
              <span class="section-total">S/. {{ formatPrice(totalContributions) }}</span>
            </div>
            <div v-if="!isApproved" class="section-actions">
              <button 
                class="btn-add-contribution" 
                @click="showContributionForm = !showContributionForm"
                :disabled="loading"
              >
                {{ showContributionForm ? 'Cancelar' : '+ Registrar Aporte' }}
              </button>
            </div>
            
            <!-- Formulario de aporte -->
            <div v-if="showContributionForm && !isApproved" class="contribution-form">
              <div class="form-group">
                <label>Monto *</label>
                <input 
                  type="number" 
                  v-model.number="contributionAmount" 
                  step="0.01" 
                  min="0.01"
                  placeholder="0.00"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Concepto</label>
                <input 
                  type="text" 
                  v-model="contributionConcept" 
                  placeholder="Ej: Aporte de caja, Depósito adicional"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Notas</label>
                <textarea 
                  v-model="contributionNotes" 
                  placeholder="Notas adicionales (opcional)"
                  class="form-textarea"
                  rows="2"
                ></textarea>
              </div>
              <button 
                class="btn-submit-contribution" 
                @click="handleRegisterContribution"
                :disabled="!contributionAmount || contributionAmount <= 0"
              >
                Registrar Aporte
              </button>
            </div>

            <div v-if="loading" class="loading-message">
              <p>Cargando información...</p>
            </div>
            <div v-else-if="cashContributions.length === 0" class="empty-message">
              <p>No hay aportes registrados para esta fecha</p>
            </div>
            <div v-else class="items-list">
              <div 
                v-for="contribution in cashContributions" 
                :key="contribution.id"
                class="item-row"
              >
                <div class="item-info">
                  <span class="item-name">{{ contribution.concept || 'Aporte' }}</span>
                  <span v-if="contribution.notes" class="item-notes">{{ contribution.notes }}</span>
                </div>
                <div class="item-actions">
                  <span class="item-amount">S/. {{ formatPrice(contribution.amount) }}</span>
                  <button 
                    v-if="!isApproved" 
                    class="btn-delete-item" 
                    @click="handleDeleteContribution(contribution.id)"
                    title="Eliminar aporte"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Retiros de Caja -->
          <div class="balance-section">
            <div class="section-header">
              <h3 class="section-title">Retiros de Caja</h3>
              <span class="section-total">S/. {{ formatPrice(totalWithdrawals) }}</span>
            </div>
            <div v-if="!isApproved" class="section-actions">
              <button 
                class="btn-add-withdrawal" 
                @click="showWithdrawalForm = !showWithdrawalForm"
                :disabled="loading"
              >
                {{ showWithdrawalForm ? 'Cancelar' : '+ Registrar Retiro' }}
              </button>
            </div>
            
            <!-- Formulario de retiro -->
            <div v-if="showWithdrawalForm && !isApproved" class="withdrawal-form">
              <div class="form-group">
                <label>Monto *</label>
                <input 
                  type="number" 
                  v-model.number="withdrawalAmount" 
                  step="0.01" 
                  min="0.01"
                  placeholder="0.00"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Concepto</label>
                <input 
                  type="text" 
                  v-model="withdrawalConcept" 
                  placeholder="Ej: Retiro para pago, Retiro de caja"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>Notas</label>
                <textarea 
                  v-model="withdrawalNotes" 
                  placeholder="Notas adicionales (opcional)"
                  class="form-textarea"
                  rows="2"
                ></textarea>
              </div>
              <button 
                class="btn-submit-withdrawal" 
                @click="handleRegisterWithdrawal"
                :disabled="!withdrawalAmount || withdrawalAmount <= 0"
              >
                Registrar Retiro
              </button>
            </div>

            <div v-if="loading" class="loading-message">
              <p>Cargando información...</p>
            </div>
            <div v-else-if="cashWithdrawals.length === 0" class="empty-message">
              <p>No hay retiros registrados para esta fecha</p>
            </div>
            <div v-else class="items-list">
              <div 
                v-for="withdrawal in cashWithdrawals" 
                :key="withdrawal.id"
                class="item-row"
              >
                <div class="item-info">
                  <span class="item-name">{{ withdrawal.concept || 'Retiro' }}</span>
                  <span v-if="withdrawal.notes" class="item-notes">{{ withdrawal.notes }}</span>
                </div>
                <div class="item-actions">
                  <span class="item-amount">S/. {{ formatPrice(withdrawal.amount) }}</span>
                  <button 
                    v-if="!isApproved" 
                    class="btn-delete-item" 
                    @click="handleDeleteWithdrawal(withdrawal.id)"
                    title="Eliminar retiro"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Gastos en Efectivo -->
          <div class="balance-section">
            <div class="section-header">
              <h3 class="section-title">Gastos en Efectivo</h3>
              <span class="section-total">S/. {{ formatPrice(totalExpenses) }}</span>
            </div>
            <div v-if="loading" class="loading-message">
              <p>Cargando información...</p>
            </div>
            <div v-else-if="expenses.length === 0" class="empty-message">
              <p>No hay gastos registrados para esta fecha</p>
            </div>
            <div v-else class="items-list">
              <div 
                v-for="expense in expenses" 
                :key="expense.id"
                class="item-row"
              >
                <span class="item-name">{{ expense.recipient }} {{ expense.concept }}</span>
                <span class="item-amount">S/. {{ formatPrice(expense.amount) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Botón Aprobar/Reactivar -->
        <button 
          class="approve-button"
          :disabled="approving || (!canManageApproval && isApproved)"
          @click="handleApproval"
        >
          {{ approving 
            ? (isApproved ? 'Reactivando...' : 'Aprobando...') 
            : (isApproved 
              ? (canManageApproval ? 'Reactivar Cuadre Caja' : 'Cuadre Aprobado') 
              : 'Aprobar Cuadre Caja') 
          }}
        </button>
      </div>

      <!-- Mensaje cuando no hay filtros seleccionados -->
      <div v-else class="empty-state">
        <p>Selecciona un punto de venta y una fecha para ver el cuadre de caja</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { getAllPointSales, getBusinessData, getExpenses, getCashContributions, createCashContribution, deleteCashContribution, getCashWithdrawals, createCashWithdrawal, deleteCashWithdrawal } from '@/api/lavanderiaApi'
import { lavanderiaApi } from '@/api/lavanderiaApi'
import { isCashBalanceApproved, approveCashBalance, disapproveCashBalance } from '@/utils/cashBalance'

const router = useRouter()
const authStore = useAuthStore()

// Estado
const loading = ref(false)
const loadingPointSales = ref(false)
const approving = ref(false)
const selectedPointSaleId = ref<number | null>(null)
const selectedDate = ref<string>('')
const payments = ref<any[]>([])
const expenses = ref<any[]>([])
const cashContributions = ref<any[]>([])
const cashWithdrawals = ref<any[]>([])
const pointSales = ref<any[]>([])
const businesses = ref<any[]>([])
const approvedBalances = ref<Set<string>>(new Set()) // Almacena claves "pointsaleId-date"
const initialCash = ref<number>(0) // Caja inicial
const showContributionForm = ref(false)
const contributionAmount = ref<number>(0)
const contributionConcept = ref<string>('')
const contributionNotes = ref<string>('')
const showWithdrawalForm = ref(false)
const withdrawalAmount = ref<number>(0)
const withdrawalConcept = ref<string>('')
const withdrawalNotes = ref<string>('')

// Computed
const userRole = computed(() => authStore.user?.role)

const todayString = computed(() => {
  // Usar la fecha local del sistema, no UTC
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

// Puntos de venta disponibles según el rol
const availablePointSales = computed(() => {
  if (userRole.value === 'SUPERADMIN') {
    return pointSales.value
  } else if (userRole.value === 'ADMIN') {
    return pointSales.value
  } else if (userRole.value === 'COLABORADOR') {
    // COLABORADOR solo ve su punto de venta asignado
    const user = authStore.user
    return pointSales.value.filter(ps => ps.userId === user?.id)
  }
  return []
})

// Filtrar pagos en efectivo del día seleccionado
const cashPayments = computed(() => {
  if (!selectedDate.value || !selectedPointSaleId.value) return []
  
  // Parsear la fecha seleccionada correctamente (local, no UTC)
  const [year, month, day] = selectedDate.value.split('-').map(Number)
  const selected = new Date(year, month - 1, day, 0, 0, 0, 0)
  const nextDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0)

  return payments.value.filter(payment => {
    // Filtrar por método de pago (solo efectivo)
    if (payment.methodpay !== 'CASH') return false
    
    // Filtrar por fecha
    const paymentDate = new Date(payment.datepaid)
    const dateMatch = paymentDate >= selected && paymentDate < nextDay
    
    if (!dateMatch) return false
    
    // Filtrar por punto de venta
    if (payment.salesorder?.serviceorder?.pointsaleId !== selectedPointSaleId.value) {
      return false
    }
    
    return true
  })
})

const totalCashPayments = computed(() => {
  return cashPayments.value.reduce((sum, payment) => {
    return sum + Number(payment.amount)
  }, 0)
})

const totalExpenses = computed(() => {
  return expenses.value.reduce((sum, expense) => {
    return sum + Number(expense.amount)
  }, 0)
})

const totalContributions = computed(() => {
  return cashContributions.value.reduce((sum, contribution) => {
    return sum + Number(contribution.amount)
  }, 0)
})

const totalWithdrawals = computed(() => {
  return cashWithdrawals.value.reduce((sum, withdrawal) => {
    return sum + Number(withdrawal.amount)
  }, 0)
})

// Saldo final = Caja Inicial + Cobranzas + Aportes - Gastos - Retiros
const balance = computed(() => {
  return initialCash.value + totalCashPayments.value + totalContributions.value - totalExpenses.value - totalWithdrawals.value
})

// Verificar si el cuadre ya está aprobado
const isApproved = computed(() => {
  if (!selectedPointSaleId.value || !selectedDate.value) return false
  return isCashBalanceApproved(selectedPointSaleId.value, selectedDate.value)
})

// Verificar si el usuario puede aprobar/reactivar (solo ADMIN y SUPERADMIN)
const canManageApproval = computed(() => {
  return userRole.value === 'ADMIN' || userRole.value === 'SUPERADMIN'
})

// Methods
const goBack = () => {
  router.push({ name: 'dashboard' })
}

const formatPrice = (price: any) => {
  if (typeof price === 'number') {
    return price.toFixed(2)
  }
  return Number(price).toFixed(2)
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

const getClientName = (payment: any) => {
  const cliente = payment.salesorder?.serviceorder?.cliente
  if (!cliente) return 'Cliente desconocido'
  return `${cliente.firstname || ''} ${cliente.lastname || ''}`.trim() || 'Cliente sin nombre'
}

const loadPointSales = async () => {
  try {
    loadingPointSales.value = true
    
    if (userRole.value === 'SUPERADMIN') {
      // SUPERADMIN ve todos los puntos de venta
      const { data } = await lavanderiaApi.get('/pointsale')
      pointSales.value = data
    } else if (userRole.value === 'ADMIN') {
      // ADMIN ve solo los puntos de venta de su negocio
      const user = authStore.user
      const allBusinesses = await getBusinessData()
      const userBusiness = allBusinesses.find((b: any) => b.userId === user?.id)
      
      if (userBusiness) {
        pointSales.value = userBusiness.pointsales || []
      }
    } else if (userRole.value === 'COLABORADOR') {
      // COLABORADOR ve solo su punto de venta asignado
      const user = authStore.user
      const { data } = await lavanderiaApi.get('/pointsale')
      pointSales.value = data.filter((ps: any) => ps.userId === user?.id)
      
      // Auto-seleccionar el punto de venta del colaborador
      if (pointSales.value.length > 0) {
        selectedPointSaleId.value = pointSales.value[0].id
      }
    }
  } catch (error) {
    console.error('Error cargando puntos de venta:', error)
  } finally {
    loadingPointSales.value = false
  }
}

const loadPayments = async () => {
  try {
    loading.value = true
    const { data } = await lavanderiaApi.get('/payment')
    payments.value = data
  } catch (error) {
    console.error('Error cargando pagos:', error)
    payments.value = []
  } finally {
    loading.value = false
  }
}

const loadExpenses = async () => {
  if (!selectedPointSaleId.value || !selectedDate.value) {
    expenses.value = []
    return
  }

  try {
    loading.value = true
    const data = await getExpenses({
      pointsaleId: selectedPointSaleId.value,
      date: selectedDate.value
    })
    expenses.value = data.map((expense: any) => ({
      id: expense.id,
      date: expense.date || '',
      recipient: expense.recipient,
      concept: expense.concept,
      amount: Number(expense.amount)
    }))
  } catch (error) {
    console.error('Error cargando gastos:', error)
    expenses.value = []
  } finally {
    loading.value = false
  }
}

const loadCashContributions = async () => {
  if (!selectedPointSaleId.value || !selectedDate.value) {
    cashContributions.value = []
    return
  }

  try {
    console.log('🔄 Cargando aportes para:', {
      pointsaleId: selectedPointSaleId.value,
      date: selectedDate.value
    })

    const data = await getCashContributions({
      pointsaleId: selectedPointSaleId.value,
      date: selectedDate.value
    })
    
    console.log('📥 Datos recibidos del backend (raw):', data)
    console.log('📥 Tipo de datos:', Array.isArray(data) ? 'Array' : typeof data)
    console.log('📥 Longitud:', Array.isArray(data) ? data.length : 'No es array')
    
    // Asegurar que data sea un array
    const contributionsArray = Array.isArray(data) ? data : []
    
    cashContributions.value = contributionsArray.map((contribution: any) => {
      console.log('📝 Procesando aporte:', contribution)
      return {
        id: contribution.id,
        date: contribution.date || '',
        amount: Number(contribution.amount),
        concept: contribution.concept || '',
        notes: contribution.notes || ''
      }
    })
    
    console.log('✅ Aportes mapeados:', cashContributions.value)
    console.log('✅ Cantidad de aportes:', cashContributions.value.length)
  } catch (error: any) {
    console.error('❌ Error cargando aportes:', error)
    console.error('❌ Error response:', error.response?.data)
    cashContributions.value = []
  }
}

const loadCashWithdrawals = async () => {
  if (!selectedPointSaleId.value || !selectedDate.value) {
    cashWithdrawals.value = []
    return
  }

  try {
    console.log('🔄 Cargando retiros para:', {
      pointsaleId: selectedPointSaleId.value,
      date: selectedDate.value
    })

    const data = await getCashWithdrawals({
      pointsaleId: selectedPointSaleId.value,
      date: selectedDate.value
    })
    
    const withdrawalsArray = Array.isArray(data) ? data : []
    
    cashWithdrawals.value = withdrawalsArray.map((withdrawal: any) => ({
      id: withdrawal.id,
      date: withdrawal.date || '',
      amount: Number(withdrawal.amount),
      concept: withdrawal.concept || '',
      notes: withdrawal.notes || ''
    }))
    
    console.log('✅ Retiros mapeados:', cashWithdrawals.value)
  } catch (error: any) {
    console.error('❌ Error cargando retiros:', error)
    cashWithdrawals.value = []
  }
}

// Calcular caja inicial (saldo final del día anterior)
const calculateInitialCash = async () => {
  if (!selectedPointSaleId.value || !selectedDate.value) {
    initialCash.value = 0
    return
  }

  try {
    // Calcular fecha del día anterior
    const [year, month, day] = selectedDate.value.split('-').map(Number)
    const previousDate = new Date(year, month - 1, day - 1)
    const previousDateString = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${String(previousDate.getDate()).padStart(2, '0')}`

    // Cargar datos del día anterior
    const [prevPayments, prevExpenses, prevContributions, prevWithdrawals] = await Promise.all([
      lavanderiaApi.get('/payment').then(res => res.data).catch(() => []),
      getExpenses({ pointsaleId: selectedPointSaleId.value, date: previousDateString }).catch(() => []),
      getCashContributions({ pointsaleId: selectedPointSaleId.value, date: previousDateString }).catch(() => []),
      getCashWithdrawals({ pointsaleId: selectedPointSaleId.value, date: previousDateString }).catch(() => [])
    ])

    // Filtrar pagos en efectivo del día anterior
    const [prevYear, prevMonth, prevDay] = previousDateString.split('-').map(Number)
    const prevSelected = new Date(prevYear, prevMonth - 1, prevDay, 0, 0, 0, 0)
    const prevNextDay = new Date(prevYear, prevMonth - 1, prevDay + 1, 0, 0, 0, 0)

    const prevCashPayments = prevPayments.filter((payment: any) => {
      if (payment.methodpay !== 'CASH') return false
      const paymentDate = new Date(payment.datepaid)
      const dateMatch = paymentDate >= prevSelected && paymentDate < prevNextDay
      if (!dateMatch) return false
      return payment.salesorder?.serviceorder?.pointsaleId === selectedPointSaleId.value
    })

    const prevTotalCashPayments = prevCashPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    const prevTotalExpenses = (prevExpenses || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0)
    const prevTotalContributions = (prevContributions || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0)
    const prevTotalWithdrawals = (prevWithdrawals || []).reduce((sum: number, w: any) => sum + Number(w.amount), 0)

    // Calcular caja inicial del día anterior (llamada recursiva limitada)
    const prevInitialCash = await getPreviousDayInitialCash(previousDateString, 0)
    
    // Saldo final del día anterior = Caja Inicial + Cobranzas + Aportes - Gastos - Retiros
    const previousDayFinalBalance = prevInitialCash + prevTotalCashPayments + prevTotalContributions - prevTotalExpenses - prevTotalWithdrawals
    
    // La caja inicial del día actual es el saldo final del día anterior
    initialCash.value = Math.max(0, previousDayFinalBalance)
  } catch (error) {
    console.error('Error calculando caja inicial:', error)
    initialCash.value = 0
  }
}

// Función auxiliar para obtener la caja inicial del día anterior (recursivo con límite de profundidad)
const getPreviousDayInitialCash = async (dateString: string, depth: number = 0): Promise<number> => {
  // Limitar la recursión a 30 días para evitar problemas de rendimiento
  if (depth >= 30) {
    return 0
  }

  try {
    const [year, month, day] = dateString.split('-').map(Number)
    const previousDate = new Date(year, month - 1, day - 1)
    const previousDateString = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${String(previousDate.getDate()).padStart(2, '0')}`

    // Cargar datos del día anterior al anterior
    const [prevPayments, prevExpenses, prevContributions, prevWithdrawals] = await Promise.all([
      lavanderiaApi.get('/payment').then(res => res.data).catch(() => []),
      getExpenses({ pointsaleId: selectedPointSaleId.value!, date: previousDateString }).catch(() => []),
      getCashContributions({ pointsaleId: selectedPointSaleId.value!, date: previousDateString }).catch(() => []),
      getCashWithdrawals({ pointsaleId: selectedPointSaleId.value!, date: previousDateString }).catch(() => [])
    ])

    const [prevYear, prevMonth, prevDay] = previousDateString.split('-').map(Number)
    const prevSelected = new Date(prevYear, prevMonth - 1, prevDay, 0, 0, 0, 0)
    const prevNextDay = new Date(prevYear, prevMonth - 1, prevDay + 1, 0, 0, 0, 0)

    const prevCashPayments = prevPayments.filter((payment: any) => {
      if (payment.methodpay !== 'CASH') return false
      const paymentDate = new Date(payment.datepaid)
      const dateMatch = paymentDate >= prevSelected && paymentDate < prevNextDay
      if (!dateMatch) return false
      return payment.salesorder?.serviceorder?.pointsaleId === selectedPointSaleId.value
    })

    const prevTotalCashPayments = prevCashPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    const prevTotalExpenses = (prevExpenses || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0)
    const prevTotalContributions = (prevContributions || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0)
    const prevTotalWithdrawals = (prevWithdrawals || []).reduce((sum: number, w: any) => sum + Number(w.amount), 0)

    // Si no hay datos, retornar 0 (no hay más días anteriores con datos)
    if (prevTotalCashPayments === 0 && prevTotalExpenses === 0 && prevTotalContributions === 0 && prevTotalWithdrawals === 0) {
      return 0
    }

    // Calcular recursivamente la caja inicial del día anterior
    const prevPrevInitialCash = await getPreviousDayInitialCash(previousDateString, depth + 1)
    return prevPrevInitialCash + prevTotalCashPayments + prevTotalContributions - prevTotalExpenses - prevTotalWithdrawals
  } catch (error) {
    console.error('Error calculando caja inicial recursiva:', error)
    return 0
  }
}

const handleRegisterContribution = async () => {
  if (!selectedPointSaleId.value || !selectedDate.value || !contributionAmount.value || contributionAmount.value <= 0) {
    alert('Por favor ingresa un monto válido')
    return
  }

  try {
    console.log('📝 Registrando aporte:', {
      pointsaleId: selectedPointSaleId.value,
      date: selectedDate.value,
      amount: contributionAmount.value,
      concept: contributionConcept.value,
      notes: contributionNotes.value
    })

    const result = await createCashContribution({
      pointsaleId: selectedPointSaleId.value,
      date: selectedDate.value,
      amount: contributionAmount.value,
      concept: contributionConcept.value || undefined,
      notes: contributionNotes.value || undefined
    })
    
    console.log('✅ Aporte registrado:', result)
    
    // Agregar el aporte directamente a la lista mientras se recarga
    if (result && result.id) {
      const newContribution = {
        id: result.id,
        date: result.date || selectedDate.value,
        amount: Number(result.amount),
        concept: result.concept || contributionConcept.value || '',
        notes: result.notes || contributionNotes.value || ''
      }
      cashContributions.value.push(newContribution)
      console.log('➕ Aporte agregado directamente a la lista:', newContribution)
    }
    
    // Limpiar formulario
    contributionAmount.value = 0
    contributionConcept.value = ''
    contributionNotes.value = ''
    showContributionForm.value = false
    
    // Recargar aportes para asegurar sincronización
    console.log('🔄 Recargando aportes...')
    try {
      await loadCashContributions()
      console.log('📊 Aportes cargados después de recarga:', cashContributions.value)
    } catch (error) {
      console.error('⚠️ Error al recargar aportes, pero el aporte ya está en la lista:', error)
    }
    
    alert('Aporte registrado exitosamente')
  } catch (error: any) {
    console.error('❌ Error registrando aporte:', error)
    console.error('Error details:', error.response?.data)
    alert(error.response?.data?.message || 'Error al registrar el aporte')
  }
}

const handleDeleteContribution = async (id: number) => {
  if (!confirm('¿Estás seguro de eliminar este aporte?')) return

  try {
    await deleteCashContribution(id)
    await loadCashContributions()
    alert('Aporte eliminado exitosamente')
  } catch (error: any) {
    console.error('Error eliminando aporte:', error)
    alert(error.response?.data?.message || 'Error al eliminar el aporte')
  }
}

const handleRegisterWithdrawal = async () => {
  if (!selectedPointSaleId.value || !selectedDate.value || !withdrawalAmount.value || withdrawalAmount.value <= 0) {
    alert('Por favor ingresa un monto válido')
    return
  }

  try {
    console.log('📝 Registrando retiro:', {
      pointsaleId: selectedPointSaleId.value,
      date: selectedDate.value,
      amount: withdrawalAmount.value,
      concept: withdrawalConcept.value,
      notes: withdrawalNotes.value
    })

    const result = await createCashWithdrawal({
      pointsaleId: selectedPointSaleId.value,
      date: selectedDate.value,
      amount: withdrawalAmount.value,
      concept: withdrawalConcept.value || undefined,
      notes: withdrawalNotes.value || undefined
    })
    
    console.log('✅ Retiro registrado:', result)
    
    // Agregar el retiro directamente a la lista mientras se recarga
    if (result && result.id) {
      const newWithdrawal = {
        id: result.id,
        date: result.date || selectedDate.value,
        amount: Number(result.amount),
        concept: result.concept || '',
        notes: result.notes || ''
      }
      cashWithdrawals.value.push(newWithdrawal)
    }
    
    // Limpiar formulario
    withdrawalAmount.value = 0
    withdrawalConcept.value = ''
    withdrawalNotes.value = ''
    showWithdrawalForm.value = false
    
    // Recargar para asegurar sincronización
    await loadCashWithdrawals()
    
    alert('Retiro registrado exitosamente')
  } catch (error: any) {
    console.error('Error registrando retiro:', error)
    alert(error.response?.data?.message || 'Error al registrar el retiro')
  }
}

const handleDeleteWithdrawal = async (id: number) => {
  if (!confirm('¿Estás seguro de eliminar este retiro?')) return

  try {
    await deleteCashWithdrawal(id)
    await loadCashWithdrawals()
    alert('Retiro eliminado exitosamente')
  } catch (error: any) {
    console.error('Error eliminando retiro:', error)
    alert(error.response?.data?.message || 'Error al eliminar el retiro')
  }
}

const onPointSaleChange = () => {
  if (selectedPointSaleId.value && selectedDate.value) {
    loadExpenses()
    loadPayments()
    loadCashContributions()
    loadCashWithdrawals()
    calculateInitialCash()
  }
}

const onDateChange = () => {
  if (selectedPointSaleId.value && selectedDate.value) {
    loadExpenses()
    loadPayments()
    loadCashContributions()
    loadCashWithdrawals()
    calculateInitialCash()
  }
}

const handleApproval = async () => {
  if (!selectedPointSaleId.value || !selectedDate.value) return
  
  try {
    approving.value = true
    
    if (isApproved.value) {
      // Desaprobar (reactivar) - solo ADMIN y SUPERADMIN
      if (!canManageApproval.value) {
        alert('Solo los administradores pueden reactivar el cuadre de caja')
        return
      }
      
      disapproveCashBalance(selectedPointSaleId.value, selectedDate.value)
      alert('Cuadre de caja reactivado. Ahora se pueden modificar los valores.')
    } else {
      // Aprobar
      approveCashBalance(selectedPointSaleId.value, selectedDate.value)
      alert('Cuadre de caja aprobado exitosamente. Los valores ya no se pueden modificar.')
    }
    
    // Recargar aprobaciones
    loadApprovedBalances()
    
  } catch (error) {
    console.error('Error gestionando aprobación del cuadre de caja:', error)
    alert('Error al gestionar el cuadre de caja')
  } finally {
    approving.value = false
  }
}

// Cargar aprobaciones guardadas desde localStorage
const loadApprovedBalances = () => {
  const stored = localStorage.getItem('approvedCashBalances')
  if (stored) {
    approvedBalances.value = new Set(JSON.parse(stored))
  } else {
    approvedBalances.value = new Set()
  }
}

// Watch para recargar cuando cambian los filtros
watch([selectedPointSaleId, selectedDate], () => {
  if (selectedPointSaleId.value && selectedDate.value) {
    loadExpenses()
    loadPayments()
    loadCashContributions()
    loadCashWithdrawals()
    calculateInitialCash()
  }
})

// Lifecycle
onMounted(async () => {
  // Cargar aprobaciones guardadas
  loadApprovedBalances()
  
  // Establecer fecha actual por defecto
  selectedDate.value = todayString.value
  
  // Cargar puntos de venta
  await loadPointSales()
  
  // Cargar datos iniciales si hay punto de venta seleccionado
  if (selectedPointSaleId.value) {
    await loadPayments()
    await loadExpenses()
    await loadCashContributions()
    await loadCashWithdrawals()
    await calculateInitialCash()
  }
})
</script>

<style scoped>
.cash-balance-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-bottom: 2rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* Header */
.page-header {
  background-color: #fff;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #f5f5f5;
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

/* Content */
.content {
  padding: 1.5rem 1rem;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  margin: 0 auto;
}

/* Filtros */
.filters-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

.filter-select,
.filter-input {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  font-size: 1rem;
  background-color: #fff;
  color: #333;
}

.filter-select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.date-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.date-input {
  flex: 1;
  padding-right: 3rem;
}

.search-icon,
.filter-icon {
  position: absolute;
  right: 0.5rem;
  color: #666;
  pointer-events: none;
}

.filter-icon {
  right: 2.5rem;
}

/* Resumen */
.summary-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.summary-date {
  font-size: 1rem;
  font-weight: 500;
  color: #333;
}

.summary-total {
  font-size: 1.25rem;
  font-weight: 600;
  color: #ff6b35;
}

/* Balance Box */
.balance-box {
  border: 2px solid #ff6b35;
  border-radius: 0.5rem;
  padding: 1rem;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.balance-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.section-total {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.item-name {
  font-size: 0.875rem;
  color: #666;
  flex: 1;
}

.item-amount {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

.loading-message,
.empty-message {
  padding: 1rem;
  text-align: center;
  color: #666;
  font-size: 0.875rem;
}

.info-message {
  text-align: center;
  padding: 0.5rem;
  color: #666;
  font-size: 0.875rem;
}

.section-actions {
  margin-bottom: 1rem;
}

.btn-add-contribution {
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-add-contribution:hover:not(:disabled) {
  background-color: #218838;
}

.btn-add-contribution:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.contribution-form {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #e5e5e5;
}

.contribution-form .form-group {
  margin-bottom: 1rem;
}

.contribution-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
  font-size: 0.875rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.btn-submit-contribution {
  padding: 0.5rem 1rem;
  background-color: #ff6b35;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-submit-contribution:hover:not(:disabled) {
  background-color: #e55a2b;
}

.btn-submit-contribution:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-add-withdrawal {
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-add-withdrawal:hover:not(:disabled) {
  background-color: #c82333;
}

.btn-add-withdrawal:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.withdrawal-form {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  border: 1px solid #dee2e6;
}

.withdrawal-form .form-group {
  margin-bottom: 1rem;
}

.withdrawal-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #495057;
  font-size: 0.875rem;
}

.withdrawal-form .form-input,
.withdrawal-form .form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.withdrawal-form .form-textarea {
  resize: vertical;
  font-family: inherit;
}

.btn-submit-withdrawal {
  padding: 0.5rem 1rem;
  background-color: #ff6b35;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
  width: 100%;
}

.btn-submit-withdrawal:hover:not(:disabled) {
  background-color: #e55a2b;
}

.btn-submit-withdrawal:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.item-notes {
  font-size: 0.75rem;
  color: #666;
  font-style: italic;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-delete-item {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  padding: 0;
}

.btn-delete-item:hover {
  background-color: #c82333;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #666;
}

/* Botón Aprobar */
.approve-button {
  width: 100%;
  padding: 1rem;
  background-color: #ff6b35;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.approve-button:hover:not(:disabled) {
  background-color: #e55a2b;
}

.approve-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Responsive Desktop */
@media (min-width: 768px) {
  .content {
    padding: 2rem 1.5rem;
  }

  .filters-section {
    flex-direction: row;
    gap: 1.5rem;
  }

  .filter-group {
    flex: 1;
  }
}

@media (min-width: 1024px) {
  .cash-balance-container {
    padding: 0;
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .page-header {
    padding: 1.5rem 2rem;
    width: 100%;
    box-sizing: border-box;
  }

  .title {
    font-size: 1.5rem;
  }

  .content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem 2.5rem;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .filters-section {
    flex-direction: row;
    gap: 2rem;
    margin-bottom: 2rem;
    justify-content: center;
  }

  .filter-group {
    flex: 0 1 auto;
    min-width: 250px;
    max-width: 400px;
  }

  .filter-label {
    font-size: 1rem;
  }

  .filter-select,
  .filter-input {
    padding: 0.875rem;
    font-size: 1rem;
  }

  .summary-section {
    gap: 2rem;
    max-width: 100%;
    margin: 0 auto;
  }

  .summary-header {
    padding: 1.5rem 2rem;
    max-width: 100%;
  }

  .summary-date {
    font-size: 1.125rem;
  }

  .summary-total {
    font-size: 1.5rem;
  }

  .balance-box {
    padding: 2rem;
    gap: 2rem;
    max-width: 100%;
  }

  .balance-section {
    gap: 1.5rem;
  }

  .section-header {
    padding-bottom: 1rem;
  }

  .section-title {
    font-size: 1.125rem;
  }

  .section-total {
    font-size: 1.125rem;
  }

  .items-list {
    gap: 1rem;
  }

  .item-row {
    padding: 0.75rem 0;
  }

  .item-name {
    font-size: 1rem;
  }

  .item-amount {
    font-size: 1rem;
  }

  .approve-button {
    padding: 1.25rem;
    font-size: 1.125rem;
    max-width: 500px;
    margin: 0 auto;
  }
}

@media (min-width: 1280px) {
  .content {
    max-width: 1600px;
    padding: 2.5rem 3rem;
  }

  .filters-section {
    gap: 2.5rem;
  }

  .filter-group {
    max-width: 450px;
  }

  .summary-header {
    padding: 2rem 2.5rem;
  }

  .summary-date {
    font-size: 1.25rem;
  }

  .summary-total {
    font-size: 1.75rem;
  }

  .balance-box {
    padding: 2.5rem;
    gap: 2.5rem;
  }

  .section-title {
    font-size: 1.25rem;
  }

  .section-total {
    font-size: 1.25rem;
  }

  .approve-button {
    max-width: 600px;
    padding: 1.5rem;
    font-size: 1.25rem;
  }
}

@media (min-width: 1600px) {
  .content {
    max-width: 1800px;
    padding: 3rem 4rem;
  }

  .summary-header {
    padding: 2.5rem 3rem;
  }

  .balance-box {
    padding: 3rem;
  }
}
</style>

<style>
/* Override global body styles for full width on desktop */
body:has(.cash-balance-container) {
  display: block !important;
  place-items: unset !important;
  align-items: unset !important;
  justify-content: unset !important;
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

#app:has(.cash-balance-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.cash-balance-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}
</style>