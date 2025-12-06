<template>
  <div class="sales-payment-today-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Ventas y Cobranzas del Día</h1>
    </header>

    <!-- Fecha del día con selector -->
    <div class="date-section">
      <div class="date-selector">
        <label for="date-input" class="date-label">Fecha:</label>
        <input 
          id="date-input"
          type="date" 
          v-model="selectedDate"
          class="date-input"
          :max="todayString"
        >
      </div>
      <p class="current-date">{{ formatDateHeader(selectedDate) }}</p>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <!-- Filtro de Negocio (solo para SUPERADMIN) -->
      <div v-if="userRole === 'SUPERADMIN'" class="filter-group">
        <label for="business-select" class="filter-label">Negocio:</label>
        <select 
          id="business-select"
          v-model="selectedBusinessId"
          class="filter-select"
          @change="onBusinessChange"
        >
          <option :value="null">Todos los negocios</option>
          <option 
            v-for="business in businesses" 
            :key="business.id" 
            :value="business.id"
          >
            {{ business.name }}
          </option>
        </select>
      </div>

      <!-- Filtro de Punto de Venta (para SUPERADMIN y ADMIN) -->
      <div v-if="userRole === 'SUPERADMIN' || userRole === 'ADMIN'" class="filter-group">
        <label for="pointsale-select" class="filter-label">Punto de Venta:</label>
        <select 
          id="pointsale-select"
          v-model="selectedPointSaleId"
          class="filter-select"
          :disabled="loadingPointSales"
        >
          <option :value="null">Todos los puntos de venta</option>
          <option 
            v-for="pointsale in availablePointSales" 
            :key="pointsale.id" 
            :value="pointsale.id"
          >
            {{ pointsale.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <p>Cargando información del día...</p>
    </div>

    <!-- Content -->
    <div v-else class="content">
      <!-- Resumen del día -->
      <section class="summary-section">
        <h2 class="section-title">Resumen del Día</h2>
        
        <div class="summary-cards">
          <div class="summary-card ventas">
            <div class="card-icon">💰</div>
            <div class="card-info">
              <p class="card-label">Ventas del Día</p>
              <p class="card-value">S/. {{ formatPrice(totalSalesDay) }}</p>
              <p class="card-count">{{ salesCount }} órdenes</p>
            </div>
          </div>

          <div class="summary-card cobranzas">
            <div class="card-icon">💵</div>
            <div class="card-info">
              <p class="card-label">Cobranzas del Día</p>
              <p class="card-value">S/. {{ formatPrice(totalPaymentsDay) }}</p>
              <p class="card-count">{{ paymentsCount }} pagos</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Tabs -->
      <div class="tabs-container">
        <button 
          class="tab"
          :class="{ active: currentTab === 'ventas' }"
          @click="currentTab = 'ventas'"
        >
          Ventas
        </button>
        <button 
          class="tab"
          :class="{ active: currentTab === 'cobranzas' }"
          @click="currentTab = 'cobranzas'"
        >
          Cobranzas
        </button>
      </div>

      <!-- Ventas del día -->
      <section v-if="currentTab === 'ventas'" class="list-section">
        <div v-if="todaySalesOrders.length === 0" class="empty-message">
          <p>No hay ventas registradas para esta fecha</p>
        </div>

        <div 
          v-else
          v-for="salesOrder in todaySalesOrders" 
          :key="salesOrder.id"
          class="list-item"
          @click="goToSalesOrderDetail(salesOrder.id)"
        >
          <div class="item-info">
            <p class="item-client">{{ salesOrder.serviceorder.cliente.firstname }} {{ salesOrder.serviceorder.cliente.lastname }}</p>
            <p class="item-phone">{{ salesOrder.serviceorder.cliente.phone }}</p>
            <p class="item-time">{{ formatTime(salesOrder.createdAt) }}</p>
          </div>
          <div class="item-amount">
            <p class="amount-value">S/. {{ formatPrice(salesOrder.total) }}</p>
            <span class="status-badge" :class="getPaymentStatusClass(salesOrder.statusPay)">
              {{ getPaymentStatusLabel(salesOrder.statusPay) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Cobranzas del día -->
      <section v-if="currentTab === 'cobranzas'" class="payments-section">
        <div v-if="todayPayments.length === 0" class="empty-message">
          <p>No hay cobranzas registradas para esta fecha</p>
        </div>

        <div v-else class="payments-columns">
          <!-- Columna 1: Cobranzas en Efectivo -->
          <div class="payment-column">
            <div class="column-header">
              <h3 class="column-title">Cobranzas en Efectivo</h3>
              <span class="column-total">S/. {{ formatPrice(totalCashPayments) }}</span>
            </div>
            <div v-if="cashPayments.length === 0" class="empty-column">
              <p>No hay cobranzas en efectivo</p>
            </div>
            <div v-else class="payments-list">
              <div 
                v-for="payment in cashPayments" 
                :key="payment.id"
                class="list-item"
                @click="goToSalesOrderDetail(payment.salesorder?.id)"
              >
                <div class="item-info">
                  <p class="item-client">{{ payment.salesorder?.serviceorder?.cliente?.firstname }} {{ payment.salesorder?.serviceorder?.cliente?.lastname }}</p>
                  <p class="item-phone">{{ payment.salesorder?.serviceorder?.cliente?.phone }}</p>
                  <p class="item-time">{{ formatTime(payment.datepaid) }}</p>
                  <p class="item-method">{{ getPaymentMethodLabel(payment.methodpay) }}</p>
                </div>
                <div class="item-amount">
                  <p class="amount-value payment">S/. {{ formatPrice(payment.amount) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Columna 2: Otros Tipos de Pago -->
          <div class="payment-column">
            <div class="column-header">
              <h3 class="column-title">Otros Tipos de Pago</h3>
              <span class="column-total">S/. {{ formatPrice(totalOtherPayments) }}</span>
            </div>
            <div v-if="otherPayments.length === 0" class="empty-column">
              <p>No hay cobranzas de otros tipos</p>
            </div>
            <div v-else class="payments-list">
              <div 
                v-for="payment in otherPayments" 
                :key="payment.id"
                class="list-item"
                @click="goToSalesOrderDetail(payment.salesorder?.id)"
              >
                <div class="item-info">
                  <p class="item-client">{{ payment.salesorder?.serviceorder?.cliente?.firstname }} {{ payment.salesorder?.serviceorder?.cliente?.lastname }}</p>
                  <p class="item-phone">{{ payment.salesorder?.serviceorder?.cliente?.phone }}</p>
                  <p class="item-time">{{ formatTime(payment.datepaid) }}</p>
                  <p class="item-method">{{ getPaymentMethodLabel(payment.methodpay) }}</p>
                </div>
                <div class="item-amount">
                  <p class="amount-value payment">S/. {{ formatPrice(payment.amount) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { lavanderiaApi } from '@/api/lavanderiaApi'

const router = useRouter()
const authStore = useAuthStore()

// Estado
const loading = ref(false)
const loadingPointSales = ref(false)
const currentTab = ref<'ventas' | 'cobranzas'>('ventas')
const currentDate = ref(new Date())
const salesOrders = ref<any[]>([])
const payments = ref<any[]>([])

// Filtros
const businesses = ref<any[]>([])
const pointSales = ref<any[]>([])
const selectedBusinessId = ref<number | null>(null)
const selectedPointSaleId = ref<number | null>(null)

// Usuario
const userRole = computed(() => authStore.user?.role || '')

// Inicializar selectedDate con la fecha de hoy en formato YYYY-MM-DD
const getTodayString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const selectedDate = ref(getTodayString())

// Computed
const todayString = computed(() => getTodayString())

// Puntos de venta disponibles según el negocio seleccionado y el rol
const availablePointSales = computed(() => {
  if (userRole.value === 'SUPERADMIN') {
    // Si hay negocio seleccionado, filtrar por ese negocio
    if (selectedBusinessId.value) {
      return pointSales.value.filter(ps => ps.businesId === selectedBusinessId.value)
    }
    // Si no hay negocio seleccionado, mostrar todos
    return pointSales.value
  } else if (userRole.value === 'ADMIN') {
    // Para ADMIN, mostrar solo puntos de venta de su negocio
    return pointSales.value
  }
  return []
})

const todaySalesOrders = computed(() => {
  // Parsear la fecha seleccionada correctamente (local, no UTC)
  const [year, month, day] = selectedDate.value.split('-').map(Number)
  const selected = new Date(year, month - 1, day, 0, 0, 0, 0)
  const nextDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0)

  return salesOrders.value.filter(order => {
    const orderDate = new Date(order.createdAt)
    const dateMatch = orderDate >= selected && orderDate < nextDay
    
    if (!dateMatch) return false
    
    // Aplicar filtro de negocio (solo para SUPERADMIN)
    if (selectedBusinessId.value && userRole.value === 'SUPERADMIN') {
      const pointsale = order.serviceorder?.pointsale
      if (!pointsale || pointsale.businesId !== selectedBusinessId.value) {
        return false
      }
    }
    
    // Aplicar filtro de punto de venta si está seleccionado
    if (selectedPointSaleId.value) {
      if (order.serviceorder?.pointsaleId !== selectedPointSaleId.value) {
        return false
      }
    }
    
    return true
  })
})

const todayPayments = computed(() => {
  // Parsear la fecha seleccionada correctamente (local, no UTC)
  const [year, month, day] = selectedDate.value.split('-').map(Number)
  const selected = new Date(year, month - 1, day, 0, 0, 0, 0)
  const nextDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0)

  return payments.value.filter(payment => {
    const paymentDate = new Date(payment.datepaid)
    const dateMatch = paymentDate >= selected && paymentDate < nextDay
    
    if (!dateMatch) return false
    
    // Aplicar filtro de negocio (solo para SUPERADMIN)
    if (selectedBusinessId.value && userRole.value === 'SUPERADMIN') {
      const pointsale = payment.salesorder?.serviceorder?.pointsale
      if (!pointsale || pointsale.businesId !== selectedBusinessId.value) {
        return false
      }
    }
    
    // Aplicar filtro de punto de venta si está seleccionado
    if (selectedPointSaleId.value) {
      if (payment.salesorder?.serviceorder?.pointsaleId !== selectedPointSaleId.value) {
        return false
      }
    }
    
    return true
  })
})

const totalSalesDay = computed(() => {
  return todaySalesOrders.value.reduce((sum, order) => {
    return sum + Number(order.total)
  }, 0)
})

const salesCount = computed(() => todaySalesOrders.value.length)

const totalPaymentsDay = computed(() => {
  return todayPayments.value.reduce((sum, payment) => {
    return sum + Number(payment.amount)
  }, 0)
})

const paymentsCount = computed(() => todayPayments.value.length)

// Separar pagos en efectivo y otros tipos
const cashPayments = computed(() => {
  return todayPayments.value.filter(payment => payment.methodpay === 'CASH')
})

const otherPayments = computed(() => {
  return todayPayments.value.filter(payment => payment.methodpay !== 'CASH')
})

// Totales por columna
const totalCashPayments = computed(() => {
  return cashPayments.value.reduce((sum, payment) => {
    return sum + Number(payment.amount)
  }, 0)
})

const totalOtherPayments = computed(() => {
  return otherPayments.value.reduce((sum, payment) => {
    return sum + Number(payment.amount)
  }, 0)
})

// Métodos
const goBack = () => {
  router.push({ name: 'dashboard' })
}

const goToSalesOrderDetail = (salesOrderId: number) => {
  router.push({ name: 'sales-order-detail', params: { id: salesOrderId } })
}

const formatPrice = (price: any) => {
  if (typeof price === 'number') {
    return price.toFixed(2)
  }
  return Number(price).toFixed(2)
}

const formatDateHeader = (dateString: string) => {
  // Parsear la fecha en formato YYYY-MM-DD y crear un Date local (no UTC)
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day) // month - 1 porque en JS los meses van de 0-11
  
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getPaymentStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'UNPAID': 'Por Pagar',
    'PARTIAL': 'Pago Parcial',
    'PAID': 'Pagado',
  }
  return labels[status] || status
}

const getPaymentStatusClass = (status: string) => {
  return `status-${status.toLowerCase()}`
}

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    'CASH': 'Efectivo',
    'TRANSFER': 'Transferencia',
    'YAPE': 'Yape',
    'PLIN': 'Plin',
    'CARD': 'Tarjeta',
    'YAPE_PLIN': 'Yape/Plin',
  }
  return labels[method] || method
}

const loadBusinesses = async () => {
  try {
    const { data } = await lavanderiaApi.get('/busines')
    businesses.value = data
    console.log('🏢 Negocios cargados:', businesses.value.length)
  } catch (error) {
    console.error('❌ Error al cargar negocios:', error)
  }
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
      const { data: allBusinesses } = await lavanderiaApi.get('/busines')
      const userBusiness = allBusinesses.find((b: any) => b.userId === user?.id)
      
      if (userBusiness) {
        pointSales.value = userBusiness.pointsales || []
      }
    }
    
    console.log('📍 Puntos de venta cargados:', pointSales.value.length)
  } catch (error) {
    console.error('❌ Error al cargar puntos de venta:', error)
  } finally {
    loadingPointSales.value = false
  }
}

const onBusinessChange = () => {
  // Resetear la selección de punto de venta cuando cambia el negocio
  selectedPointSaleId.value = null
}

const loadData = async () => {
  try {
    loading.value = true
    
    console.log('🔍 Cargando ventas y cobranzas del día...')
    
    // Cargar todas las órdenes de venta
    const salesResponse = await lavanderiaApi.get('/salesorder')
    salesOrders.value = salesResponse.data
    
    // Cargar todos los pagos
    const paymentsResponse = await lavanderiaApi.get('/payment')
    payments.value = paymentsResponse.data
    
    console.log('📦 Datos cargados:', {
      totalSalesOrders: salesOrders.value.length,
      todaySalesOrders: todaySalesOrders.value.length,
      totalPayments: payments.value.length,
      todayPayments: todayPayments.value.length
    })
    
  } catch (error: any) {
    console.error('❌ Error al cargar datos:', error)
    alert('Error al cargar la información del día')
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Cargar filtros según el rol
  if (userRole.value === 'SUPERADMIN') {
    await loadBusinesses()
  }
  
  if (userRole.value === 'SUPERADMIN' || userRole.value === 'ADMIN') {
    await loadPointSales()
  }
  
  // Cargar datos
  await loadData()
})
</script>

<style scoped>
.sales-payment-today-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-bottom: 2rem;
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

/* Date Section */
.date-section {
  background-color: #fff;
  padding: 1rem;
  text-align: center;
  border-bottom: 1px solid #e5e5e5;
}

.date-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.date-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

.date-input {
  padding: 0.5rem 0.75rem;
  border: 2px solid #ff6b35;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #333;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #fff;
}

.date-input:hover {
  border-color: #e65a2a;
}

.date-input:focus {
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.current-date {
  font-size: 1rem;
  color: #666;
  margin: 0;
  text-transform: capitalize;
}

/* Filters Section */
.filters-section {
  background-color: #fff;
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  border-bottom: 1px solid #e5e5e5;
}

.filter-group {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #333;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
}

.filter-select:hover:not(:disabled) {
  border-color: #ff6b35;
}

.filter-select:focus {
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.filter-select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Loading */
.loading-container {
  padding: 3rem 1rem;
  text-align: center;
  color: #666;
}

/* Content */
.content {
  padding: 1rem;
}

/* Summary Section */
.summary-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
}

.summary-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.summary-card {
  background-color: #fff;
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 1rem;
  align-items: center;
}

.summary-card.ventas {
  border-left: 4px solid #4caf50;
}

.summary-card.cobranzas {
  border-left: 4px solid #2196f3;
}

.card-icon {
  font-size: 2rem;
}

.card-info {
  flex: 1;
}

.card-label {
  font-size: 0.75rem;
  color: #666;
  margin: 0 0 0.25rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 0.25rem 0;
}

.card-count {
  font-size: 0.875rem;
  color: #999;
  margin: 0;
}

/* Tabs */
.tabs-container {
  display: flex;
  background-color: #fff;
  border-radius: 0.5rem;
  padding: 0.25rem;
  gap: 0.25rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab {
  flex: 1;
  background-color: transparent;
  border: none;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.tab.active {
  background-color: #ff6b35;
  color: #fff;
}

.tab:hover:not(.active) {
  background-color: #f5f5f5;
}

/* List Section */
.list-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Payments Section (Two Columns) */
.payments-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.payments-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.payment-column {
  background-color: #fff;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.column-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.column-total {
  font-size: 1.125rem;
  font-weight: 700;
  color: #ff6b35;
}

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-column {
  padding: 2rem 1rem;
  text-align: center;
  color: #999;
  font-size: 0.875rem;
}

.empty-message {
  background-color: #fff;
  padding: 3rem 1rem;
  text-align: center;
  color: #999;
  border-radius: 0.75rem;
}

.list-item {
  background-color: #fff;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.list-item:active {
  transform: translateY(0);
}

.item-info {
  flex: 1;
}

.item-client {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.25rem 0;
}

.item-phone {
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 0.25rem 0;
}

.item-time {
  font-size: 0.75rem;
  color: #999;
  margin: 0 0 0.25rem 0;
}

.item-method {
  font-size: 0.75rem;
  color: #2196f3;
  font-weight: 500;
  margin: 0;
}

.item-amount {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.amount-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.amount-value.payment {
  color: #2196f3;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  display: inline-block;
}

.status-unpaid {
  background-color: #fee;
  color: #c33;
}

.status-partial {
  background-color: #ffeaa7;
  color: #d63031;
}

.status-paid {
  background-color: #d4edda;
  color: #155724;
}

/* Responsive */
@media (max-width: 640px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .filter-group {
    min-width: 100%;
  }
}

@media (min-width: 768px) {
  .sales-payment-today-container {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }

  .page-header {
    padding: 1.5rem 2rem;
  }

  .title {
    font-size: 1.5rem;
  }

  .date-section {
    padding: 1.5rem 2rem;
  }

  .filters-section {
    padding: 1.5rem 2rem;
  }

  .content {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .summary-cards {
    gap: 1.5rem;
  }

  .summary-card {
    padding: 1.5rem;
  }

  .card-value {
    font-size: 1.75rem;
  }
}

@media (min-width: 1024px) {
  .content {
    padding: 2.5rem;
  }

  .summary-cards {
    gap: 2rem;
  }

  .summary-card {
    padding: 2rem;
  }

  .card-icon {
    font-size: 2.5rem;
  }

  .card-value {
    font-size: 2rem;
  }

  .list-item {
    padding: 1.25rem;
  }

  .payments-columns {
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .payment-column {
    padding: 1.5rem;
  }

  .column-title {
    font-size: 1.125rem;
  }

  .column-total {
    font-size: 1.25rem;
  }
}

@media (min-width: 1280px) {
  .content {
    padding: 3rem;
  }

  .summary-cards {
    gap: 2.5rem;
  }

  .summary-card {
    padding: 2.5rem;
  }

  .card-value {
    font-size: 2.25rem;
  }
}

@media (min-width: 1600px) {
  .content {
    padding: 3.5rem;
  }

  .summary-cards {
    gap: 3rem;
  }

  .summary-card {
    padding: 3rem;
  }

  .card-value {
    font-size: 2.5rem;
  }
}
</style>

<style>
/* Override global body styles for full width on desktop */
body:has(.sales-payment-today-container) {
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

#app:has(.sales-payment-today-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.sales-payment-today-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  box-sizing: border-box !important;
}
</style>

