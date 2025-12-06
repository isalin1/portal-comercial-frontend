<template>
  <div class="order-service-container">
    <div class="content-wrapper">
      <!-- Header -->
      <header class="order-header">
        <button class="back-button" @click="goBack" title="Volver">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
          </svg>
        </button>
        <h1 class="title">Orden de Servicio</h1>
      </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <p>Cargando orden de servicio...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button @click="loadOrderService" class="btn-retry">Reintentar</button>
    </div>

    <!-- Content -->
    <div v-else-if="orderService" class="content">
      <!-- Datos de cliente -->
      <section class="client-section">
        <h2 class="section-title">Datos de cliente</h2>
        
        <!-- Código de Orden -->
        <div v-if="orderService.code" class="order-code-box">
          <strong>Código:</strong> {{ orderService.code }}
        </div>
        
        <p class="client-name">{{ orderService.cliente.firstname }} {{ orderService.cliente.lastname }}</p>
        <p class="client-phone">{{ orderService.cliente.phone }}</p>
        
        <!-- Punto de Venta -->
        <div class="pointsale-info-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span class="pointsale-text">
            <strong>Punto de Venta:</strong> {{ orderService.pointsale?.name || 'N/A' }}
          </span>
        </div>
        
        <p class="order-status" :class="statusClass">
          Estado: {{ getStatusLabel(orderService.statusOrder) }}
        </p>
      </section>

      <!-- Detalle Servicios -->
      <section class="services-section">
        <h2 class="section-title">Detalle Servicios</h2>
        
        <div 
          v-for="item in orderService.itemserviceorders" 
          :key="item.id"
          class="service-item"
        >
          <div class="service-info">
            <p v-if="item.code" class="service-code">
              <strong>Código:</strong> {{ item.code }}
            </p>
            <p class="service-category">{{ item.listservice.servicecategory.name }}</p>
            <p class="service-type">{{ getServiceTypeLabel(item.listservice.type) }}</p>
            <p class="service-quantity">{{ item.quantity }} {{ getUnitLabel(item.listservice.servicecategory.unit) }}</p>
            <p class="service-pieces">{{ item.numberpieces }} piezas</p>
            <p v-if="item.observations" class="service-observations">
              📝 {{ item.observations }}
            </p>
            
            <!-- Estado del item -->
            <div class="item-status-section">
              <p class="item-status-label">Estado:</p>
              <p class="item-status" :class="getItemStatusClass(item.statusOrder)">
                {{ getStatusLabel(item.statusOrder) }}
              </p>
              <button 
                v-if="canChangeItemStatus(item.statusOrder)"
                @click="changeItemStatus(item.id, item.statusOrder)"
                class="item-status-button"
                :disabled="changingItemStatus"
              >
                {{ changingItemStatus ? 'Actualizando...' : 'Siguiente estado' }}
              </button>
            </div>
          </div>
          <div class="service-price">
            S/. {{ formatPrice(item.subtotal) }}
          </div>
        </div>
      </section>

      <!-- Resumen -->
      <section class="summary-section">
        <div class="summary-row">
          <span class="summary-label">Sub total</span>
          <span class="summary-value">S/. {{ formatPrice(subtotal) }}</span>
        </div>
        
        <div class="summary-row delivery-date">
          <span class="summary-label">Fecha de entrega</span>
          <span class="summary-value">{{ formatDate(orderService.salesorder?.servicedeadline) }}</span>
        </div>

        <div class="divider"></div>

        <div class="summary-row total">
          <span class="total-label">Total</span>
          <span class="total-value">S/. {{ formatPrice(total) }}</span>
        </div>
      </section>

      <!-- Mensaje de estado general -->
      <div class="order-status-summary">
        <p class="summary-label">Estado General de la Orden:</p>
        <p class="summary-status" :class="statusClass">
          {{ getStatusLabel(orderService.statusOrder) }}
        </p>
        <p class="summary-note">
          El estado general es el estado de menor nivel entre todos los items.
        </p>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { lavanderiaApi } from '@/api/lavanderiaApi'

// Types
interface ServiceOrder {
  id: number
  code?: string
  statusOrder: string
  createdAt: string
  updatedAt: string
  cliente: {
    id: number
    firstname: string
    lastname: string
    phone: string
    email: string
  }
  pointsale: {
    id: number
    name: string
  }
  itemserviceorders: Array<{
    id: number
    code?: string
    statusOrder: string
    quantity: number
    totalPrice: number
    numberpieces: number
    subtotal: number
    observations?: string
    listservice: {
      id: number
      type: string
      basePrice: number
      servicecategory: {
        name: string
        unit: string
        categoryType: string
      }
    }
  }>
  salesorder?: {
    id: number
    code?: string
    total: number
    servicedeadline: string
    statusPay: string
  }
}

// Router
const router = useRouter()
const route = useRoute()

// State
const orderService = ref<ServiceOrder | null>(null)
const loading = ref(false)
const error = ref('')
const changingStatus = ref(false)
const changingItemStatus = ref(false)
const changingItemId = ref<number | null>(null)

// Computed
const subtotal = computed(() => {
  if (!orderService.value) return 0
  return orderService.value.itemserviceorders.reduce((sum, item) => sum + Number(item.subtotal), 0)
})

const total = computed(() => {
  if (orderService.value?.salesorder?.total) {
    return Number(orderService.value.salesorder.total)
  }
  return subtotal.value
})

const statusClass = computed(() => {
  if (!orderService.value) return ''
  const status = orderService.value.statusOrder
  return {
    'status-received': status === 'RECEIVED',
    'status-progress': status === 'IN_PROGRESS',
    'status-ready': status === 'READY',
    'status-delivered': status === 'DELIVERED'
  }
})

const canChangeStatus = computed(() => {
  return orderService.value?.statusOrder !== 'DELIVERED'
})

const canChangeItemStatus = (itemStatus: string) => {
  return itemStatus !== 'DELIVERED'
}

// Methods
const goBack = () => {
  // Navegar de regreso a la lista de órdenes con el estado actual
  if (orderService.value?.statusOrder) {
    router.push({ 
      path: '/orders-service-state', 
      query: { status: orderService.value.statusOrder } 
    })
  } else {
    router.back()
  }
}

const loadOrderService = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const orderId = route.params.id
    const { data } = await lavanderiaApi.get(`/serviceorder/${orderId}`)
    orderService.value = data
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Error al cargar la orden de servicio'
    console.error('Error loading order service:', err)
  } finally {
    loading.value = false
  }
}

const changeStatus = async () => {
  if (!orderService.value || changingStatus.value) return

  const currentStatus = orderService.value.statusOrder
  const nextStatus = getNextStatus(currentStatus)
  
  if (!nextStatus) return

  // Validación: Si está pasando de READY a DELIVERED, verificar que el saldo sea cero
  if (currentStatus === 'READY' && nextStatus === 'DELIVERED') {
    if (!orderService.value.salesorder) {
      alert('No se encontró la orden de venta asociada')
      return
    }

    try {
      // Obtener la orden de venta con los pagos
      const { data: salesOrder } = await lavanderiaApi.get(`/salesorder/${orderService.value.salesorder.id}`)
      
      // Calcular el saldo
      const total = Number(salesOrder.total) || 0
      const totalPaid = salesOrder.payments?.reduce((sum: number, payment: any) => {
        return sum + (Number(payment.amount) || 0)
      }, 0) || 0
      
      const balance = total - totalPaid
      
      // Si hay saldo pendiente, no permitir el cambio de estado
      if (balance > 0) {
        alert(`No se puede entregar el servicio. El cliente tiene un saldo pendiente de S/. ${balance.toFixed(2)}.\n\nPor favor, registre el pago antes de marcar como entregado.`)
        return
      }
    } catch (err: any) {
      console.error('Error al verificar el saldo:', err)
      alert('Error al verificar el estado de pago')
      return
    }
  }

  changingStatus.value = true
  
  try {
    const { data } = await lavanderiaApi.patch(
      `/serviceorder/${orderService.value.id}/status`,
      { statusOrder: nextStatus }
    )
    orderService.value = data
    
    // Mostrar mensaje de éxito y regresar a la lista con el nuevo estado
    alert(`Estado actualizado a: ${getStatusLabel(nextStatus)}`)
    
    // Navegar a la lista con el nuevo estado
    router.push({ 
      path: '/orders-service-state', 
      query: { status: nextStatus } 
    })
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Error al actualizar el estado'
    console.error('Error changing status:', err)
    alert('Error al actualizar el estado')
  } finally {
    changingStatus.value = false
  }
}

const changeItemStatus = async (itemId: number, currentItemStatus: string) => {
  if (changingItemStatus.value || changingItemId.value === itemId) return

  const nextStatus = getNextStatus(currentItemStatus)
  if (!nextStatus) return

  changingItemStatus.value = true
  changingItemId.value = itemId
  
  try {
    const { data } = await lavanderiaApi.patch(
      `/serviceorder/item/${itemId}/status`,
      { statusOrder: nextStatus }
    )
    
    // Actualizar la orden completa con los nuevos datos
    orderService.value = data
    
    // Mostrar mensaje de éxito
    alert(`Estado del item actualizado a: ${getStatusLabel(nextStatus)}`)
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || 'Error al actualizar el estado del item'
    console.error('Error changing item status:', err)
    alert(errorMessage)
  } finally {
    changingItemStatus.value = false
    changingItemId.value = null
  }
}

const getItemStatusClass = (status: string) => {
  return {
    'status-received': status === 'RECEIVED',
    'status-progress': status === 'IN_PROGRESS',
    'status-ready': status === 'READY',
    'status-delivered': status === 'DELIVERED'
  }
}

const getNextStatus = (currentStatus: string): string | null => {
  const statusFlow = {
    'RECEIVED': 'IN_PROGRESS',
    'IN_PROGRESS': 'READY',
    'READY': 'DELIVERED',
    'DELIVERED': null
  }
  return statusFlow[currentStatus as keyof typeof statusFlow] || null
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'RECEIVED': 'Recibido',
    'IN_PROGRESS': 'En Proceso',
    'READY': 'Listo',
    'DELIVERED': 'Entregado'
  }
  return labels[status] || status
}

const getServiceTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'GENERAL': 'General',
    'ABRIGO': 'Abrigo',
    'FRAZADA': 'Frazada',
    'EN_SECO': 'En Seco'
  }
  return labels[type] || type
}

const getUnitLabel = (unit: string): string => {
  const labels: Record<string, string> = {
    'KILOGRAM': 'kg',
    'UNIT': 'unidades',
    'PAIR': 'par',
    'METER': 'metros'
  }
  return labels[unit] || unit
}

const formatPrice = (price: any): string => {
  if (typeof price === 'number') {
    return price.toFixed(2)
  }
  // Si es un Decimal de Prisma u otro tipo, convertirlo a número
  return Number(price).toFixed(2)
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'No definida'
  
  const date = new Date(dateString)
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Lifecycle
onMounted(() => {
  loadOrderService()
})
</script>

<style scoped>
.order-service-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.content-wrapper {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 0 auto;
  position: relative;
  background-color: #ffffff;
  padding: 20px;
}

/* Asegurar que en desktop el contenido esté centrado */
@media (min-width: 769px) {
  .content-wrapper {
    max-width: 800px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-top: 20px;
    margin-bottom: 20px;
  }
}

@media (min-width: 1024px) {
  .content-wrapper {
    max-width: 900px;
    padding: 30px;
  }
}

@media (min-width: 1280px) {
  .content-wrapper {
    max-width: 1000px;
    padding: 40px;
  }
}

/* Header */
.order-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.back-button {
  background: none;
  border: none;
  padding: 8px;
  margin-right: 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button:hover {
  background-color: #f5f5f5;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

/* Loading & Error */
.loading-container,
.error-container {
  text-align: center;
  padding: 40px 20px;
}

.error-message {
  color: #e74c3c;
  margin-bottom: 16px;
}

.btn-retry {
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

/* Client Section */
.client-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.client-name {
  font-size: 15px;
  font-weight: 500;
  color: #e74c3c;
  margin: 0 0 4px 0;
}

.client-phone {
  font-size: 15px;
  color: #e74c3c;
  margin: 0 0 12px 0;
}

.pointsale-info-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fff5f2;
  border-left: 3px solid #ff6b35;
  padding: 10px 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.pointsale-text {
  font-size: 14px;
  color: #333;
}

.pointsale-text strong {
  color: #ff6b35;
}

.order-code-box {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
  padding: 10px 12px;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #1976d2;
  font-weight: 600;
}

.order-status {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  padding: 6px 12px;
  border-radius: 6px;
  display: inline-block;
}

.status-received {
  background-color: #fff3cd;
  color: #856404;
}

.status-progress {
  background-color: #cfe2ff;
  color: #084298;
}

.status-ready {
  background-color: #d1e7dd;
  color: #0f5132;
}

.status-delivered {
  background-color: #d1e7dd;
  color: #0f5132;
}

/* Services Section */
.services-section {
  margin-bottom: 24px;
}

.service-item {
  background-color: #ffe8d9;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.service-info {
  flex: 1;
}

.service-code {
  font-size: 13px;
  font-weight: 600;
  color: #1976d2;
  margin: 0 0 8px 0;
  background-color: #e3f2fd;
  padding: 6px 10px;
  border-radius: 4px;
  display: inline-block;
}

.service-category {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.service-type {
  font-size: 14px;
  color: #666;
  margin: 0 0 4px 0;
}

.service-quantity {
  font-size: 14px;
  color: #666;
  margin: 0 0 2px 0;
}

.service-pieces {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.service-observations {
  font-size: 13px;
  color: #856404;
  background-color: #fff3cd;
  padding: 8px 10px;
  border-radius: 6px;
  margin: 8px 0 0 0;
  font-style: italic;
  border-left: 3px solid #ffc107;
}

.item-status-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-status-label {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin: 0;
}

.item-status {
  font-size: 13px;
  font-weight: 500;
  margin: 0;
  padding: 6px 12px;
  border-radius: 6px;
  display: inline-block;
  width: fit-content;
}

.item-status-button {
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  width: fit-content;
}

.item-status-button:hover:not(:disabled) {
  background-color: #e55a2b;
}

.item-status-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.service-price {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-left: 16px;
}

/* Summary Section */
.summary-section {
  margin-bottom: 24px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.summary-label {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.delivery-date {
  padding-bottom: 16px;
}

.delivery-date .summary-label,
.delivery-date .summary-value {
  font-size: 14px;
  font-weight: 400;
  color: #666;
}

.divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 8px 0;
}

.total {
  padding-top: 16px;
}

.total-label {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.total-value {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

/* Action Button */
.action-button {
  width: 100%;
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-button:hover:not(:disabled) {
  background-color: #c0392b;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.order-status-summary {
  margin-top: 24px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #ff6b35;
}

.summary-label {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin: 0 0 8px 0;
}

.summary-status {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  padding: 8px 12px;
  border-radius: 6px;
  display: inline-block;
}

.summary-note {
  font-size: 12px;
  color: #666;
  margin: 0;
  font-style: italic;
}

/* Responsive - Mobile */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 20px;
  }
}

/* Responsive - Desktop */
@media (min-width: 769px) {
  .order-service-container {
    padding: 20px;
  }

  .order-header {
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 30px;
    background-color: #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .title {
    font-size: 24px;
  }

  .client-section,
  .services-section,
  .summary-section {
    margin-bottom: 30px;
  }

  .section-title {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .client-name {
    font-size: 18px;
  }

  .client-phone {
    font-size: 16px;
  }

  .service-item {
    padding: 20px;
    margin-bottom: 16px;
  }

  .service-category {
    font-size: 16px;
  }

  .service-price {
    font-size: 20px;
  }

  .summary-label,
  .summary-value {
    font-size: 18px;
  }

  .total-label,
  .total-value {
    font-size: 20px;
  }

  .action-button {
    padding: 18px;
    font-size: 18px;
  }
}

@media (min-width: 1024px) {
  .order-service-container {
    padding: 30px;
  }

  .content-wrapper {
    padding: 40px;
  }

  .order-header {
    padding: 24px;
  }

  .title {
    font-size: 28px;
  }

  .section-title {
    font-size: 20px;
  }

  .client-name {
    font-size: 20px;
  }

  .service-item {
    padding: 24px;
  }

  .service-category {
    font-size: 18px;
  }

  .service-price {
    font-size: 22px;
  }
}

@media (min-width: 1280px) {
  .order-service-container {
    padding: 40px;
  }

  .content-wrapper {
    padding: 50px;
  }
}
</style>

<style>
/* Override global body styles para centrar el contenido */
body:has(.order-service-container) {
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

#app:has(.order-service-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.order-service-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* Asegurar que el contenedor principal esté centrado */
.order-service-container {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* En desktop, centrar el content-wrapper */
@media (min-width: 769px) {
  .order-service-container {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
  }
  
  .order-service-container .content-wrapper {
    width: 100% !important;
    max-width: 800px !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
}

@media (min-width: 1024px) {
  .order-service-container .content-wrapper {
    max-width: 900px !important;
  }
}

@media (min-width: 1280px) {
  .order-service-container .content-wrapper {
    max-width: 1000px !important;
  }
}
</style>


