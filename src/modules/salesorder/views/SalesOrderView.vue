<template>
  <div class="sales-order-container">
    <!-- Header -->
    <header class="sales-header">
      <button class="back-button" @click="goBack" title="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Orden de Venta</h1>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <p>Cargando orden de venta...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button @click="loadSalesOrder" class="btn-retry">Reintentar</button>
    </div>

    <!-- Content -->
    <div v-else-if="salesOrder" class="content">
      <!-- Grid Container for Desktop -->
      <div class="content-grid">
        <!-- Datos de cliente -->
        <section class="client-section">
        <h2 class="section-title">Datos de cliente</h2>
        
        <!-- Código de Orden -->
        <div v-if="salesOrder.code" class="order-code-box">
          <strong>Código:</strong> {{ salesOrder.code }}
        </div>
        
        <div class="client-info-grid">
          <div class="client-info-item">
            <p class="client-name">{{ salesOrder.serviceorder.cliente.firstname }} {{ salesOrder.serviceorder.cliente.lastname }}</p>
            <p class="client-phone">{{ salesOrder.serviceorder.cliente.phone }}</p>
          </div>
          <div class="client-info-item text-right">
            <p class="client-label">DNI: <span class="client-value">{{ salesOrder.serviceorder.cliente.dni || 'N/A' }}</span></p>
            <p class="client-label">Fecha Entrega: <span class="client-value">{{ formatDate(salesOrder.servicedeadline) }}</span></p>
          </div>
        </div>
        
        <!-- Punto de Venta -->
        <div class="pointsale-section">
          <p class="pointsale-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Punto de Venta:
          </p>
          <p class="pointsale-value">{{ salesOrder.serviceorder.pointsale?.name || 'N/A' }}</p>
        </div>
        
        <!-- Estados ocultos - no mostrar -->
        <!-- <div class="status-container">
          <p class="order-status" :class="getOrderStatusClass(salesOrder.serviceorder.statusOrder)">
            Estado Order Servicio: {{ getOrderStatusLabel(salesOrder.serviceorder.statusOrder) }}
          </p>
          <p class="payment-status" :class="getPaymentStatusClass(salesOrder.statusPay)">
            Estado Orden de Venta: {{ getPaymentStatusLabel(salesOrder.statusPay) }}
          </p>
        </div> -->
      </section>

      <!-- Detalle Servicios -->
      <section class="services-section">
        <h2 class="section-title">Detalle Servicios</h2>
        
        <div 
          v-for="item in salesOrder.serviceorder.itemserviceorders" 
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
          </div>
          <div class="service-price">
            S/. {{ formatPrice(item.subtotal) }}
          </div>
        </div>
      </section>

      <!-- Total -->
      <section class="total-section">
        <div class="total-row">
          <span class="total-label">Total</span>
          <span class="total-value">S/. {{ formatPrice(salesOrder.total) }}</span>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- Pagos a cuenta -->
      <section class="payments-section">
        <div class="payments-header">
          <h2 class="section-title">Pagos a cuenta</h2>
          <span class="payments-total">S/. {{ formatPrice(totalPaid) }}</span>
        </div>
        
        <div v-if="salesOrder.payments && salesOrder.payments.length > 0" class="payments-list">
          <div 
            v-for="payment in salesOrder.payments" 
            :key="payment.id"
            class="payment-item"
          >
            <span class="payment-date">{{ formatDate(payment.datepaid) }}</span>
            <span class="payment-amount">S/. {{ formatPrice(payment.amount) }}</span>
          </div>
        </div>
        <div v-else class="no-payments">
          <p>No hay pagos registrados</p>
        </div>
      </section>

      <!-- Saldo -->
      <section class="balance-section">
        <div class="balance-row">
          <span class="balance-label">Saldo</span>
          <span class="balance-value" :class="{ 'balance-zero': balance === 0 }">
            S/. {{ formatPrice(balance) }}
          </span>
        </div>
      </section>

      <!-- Botón Registrar Pago -->
      <button 
        v-if="balance > 0"
        @click="goToPayment" 
        class="action-button"
      >
        Registrar Pago
      </button>

      <p v-else class="completed-message">
        ✓ Orden pagada completamente
      </p>
      </div> <!-- Cierra content-grid -->
    </div>

    <!-- Modal para registrar pago -->
    <div v-if="showPaymentModal" class="modal-overlay" @click="closePaymentModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Registrar Pago</h3>
          <button @click="closePaymentModal" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Monto a pagar</label>
            <input 
              v-model="paymentForm.amount" 
              type="number" 
              step="0.01"
              min="0.01"
              :max="balance"
              class="form-input"
              placeholder="0.00"
            >
            <p class="form-helper">Saldo pendiente: S/. {{ formatPrice(balance) }}</p>
          </div>

          <div class="form-group">
            <label class="form-label">Método de pago</label>
            <select v-model="paymentForm.methodpay" class="form-select">
              <option value="CASH">Efectivo</option>
              <option value="YAPE_PLIN">Yape/Plin</option>
            </select>
          </div>

          <div v-if="paymentError" class="error-alert">
            {{ paymentError }}
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closePaymentModal" class="btn-cancel">Cancelar</button>
          <button 
            @click="submitPayment" 
            class="btn-confirm"
            :disabled="!isPaymentValid || submittingPayment"
          >
            {{ submittingPayment ? 'Procesando...' : 'Confirmar Pago' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { lavanderiaApi } from '@/api/lavanderiaApi'

// Types
interface Payment {
  id: number
  amount: number
  methodpay: string
  datepaid: string
}

interface SalesOrder {
  id: number
  code?: string
  total: number
  servicedeadline: string
  statusPay: string
  createdAt: string
  updatedAt: string
  serviceorder: {
    id: number
    code?: string
    statusOrder: string
    cliente: {
      id: number
      firstname: string
      lastname: string
      phone: string
      email: string
      dni?: string
    }
    pointsale: {
      id: number
      name: string
    }
    itemserviceorders: Array<{
      id: number
      code?: string
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
  }
  payments: Payment[]
}

// Router
const router = useRouter()
const route = useRoute()

// State
const salesOrder = ref<SalesOrder | null>(null)
const loading = ref(false)
const error = ref('')
const showPaymentModal = ref(false)
const submittingPayment = ref(false)
const paymentError = ref('')

const paymentForm = ref({
  amount: 0,
  methodpay: 'CASH'
})

// Computed
const totalPaid = computed(() => {
  if (!salesOrder.value?.payments) return 0
  return salesOrder.value.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
})

const balance = computed(() => {
  if (!salesOrder.value) return 0
  return Number(salesOrder.value.total) - totalPaid.value
})

const isPaymentValid = computed(() => {
  const amount = Number(paymentForm.value.amount)
  return amount > 0 && amount <= balance.value && paymentForm.value.methodpay
})

// Methods
const goBack = () => {
  router.push({ name: 'dashboard' })
}

const goToPayment = () => {
  router.push({ name: 'sales-order-payment', params: { id: route.params.id } })
}

const loadSalesOrder = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const salesOrderId = route.params.id
    const { data } = await lavanderiaApi.get(`/salesorder/${salesOrderId}`)
    salesOrder.value = data
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Error al cargar la orden de venta'
    console.error('Error loading sales order:', err)
  } finally {
    loading.value = false
  }
}

// Ya no se usa modal, se navega a PaymentView.vue
// const openPaymentModal = () => {
//   paymentForm.value.amount = 0
//   paymentForm.value.methodpay = 'CASH'
//   paymentError.value = ''
//   showPaymentModal.value = true
// }

const closePaymentModal = () => {
  showPaymentModal.value = false
  paymentError.value = ''
}

const submitPayment = async () => {
  if (!isPaymentValid.value || !salesOrder.value || submittingPayment.value) return

  submittingPayment.value = true
  paymentError.value = ''

  try {
    const paymentData = {
      amount: Number(paymentForm.value.amount),
      methodpay: paymentForm.value.methodpay,
      salesorderId: salesOrder.value.id
    }

    await lavanderiaApi.post('/payment', paymentData)
    
    // Recargar la orden de venta para actualizar los pagos
    await loadSalesOrder()
    
    closePaymentModal()
    alert('Pago registrado exitosamente')
  } catch (err: any) {
    paymentError.value = err.response?.data?.message || 'Error al registrar el pago'
    console.error('Error submitting payment:', err)
  } finally {
    submittingPayment.value = false
  }
}

const getOrderStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'RECEIVED': 'Recibido',
    'IN_PROGRESS': 'En Proceso',
    'READY': 'Listo',
    'DELIVERED': 'Entregado'
  }
  return labels[status] || status
}

const getOrderStatusClass = (status: string): string => {
  return `status-order-${status.toLowerCase()}`
}

const getPaymentStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'UNPAID': 'Sin Pagar',
    'PARTIAL': 'Pago Parcial',
    'PAID': 'Pagado'
  }
  return labels[status] || status
}

const getPaymentStatusClass = (status: string): string => {
  return `status-payment-${status.toLowerCase()}`
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

const formatPrice = (price: number): string => {
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
  loadSalesOrder()
})

// Recargar cuando cambie el ID o cuando haya un query parameter de recarga
watch(() => [route.params.id, route.query.reload], ([newId, reload], [oldId]) => {
  if (newId && (newId !== oldId || reload)) {
    console.log('🔄 Ruta cambió o recarga solicitada, recargando orden de venta...')
    loadSalesOrder()
    
    // Limpiar el query parameter de recarga si existe
    if (reload) {
      router.replace({ name: 'sales-order-detail', params: { id: String(newId) } })
    }
  }
})
</script>

<style>
/* Estilos globales para sobrescribir el body solo en esta vista */
body:has(.sales-order-container) {
  display: block !important;
  place-items: unset !important;
  padding: 0 !important;
  margin: 0 !important;
}
</style>

<style scoped>
.sales-order-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  box-sizing: border-box;
}

/* Header */
.sales-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
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

.client-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.client-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pointsale-section {
  background-color: #fff5f2;
  border-left: 3px solid #ff6b35;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.pointsale-label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pointsale-value {
  font-size: 15px;
  font-weight: 600;
  color: #ff6b35;
  margin: 0;
  padding-left: 22px;
}

.text-right {
  text-align: right;
}

.client-name {
  font-size: 15px;
  font-weight: 500;
  color: #e74c3c;
  margin: 0;
}

.client-phone {
  font-size: 15px;
  color: #e74c3c;
  margin: 0;
}

.client-label {
  font-size: 13px;
  color: #e74c3c;
  margin: 0;
}

.client-value {
  font-weight: 500;
}

.status-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.order-status,
.payment-status {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  padding: 6px 12px;
  border-radius: 6px;
  display: inline-block;
}

.status-order-received { background-color: #fff3cd; color: #856404; }
.status-order-in_progress { background-color: #cfe2ff; color: #084298; }
.status-order-ready { background-color: #d1e7dd; color: #0f5132; }
.status-order-delivered { background-color: #d1e7dd; color: #0f5132; }

.status-payment-unpaid { background-color: #f8d7da; color: #721c24; }
.status-payment-partial { background-color: #fff3cd; color: #856404; }
.status-payment-paid { background-color: #d1e7dd; color: #0f5132; }

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

.service-price {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-left: 16px;
}

/* Total Section */
.total-section {
  margin-bottom: 16px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #e0e0e0;
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

.section-divider {
  height: 1px;
  background-color: #ff6b35;
  margin: 24px 0;
}

/* Payments Section */
.payments-section {
  margin-bottom: 24px;
}

.payments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.payments-total {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.payment-date {
  font-size: 14px;
  color: #e74c3c;
}

.payment-amount {
  font-size: 14px;
  color: #e74c3c;
  font-weight: 500;
}

.no-payments {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}

/* Balance Section */
.balance-section {
  margin-bottom: 24px;
}

.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.balance-label {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.balance-value {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.balance-zero {
  color: #0f5132;
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

.action-button:hover {
  background-color: #c0392b;
}

.completed-message {
  text-align: center;
  color: #0f5132;
  font-size: 16px;
  font-weight: 500;
  padding: 16px;
  background-color: #d1e7dd;
  border-radius: 8px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 32px;
  line-height: 1;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.modal-close:hover {
  background-color: #f5f5f5;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #e74c3c;
}

.form-helper {
  font-size: 13px;
  color: #666;
  margin-top: 6px;
}

.error-alert {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-top: 12px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background-color: #e0e0e0;
}

.btn-confirm {
  background-color: #e74c3c;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background-color: #c0392b;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Content Grid - Default (Mobile): No Grid */
.content-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 480px;
  margin: 0 auto;
}

/* Responsive */
@media (min-width: 768px) {
  .sales-order-container {
    width: 100%;
    max-width: 100%;
    padding: 1.5rem;
  }

  .content-grid {
    max-width: 100%;
    margin: 0;
  }

  .sales-header {
    background: white;
    padding: 1.25rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    margin-bottom: 1.5rem;
    border-bottom: none;
    max-width: 100%;
  }

  .title {
    font-size: 24px;
  }

  /* Grid de 2 columnas para organizar contenido */
  .content-grid {
    display: grid !important;
    grid-template-columns: 400px 1fr;
    grid-template-rows: auto auto auto auto auto;
    gap: 1.25rem;
    align-items: start;
    width: 100%;
    max-width: 100%;
  }

  .client-section {
    grid-column: 1;
    grid-row: 1;
    background: white;
    padding: 1.25rem;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 0;
  }

  .services-section {
    grid-column: 2;
    grid-row: 1 / span 5;
    background: white;
    padding: 1.25rem;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 0;
    max-height: calc(100vh - 180px);
    overflow-y: auto;
  }

  .total-section {
    grid-column: 1;
    grid-row: 2;
    background: white;
    padding: 1rem 1.25rem;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 0;
  }

  .section-divider {
    display: none;
  }

  .payments-section {
    grid-column: 1;
    grid-row: 3;
    background: white;
    padding: 1.25rem;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 0;
  }

  .balance-section {
    grid-column: 1;
    grid-row: 4;
    background: white;
    padding: 1rem 1.25rem;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 0;
  }

  .action-button,
  .completed-message {
    grid-column: 1;
    grid-row: 5;
    margin: 0;
  }

  .section-title {
    font-size: 18px;
    margin-bottom: 1rem;
  }

  .service-item {
    padding: 1rem;
  }

  .total-row,
  .balance-row {
    padding: 0;
    border-bottom: none;
  }
}

@media (min-width: 1280px) {
  .sales-order-container {
    padding: 2rem;
  }

  .content-grid {
    grid-template-columns: 450px 1fr;
    gap: 1.75rem;
  }

  .section-title {
    font-size: 20px;
  }

  .client-section,
  .services-section,
  .total-section,
  .payments-section,
  .balance-section {
    padding: 1.5rem;
  }
}

@media (min-width: 1600px) {
  .sales-order-container {
    padding: 2rem 3rem;
  }

  .content-grid {
    grid-template-columns: 500px 1fr;
    gap: 2rem;
  }
}
</style>