<template>
  <div class="sales-orders-container">
    <!-- Header -->
    <header class="orders-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Ordenes de Venta</h1>
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

    <!-- Tabs de Estado de Pago -->
    <div class="tabs-container">
      <button 
        v-for="status in paymentStatusOptions" 
        :key="status.value"
        class="tab"
        :class="{ active: currentPaymentStatus === status.value }"
        @click="changePaymentStatus(status.value)"
      >
        {{ status.label }}
      </button>
    </div>

    <!-- Lista de Órdenes de Venta -->
    <div class="orders-list">
      <div v-if="loading" class="loading-message">
        Cargando órdenes de venta...
      </div>

      <div v-else-if="filteredSalesOrders.length === 0" class="empty-message">
        No hay órdenes de venta {{ paymentStatusOptions.find(s => s.value === currentPaymentStatus)?.label.toLowerCase() }}
      </div>

      <div 
        v-else
        v-for="salesOrder in filteredSalesOrders" 
        :key="salesOrder.id"
        class="order-card"
        @click="viewSalesOrderDetail(salesOrder.id)"
      >
        <div class="order-header">
          <div class="client-info">
            <p v-if="salesOrder.code" class="order-code">Código: {{ salesOrder.code }}</p>
            <h3 class="client-name">{{ salesOrder.serviceorder.cliente.firstname }} {{ salesOrder.serviceorder.cliente.lastname }}</h3>
            <p class="client-phone">{{ salesOrder.serviceorder.cliente.phone }}</p>
            <p class="order-date">Fecha: {{ formatDate(salesOrder.createdAt) }}</p>
            <p class="pointsale-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {{ salesOrder.serviceorder.pointsale?.name || 'N/A' }}
            </p>
            <!-- Estado General de la Orden de Servicio -->
            <p class="order-status-badge" :class="getOrderStatusClass(salesOrder.serviceorder.statusOrder)">
              Estado: {{ getStatusLabel(salesOrder.serviceorder.statusOrder) }}
            </p>
          </div>
          <div class="order-amounts">
            <p class="service-total">
              <span class="label">Total:</span> 
              <span class="amount">S/. {{ formatPrice(salesOrder.total) }}</span>
            </p>
            <p class="service-balance">
              <span class="label">Saldo:</span> 
              <span class="amount">S/. {{ formatPrice(calculateBalance(salesOrder)) }}</span>
            </p>
            <p class="payment-status" :class="getPaymentStatusClass(salesOrder.statusPay)">
              {{ getPaymentStatusLabel(salesOrder.statusPay) }}
            </p>
            <p class="pieces-count">{{ getTotalPieces(salesOrder.serviceorder) }} piezas</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { lavanderiaApi } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

// Estado
const searchQuery = ref('')
const currentPaymentStatus = ref<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL')
const salesOrders = ref<any[]>([])
const loading = ref(false)
const loadingPointSales = ref(false)

// Filtros
const businesses = ref<any[]>([])
const pointSales = ref<any[]>([])
const selectedBusinessId = ref<number | null>(null)
const selectedPointSaleId = ref<number | null>(null)

// Usuario
const userRole = computed(() => authStore.user?.role || '')

// Opciones de estado de pago
const paymentStatusOptions = [
  { value: 'ALL', label: 'Todas' },
  { value: 'UNPAID', label: 'Por Pagar' },
  { value: 'PARTIAL', label: 'Pago Parcial' },
  { value: 'PAID', label: 'Pagadas' },
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

const filteredSalesOrders = computed(() => {
  let filtered = salesOrders.value
  
  // Filtrar por negocio (solo para SUPERADMIN)
  if (selectedBusinessId.value && userRole.value === 'SUPERADMIN') {
    filtered = filtered.filter(order => {
      const pointsale = order.serviceorder?.pointsale
      return pointsale && pointsale.businesId === selectedBusinessId.value
    })
  }
  
  // Filtrar por punto de venta
  if (selectedPointSaleId.value) {
    filtered = filtered.filter(order => {
      return order.serviceorder?.pointsaleId === selectedPointSaleId.value
    })
  }
  
  // Filtrar por estado de pago
  if (currentPaymentStatus.value !== 'ALL') {
    filtered = filtered.filter(order => order.statusPay === currentPaymentStatus.value)
  }
  
  // Filtrar por búsqueda
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(order => {
      const fullName = `${order.serviceorder.cliente.firstname} ${order.serviceorder.cliente.lastname}`.toLowerCase()
      const phone = order.serviceorder.cliente.phone?.toLowerCase() || ''
      return fullName.includes(query) || phone.includes(query)
    })
  }
  
  return filtered
})

// Métodos
const goBack = () => {
  router.push({ name: 'dashboard' })
}

const changePaymentStatus = (status: 'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID') => {
  currentPaymentStatus.value = status
}

const handleSearch = () => {
  // La búsqueda es reactiva a través del computed filteredSalesOrders
}

const viewSalesOrderDetail = (salesOrderId: number) => {
  router.push({ name: 'sales-order-detail', params: { id: salesOrderId } })
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

const getTotalPieces = (serviceorder: any) => {
  if (!serviceorder.itemserviceorders || serviceorder.itemserviceorders.length === 0) {
    return 0
  }
  return serviceorder.itemserviceorders.reduce((total: number, item: any) => {
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

const calculateBalance = (salesOrder: any) => {
  // El balance es el total menos lo pagado
  if (!salesOrder) {
    console.warn('⚠️ Orden de venta sin datos:', salesOrder?.id)
    return 0
  }
  
  const total = Number(salesOrder.total) || 0
  
  // Verificar si el salesorder incluye los pagos
  if (salesOrder.payments && Array.isArray(salesOrder.payments)) {
    // Calcular el total pagado sumando todos los pagos
    const totalPaid = salesOrder.payments.reduce((sum: number, payment: any) => {
      const amount = Number(payment.amount || 0)
      return sum + amount
    }, 0)
    
    const balance = total - totalPaid
    return Math.max(0, balance) // Asegurar que el saldo no sea negativo
  }
  
  // Si no hay pagos en el objeto, usar el statusPay como fallback
  if (salesOrder.statusPay === 'PAID') {
    return 0
  } else if (salesOrder.statusPay === 'PARTIAL') {
    // Si es parcial, no podemos calcular el saldo exacto sin los pagos
    // Retornar el total como saldo pendiente (será actualizado cuando se carguen los pagos)
    return total
  }
  
  // Si es UNPAID, el saldo es igual al total
  return total
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

const loadSalesOrders = async () => {
  try {
    loading.value = true
    console.log('🔍 Cargando órdenes de venta...')
    
    const response = await lavanderiaApi.get('/salesorder')
    
    console.log('📦 Órdenes de venta cargadas:', response.data)
    salesOrders.value = response.data
    
  } catch (error: any) {
    console.error('❌ Error al cargar órdenes de venta:', error)
    alert('Error al cargar las órdenes de venta')
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
  
  // Cargar órdenes
  await loadSalesOrders()
})
</script>

<style scoped>
.sales-orders-container {
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  background-color: #f8f9fa;
  padding-bottom: 2rem;
  overflow-x: auto;
  box-sizing: border-box;
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
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
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
  border-bottom: 1px solid #e5e5e5;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.search-container {
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

/* Filters Section */
.filters-section {
  background-color: #fff;
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  border-bottom: 1px solid #e5e5e5;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

/* Colaborador Info Message */
.colaborador-info {
  background-color: #e3f2fd;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid #90caf9;
}

.colaborador-info p {
  margin: 0;
  color: #1976d2;
  font-size: 0.875rem;
  font-weight: 500;
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

/* Tabs */
.tabs-container {
  display: flex;
  background-color: #fff;
  padding: 0.5rem 1rem;
  gap: 0.5rem;
  overflow-x: auto;
  border-bottom: 1px solid #e5e5e5;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
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
}

.tab.active {
  background-color: #000;
  color: #fff;
}

.tab:hover:not(.active) {
  background-color: #f5f5f5;
}

/* Orders List */
.orders-list {
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
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
  width: 100%;
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

.order-date {
  font-size: 0.875rem;
  color: #666;
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

.service-total {
  font-size: 0.875rem;
  margin: 0 0 0.25rem 0;
}

.service-total .label {
  color: #666;
  font-weight: 500;
}

.service-total .amount {
  color: #333;
  font-weight: 600;
  margin-left: 0.25rem;
}

.payment-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  display: inline-block;
  margin-bottom: 0.25rem;
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

.service-balance {
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.service-balance .label {
  color: #666;
  font-weight: 500;
}

.service-balance .amount {
  color: #d63031;
  font-weight: 600;
  margin-left: 0.25rem;
}

.pieces-count {
  font-size: 0.875rem;
  color: #666;
  margin: 0;
  text-align: right;
}

/* Responsive */
@media (max-width: 640px) {
  .filters-section {
    flex-direction: column;
  }
  
  .filter-group {
    min-width: 100%;
  }
}

@media (min-width: 768px) {
  .sales-orders-container {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }

  .orders-header,
  .filters-section,
  .colaborador-info,
  .search-section,
  .tabs-container {
    padding-left: 24px;
    padding-right: 24px;
  }

  .orders-list {
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1rem;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .order-card {
    margin-bottom: 0;
  }
}

@media (min-width: 1024px) {
  .orders-list {
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 1.25rem;
    padding: 32px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .order-card {
    padding: 1.25rem;
  }
}

@media (min-width: 1280px) {
  .orders-list {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
    padding: 40px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .order-card {
    padding: 1.5rem;
  }
}

@media (min-width: 1600px) {
  .orders-list {
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 2rem;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
}
</style>

<style>
/* Override global body styles for full width */
body:has(.sales-orders-container) {
  display: block !important;
  place-items: unset !important;
  width: 100% !important;
  max-width: 100% !important;
}

#app:has(.sales-orders-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
}

router-view:has(.sales-orders-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
}
</style>

