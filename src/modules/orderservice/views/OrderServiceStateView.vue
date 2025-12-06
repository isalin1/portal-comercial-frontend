<template>
  <div class="orders-container">
    <div class="content-wrapper">
      <!-- Header -->
      <header class="orders-header">
        <button class="back-button" @click="goBack">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
          </svg>
        </button>
        <h1 class="title">Órdenes de Servicio</h1>
      </header>

    <!-- Filtros (visible para SUPERADMIN y ADMIN) -->
    <div v-if="userRole === 'SUPERADMIN' || userRole === 'ADMIN'" class="filters-section">
      <!-- Filtro de Negocio (solo para SUPERADMIN) -->
      <div v-if="userRole === 'SUPERADMIN'" class="filter-group">
        <label for="business-filter" class="filter-label">Negocio:</label>
        <select 
          id="business-filter"
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
      <div class="filter-group">
        <label for="pointsale-filter" class="filter-label">Punto de Venta:</label>
        <select 
          id="pointsale-filter"
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

    <!-- Mensaje informativo para COLABORADOR -->
    <div v-if="userRole === 'COLABORADOR'" class="colaborador-info">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2196f3" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <p>Mostrando órdenes de tu punto de venta asignado</p>
    </div>

    <!-- Búsqueda por Cliente -->
    <div class="search-section">
      <div class="search-container">
        <input 
          v-model="searchQuery" 
          type="text" 
          class="search-input"
          placeholder="Buscar Cliente"
          @input="handleSearch"
        >
        <button class="search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Tabs de Estado -->
    <div class="tabs-container">
      <button 
        v-for="status in statusOptions" 
        :key="status.value"
        class="tab"
        :class="{ active: currentStatus === status.value }"
        @click="changeStatus(status.value)"
      >
        {{ status.label }}
        <span class="tab-badge">{{ orderCountByStatus[status.value] }}</span>
      </button>
    </div>

    <!-- Lista de Órdenes -->
    <div class="orders-list">
      <div v-if="loading" class="loading-message">
        Cargando órdenes...
      </div>

      <div v-else-if="filteredOrders.length === 0" class="empty-message">
        No hay órdenes {{ statusOptions.find(s => s.value === currentStatus)?.label.toLowerCase() }}
      </div>

      <div 
        v-else
        v-for="order in filteredOrders" 
        :key="order.id"
        class="order-card"
        @click="viewOrderDetail(order.id)"
      >
        <div class="order-header">
          <div class="client-info">
            <p v-if="order.code" class="order-code">Código: {{ order.code }}</p>
            <h3 class="client-name">{{ order.cliente.firstname }} {{ order.cliente.lastname }}</h3>
            <p class="client-phone">{{ order.cliente.phone }}</p>
            <p class="delivery-date">Entrega: {{ formatDate(order.salesorder.servicedeadline) }}</p>
            <p class="pointsale-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {{ order.pointsale?.name || 'N/A' }}
            </p>
            <!-- Estado General de la Orden -->
            <p class="order-status-badge" :class="getOrderStatusClass(order.statusOrder)">
              Estado: {{ getStatusLabel(order.statusOrder) }}
            </p>
          </div>
          <div class="order-amounts">
            <p class="service-total">
              <span class="label">Servicio:</span> 
              <span class="amount">S/. {{ formatPrice(order.salesorder.total) }}</span>
            </p>
            <p class="service-balance">
              <span class="label">Saldo:</span> 
              <span class="amount">S/. {{ formatPrice(calculateBalance(order)) }}</span>
            </p>
            <p class="pieces-count">{{ getTotalPieces(order) }} piezas</p>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { lavanderiaApi } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Estado
const searchQuery = ref('')
const currentStatus = ref<'ALL' | 'RECEIVED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED'>('RECEIVED')
const orders = ref<any[]>([])
const loading = ref(false)
const loadingPointSales = ref(false)

// Filtros
const businesses = ref<any[]>([])
const pointSales = ref<any[]>([])
const selectedBusinessId = ref<number | null>(null)
const selectedPointSaleId = ref<number | null>(null)

// Usuario
const userRole = computed(() => authStore.user?.role || '')

// Opciones de estado
const statusOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'RECEIVED', label: 'Recibidos' },
  { value: 'IN_PROGRESS', label: 'En Proceso' },
  { value: 'READY', label: 'Por Entregar' },
  { value: 'DELIVERED', label: 'Entregados' },
]

// Computed
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

const filteredOrders = computed(() => {
  let filtered = orders.value
  
  // Filtrar por negocio (solo para SUPERADMIN)
  if (selectedBusinessId.value && userRole.value === 'SUPERADMIN') {
    filtered = filtered.filter(order => {
      const pointsale = order.pointsale
      return pointsale && pointsale.businesId === selectedBusinessId.value
    })
  }
  
  // Filtrar por punto de venta
  if (selectedPointSaleId.value) {
    filtered = filtered.filter(order => {
      return order.pointsaleId === selectedPointSaleId.value
    })
  }
  
  // Si es "Todos", mostrar todas las órdenes, sino filtrar por estado
  if (currentStatus.value !== 'ALL') {
    filtered = filtered.filter(order => order.statusOrder === currentStatus.value)
  }
  
  // Filtrar por búsqueda
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(order => {
      const fullName = `${order.cliente.firstname} ${order.cliente.lastname}`.toLowerCase()
      const phone = order.cliente.phone?.toLowerCase() || ''
      return fullName.includes(query) || phone.includes(query)
    })
  }
  
  // Si es "Todos", ordenar por fecha (más reciente primero)
  if (currentStatus.value === 'ALL') {
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // Orden descendente (más reciente primero)
    })
  }
  
  return filtered
})

// Computed para contar órdenes por estado
const orderCountByStatus = computed(() => {
  const counts: Record<string, number> = {
    ALL: orders.value.length,
    RECEIVED: 0,
    IN_PROGRESS: 0,
    READY: 0,
    DELIVERED: 0,
  }
  
  orders.value.forEach(order => {
    if (counts[order.statusOrder] !== undefined) {
      counts[order.statusOrder]++
    }
  })
  
  return counts
})

// Métodos
const goBack = () => {
  router.push({ name: 'dashboard' })
}

const changeStatus = (status: 'ALL' | 'RECEIVED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED') => {
  currentStatus.value = status
}

const handleSearch = () => {
  // La búsqueda es reactiva a través del computed filteredOrders
}

const viewOrderDetail = (orderId: number) => {
  router.push({ name: 'order-service-detail', params: { id: orderId } })
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const formatPrice = (price: any) => {
  if (typeof price === 'number') {
    return price.toFixed(2)
  }
  // Si es un Decimal de Prisma u otro tipo, convertirlo a número
  return Number(price).toFixed(2)
}

const calculateBalance = (order: any) => {
  // El balance es el total menos lo pagado (obtenido de la salesorder)
  if (!order || !order.salesorder) {
    console.warn('⚠️ Orden sin salesorder:', order?.id)
    return 0
  }
  
  const salesOrder = order.salesorder
  const total = Number(salesOrder.total) || 0
  
  // Log detallado para depuración
  console.log('🔍 Calculando saldo para orden:', {
    orderId: order.id,
    salesOrderId: salesOrder.id,
    total,
    statusPay: salesOrder.statusPay,
    hasPayments: !!salesOrder.payments,
    paymentsType: typeof salesOrder.payments,
    paymentsIsArray: Array.isArray(salesOrder.payments),
    paymentsLength: salesOrder.payments?.length || 0,
    payments: salesOrder.payments
  })
  
  // Verificar si el salesorder incluye los pagos
  if (salesOrder.payments && Array.isArray(salesOrder.payments)) {
    // Calcular el total pagado sumando todos los pagos
    const totalPaid = salesOrder.payments.reduce((sum: number, payment: any) => {
      const amount = Number(payment.amount || 0)
      console.log('💳 Procesando pago:', { payment, amount })
      return sum + amount
    }, 0)
    
    const balance = total - totalPaid
    console.log('✅ Saldo calculado correctamente:', {
      orderId: order.id,
      total,
      totalPaid,
      balance,
      paymentsCount: salesOrder.payments.length
    })
    
    return Math.max(0, balance) // Asegurar que el saldo no sea negativo
  }
  
  // Si no hay pagos en el objeto, usar el statusPay como fallback
  console.warn('⚠️ No se encontraron pagos en salesorder para la orden:', order.id, {
    salesOrderId: salesOrder.id,
    statusPay: salesOrder.statusPay,
    hasPayments: !!salesOrder.payments,
    salesOrderKeys: Object.keys(salesOrder)
  })
  
  if (salesOrder.statusPay === 'PAID') {
    return 0
  } else if (salesOrder.statusPay === 'PARTIAL') {
    // Si no tenemos los pagos, no podemos calcular el saldo exacto
    // Retornamos el total como fallback (será incorrecto pero mejor que total/2)
    return total
  }
  return total
}

const getTotalPieces = (order: any) => {
  if (!order.itemserviceorders || order.itemserviceorders.length === 0) {
    return 0
  }
  return order.itemserviceorders.reduce((total: number, item: any) => {
    return total + (item.numberpieces || 0)
  }, 0)
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'RECEIVED': 'Recibido',
    'IN_PROGRESS': 'En Proceso',
    'READY': 'Por Entregar',
    'DELIVERED': 'Entregado'
  }
  return labels[status] || status
}

const getOrderStatusClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    'RECEIVED': 'status-received',
    'IN_PROGRESS': 'status-progress',
    'READY': 'status-ready',
    'DELIVERED': 'status-delivered'
  }
  return statusMap[status] || 'status-received'
}

const loadOrders = async () => {
  try {
    loading.value = true
    console.log('🔍 Cargando órdenes de servicio...')
    
    const response = await lavanderiaApi.get('/serviceorder')
    
    console.log('📦 Órdenes cargadas:', response.data)
    
    // Verificar que los pagos estén incluidos
    if (response.data && response.data.length > 0) {
      const firstOrder = response.data[0]
      console.log('🔍 Estructura de la primera orden:', {
        hasSalesOrder: !!firstOrder.salesorder,
        hasPayments: !!(firstOrder.salesorder?.payments),
        paymentsCount: firstOrder.salesorder?.payments?.length || 0,
        salesOrderId: firstOrder.salesorder?.id,
        total: firstOrder.salesorder?.total
      })
      
      // Log de ejemplo para verificar pagos
      if (firstOrder.salesorder?.payments) {
        console.log('💳 Pagos de la primera orden:', firstOrder.salesorder.payments)
      }
    }
    
    orders.value = response.data
    
  } catch (error: any) {
    console.error('❌ Error al cargar órdenes:', error)
    alert('Error al cargar las órdenes de servicio')
  } finally {
    loading.value = false
  }
}

// Cargar negocios (solo para SUPERADMIN)
const loadBusinesses = async () => {
  if (userRole.value !== 'SUPERADMIN') return
  
  try {
    console.log('🏢 Cargando negocios...')
    const response = await lavanderiaApi.get('/busines')
    businesses.value = response.data
    console.log('📦 Negocios cargados:', response.data)
  } catch (error) {
    console.error('❌ Error al cargar negocios:', error)
  }
}

// Cargar puntos de venta según el rol
const loadPointSales = async () => {
  if (userRole.value === 'COLABORADOR') return
  
  try {
    loadingPointSales.value = true
    console.log('📍 Cargando puntos de venta...')
    
    if (userRole.value === 'SUPERADMIN') {
      // SUPERADMIN ve todos los puntos de venta
      const response = await lavanderiaApi.get('/pointsale')
      pointSales.value = response.data
    } else if (userRole.value === 'ADMIN') {
      // ADMIN ve solo los puntos de venta de su negocio
      const user = authStore.user
      const { data: allBusinesses } = await lavanderiaApi.get('/busines')
      const userBusiness = allBusinesses.find((b: any) => b.userId === user?.id)
      
      if (userBusiness) {
        pointSales.value = userBusiness.pointsales || []
      }
    }
    
    console.log('📦 Puntos de venta cargados:', pointSales.value.length)
  } catch (error) {
    console.error('❌ Error al cargar puntos de venta:', error)
  } finally {
    loadingPointSales.value = false
  }
}

// Manejar cambio de negocio (solo para SUPERADMIN)
const onBusinessChange = () => {
  // Resetear punto de venta al cambiar negocio
  selectedPointSaleId.value = null
}

// Watcher para recargar cuando cambia el estado en la URL
watch(() => route.query.status, (newStatus) => {
  if (newStatus && ['ALL', 'RECEIVED', 'IN_PROGRESS', 'READY', 'DELIVERED'].includes(newStatus as string)) {
    currentStatus.value = newStatus as 'ALL' | 'RECEIVED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED'
    loadOrders()
  }
})

// Lifecycle
onMounted(async () => {
  // Establecer estado inicial desde query params
  const statusParam = route.query.status as string
  if (statusParam && ['ALL', 'RECEIVED', 'IN_PROGRESS', 'READY', 'DELIVERED'].includes(statusParam)) {
    currentStatus.value = statusParam as 'ALL' | 'RECEIVED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED'
  }
  
  // Cargar datos en paralelo
  await Promise.all([
    loadOrders(),
    loadBusinesses(),
    loadPointSales()
  ])
})
</script>

<style scoped>
.orders-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-bottom: 2rem;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
}

.content-wrapper {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 0 auto;
  position: relative;
}

/* Asegurar que en desktop el contenido esté centrado */
@media (min-width: 769px) {
  .content-wrapper {
    max-width: 1200px;
  }
}

@media (min-width: 1024px) {
  .content-wrapper {
    max-width: 1400px;
  }
}

@media (min-width: 1280px) {
  .content-wrapper {
    max-width: 1600px;
  }
}

/* Header */
.orders-header {
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

/* Search Section */
.search-section {
  padding: 1rem;
  background-color: #fff;
  display: flex;
  gap: 0.75rem;
  border-bottom: 1px solid #e5e5e5;
}

.search-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background-color: #ffe5dc;
  border-radius: 0.5rem;
  padding: 0 1rem;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.75rem 0;
  font-size: 1rem;
  outline: none;
  color: #333;
}

.search-input::placeholder {
  color: #999;
}

.search-icon {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-button {
  background-color: #fff;
  border: 1px solid #e5e5e5;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.filter-button:hover {
  background-color: #f8f9fa;
}

/* Tabs */
.tabs-container {
  display: flex;
  background-color: #fff;
  padding: 0.5rem 1rem;
  gap: 0.5rem;
  overflow-x: auto;
  border-bottom: 1px solid #e5e5e5;
}

.tab {
  background-color: transparent;
  border: none;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  border-radius: 0.5rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab.active {
  background-color: #000;
  color: #fff;
}

.tab:hover:not(.active) {
  background-color: #f5f5f5;
}

.tab-badge {
  background-color: rgba(255, 107, 53, 0.2);
  color: #ff6b35;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.5rem;
  text-align: center;
}

.tab.active .tab-badge {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* Orders List */
.orders-list {
  padding: 1rem;
}

.loading-message,
.empty-message {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-size: 1rem;
}

.order-card {
  background-color: #e5e5e5;
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.order-card:hover {
  background-color: #d5d5d5;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.order-card:active {
  transform: translateY(0);
}

.order-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.client-info {
  flex: 1;
}

.order-code {
  font-size: 0.75rem;
  font-weight: 600;
  color: #1976d2;
  background-color: #e3f2fd;
  padding: 4px 8px;
  border-radius: 4px;
  margin: 0 0 0.5rem 0;
  display: inline-block;
}

.client-name {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.25rem 0;
}

.client-phone {
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 0.25rem 0;
}

.delivery-date {
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.25rem 0;
}

.pointsale-info {
  font-size: 0.875rem;
  color: #ff6b35;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
}

.order-status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0.5rem 0 0 0;
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-block;
  width: fit-content;
}

.order-status-badge.status-received {
  background-color: #fff3cd;
  color: #856404;
}

.order-status-badge.status-progress {
  background-color: #cfe2ff;
  color: #084298;
}

.order-status-badge.status-ready {
  background-color: #d1e7dd;
  color: #0f5132;
}

.order-status-badge.status-delivered {
  background-color: #d1e7dd;
  color: #0f5132;
}

.order-amounts {
  text-align: right;
}

.service-total,
.service-balance {
  font-size: 0.875rem;
  margin: 0 0 0.25rem 0;
}

.service-total .label,
.service-balance .label {
  color: #666;
  font-weight: 500;
}

.service-total .amount,
.service-balance .amount {
  color: #333;
  font-weight: 600;
  margin-left: 0.25rem;
}

.pieces-count {
  font-size: 0.875rem;
  color: #666;
  margin: 0;
  text-align: right;
}

/* Filters Section */
.filters-section {
  background-color: #fff;
  padding: 1rem;
  border-bottom: 1px solid #e5e5e5;
}

.filter-group {
  margin-bottom: 0.75rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.filter-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e5e5;
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #333;
  background-color: #fff;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #ff6b35;
}

.filter-select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

/* Mensaje informativo para COLABORADOR */
.colaborador-info {
  background-color: #e3f2fd;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid #e5e5e5;
}

.colaborador-info p {
  margin: 0;
  font-size: 0.875rem;
  color: #1976d2;
  font-weight: 500;
}

/* Responsive - Mobile */
@media (max-width: 768px) {
  .orders-container {
    padding-bottom: 2rem;
  }
}

/* Responsive - Desktop */
@media (min-width: 769px) {
  .orders-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 20px;
  }

  .content-wrapper {
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .orders-header {
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .filters-section {
    border-radius: 12px;
    margin-bottom: 20px;
    padding: 24px;
  }

  .search-section {
    border-radius: 12px;
    margin-bottom: 20px;
    padding: 20px;
  }

  .tabs-container {
    border-radius: 12px;
    margin-bottom: 20px;
    padding: 16px 24px;
  }

  .orders-list {
    padding: 24px;
  }

  .order-card {
    padding: 24px;
    margin-bottom: 20px;
  }

  .client-name {
    font-size: 1.125rem;
  }

  .service-total,
  .service-balance {
    font-size: 1rem;
  }
}

@media (min-width: 1024px) {
  .orders-container {
    padding: 30px;
  }

  .orders-header {
    padding: 1.5rem;
  }

  .title {
    font-size: 1.5rem;
  }

  .order-card {
    padding: 28px;
  }
}

@media (min-width: 1280px) {
  .orders-container {
    padding: 40px;
  }
}
</style>

<style>
/* Override global body styles para centrar el contenido */
body:has(.orders-container) {
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

#app:has(.orders-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.orders-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* Asegurar que el contenedor principal esté centrado */
.orders-container {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* En desktop, centrar el content-wrapper */
@media (min-width: 769px) {
  .orders-container {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
  }
  
  .orders-container .content-wrapper {
    width: 100% !important;
    max-width: 1200px !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
}

@media (min-width: 1024px) {
  .orders-container .content-wrapper {
    max-width: 1400px !important;
  }
}

@media (min-width: 1280px) {
  .orders-container .content-wrapper {
    max-width: 1600px !important;
  }
}
</style>

