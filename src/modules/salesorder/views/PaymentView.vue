<template>
  <div class="payment-container">
    <!-- Header con fondo degradado -->
    <header class="payment-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#fff" stroke-width="2" fill="none" />
        </svg>
      </button>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <p>Cargando información...</p>
    </div>

    <!-- Content -->
    <div v-else-if="salesOrder" class="content">
      <!-- Card de Registro de Pago -->
      <div class="payment-card">
        <h2 class="card-title">Registrar pago</h2>
        
        <!-- Saldo Pendiente -->
        <div class="balance-info">
          <span class="balance-label">Saldo Pendiente</span>
          <span class="balance-amount">S/. {{ formatPrice(balance) }}</span>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="handleSubmit" class="payment-form">
          <!-- Selecciona tipo de pago -->
          <div class="form-group">
            <select 
              v-model="paymentForm.paymentType" 
              class="form-select"
              required
            >
              <option value="" disabled>Selecciona tipo de pago</option>
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="YAPE">Yape</option>
              <option value="PLIN">Plin</option>
              <option value="CARD">Tarjeta</option>
            </select>
            <svg class="select-icon" width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M1 1L6 6L11 1" stroke="#ff6b35" stroke-width="2"/>
            </svg>
          </div>

          <!-- Ingresar Monto -->
          <div class="form-group">
            <input 
              v-model.number="paymentForm.amount" 
              type="number" 
              step="0.01"
              min="0.01"
              :max="balance"
              class="form-input"
              placeholder="Ingresar Monto"
              required
            >
          </div>

          <!-- Mensaje de error -->
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

          <!-- Mensaje de cuadre aprobado -->
          <div v-if="isCashBalanceApprovedForPayment && paymentForm.paymentType === 'CASH'" class="warning-message">
            <p>⚠️ El cuadre de caja para esta fecha ya está aprobado. No se pueden registrar pagos en efectivo.</p>
            <p>Contacte a un administrador para reactivar el cuadre si necesita hacer cambios.</p>
          </div>

          <!-- Botón Registrar Pago -->
          <button 
            type="submit" 
            class="submit-button"
            :disabled="submitting || isCashBalanceApprovedForPayment"
          >
            {{ submitting ? 'Procesando...' : 'Registrar Pago' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <p class="error-text">{{ error }}</p>
      <button @click="loadSalesOrder" class="btn-retry">Reintentar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { lavanderiaApi } from '@/api/lavanderiaApi'
import { isCashBalanceApproved } from '@/utils/cashBalance'

const router = useRouter()
const route = useRoute()

// Estado
const salesOrder = ref<any>(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const errorMessage = ref('')

// Formulario de pago
const paymentForm = ref({
  paymentType: '',
  amount: 0,
})

// Computed
const balance = computed(() => {
  if (!salesOrder.value) return 0
  
  const total = Number(salesOrder.value.total) || 0
  const totalPaid = salesOrder.value.payments?.reduce((sum: number, payment: any) => {
    return sum + (Number(payment.amount) || 0)
  }, 0) || 0
  
  return total - totalPaid
})

// Verificar si el cuadre está aprobado para pagos en efectivo
const isCashBalanceApprovedForPayment = computed(() => {
  if (!salesOrder.value) return false
  
  // Solo verificar si el tipo de pago es efectivo
  if (paymentForm.value.paymentType !== 'CASH') return false
  
  const pointsaleId = salesOrder.value.serviceorder?.pointsaleId
  if (!pointsaleId) return false
  
  // Obtener la fecha del pago (hoy por defecto)
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateString = `${year}-${month}-${day}`
  
  return isCashBalanceApproved(pointsaleId, dateString)
})

// Métodos
const goBack = () => {
  router.push({ name: 'sales-order-detail', params: { id: route.params.id } })
}

const formatPrice = (price: any) => {
  if (typeof price === 'number') {
    return price.toFixed(2)
  }
  return Number(price).toFixed(2)
}

const loadSalesOrder = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const salesOrderId = Number(route.params.id)
    
    console.log('🔍 Cargando orden de venta:', salesOrderId)
    
    const response = await lavanderiaApi.get(`/salesorder/${salesOrderId}`)
    
    console.log('📦 Orden de venta cargada:', response.data)
    salesOrder.value = response.data
    
  } catch (err: any) {
    console.error('❌ Error al cargar orden de venta:', err)
    error.value = err.response?.data?.message || 'Error al cargar la orden de venta'
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  try {
    errorMessage.value = ''
    
    // Verificar si el cuadre está aprobado para pagos en efectivo
    if (isCashBalanceApprovedForPayment.value) {
      errorMessage.value = 'El cuadre de caja para esta fecha ya está aprobado. No se pueden registrar pagos en efectivo. Contacte a un administrador para reactivar el cuadre.'
      return
    }
    
    // Validaciones
    if (!paymentForm.value.paymentType) {
      errorMessage.value = 'Debe seleccionar un tipo de pago'
      return
    }
    
    if (!paymentForm.value.amount || paymentForm.value.amount <= 0) {
      errorMessage.value = 'El monto debe ser mayor a 0'
      return
    }
    
    // Validación estricta: no permitir montos mayores al saldo
    const currentBalance = balance.value
    if (paymentForm.value.amount > currentBalance) {
      errorMessage.value = `El monto ingresado (S/. ${formatPrice(paymentForm.value.amount)}) no puede ser mayor al saldo pendiente (S/. ${formatPrice(currentBalance)})`
      return
    }
    
    // Redondear a 2 decimales para evitar problemas de precisión
    const amountToSubmit = Math.round(paymentForm.value.amount * 100) / 100
    
    if (amountToSubmit > currentBalance) {
      errorMessage.value = 'El monto ingresado excede el saldo pendiente'
      return
    }
    
    submitting.value = true
    
    const salesOrderId = Number(route.params.id)
    
    // Preparar datos del pago
    const paymentData = {
      salesorderId: salesOrderId,
      amount: amountToSubmit,
      paymenttype: paymentForm.value.paymentType,
      datepaid: new Date().toISOString(),
    }
    
    console.log('💰 Registrando pago:', paymentData)
    
    // Enviar pago al backend
    const response = await lavanderiaApi.post('/payment', paymentData)
    
    console.log('✅ Pago registrado:', response.data)
    
    // Mostrar mensaje de éxito
    alert(`Pago de S/. ${formatPrice(amountToSubmit)} registrado correctamente`)
    
    // Regresar a la vista de detalle de orden de venta con query param para forzar recarga
    router.push({ 
      name: 'sales-order-detail', 
      params: { id: salesOrderId },
      query: { reload: 'true' }
    })
    
  } catch (err: any) {
    console.error('❌ Error al registrar pago:', err)
    errorMessage.value = err.response?.data?.message || 'Error al registrar el pago'
  } finally {
    submitting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadSalesOrder()
})
</script>

<style scoped>
.payment-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffeee7 0%, #f8f9fa 50%);
  padding-bottom: 2rem;
}

/* Header */
.payment-header {
  background: linear-gradient(135deg, #ff6b35 0%, #ff9068 100%);
  padding: 3rem 1rem 8rem 1rem;
  position: relative;
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
  background-color: rgba(255, 255, 255, 0.1);
}

/* Content */
.content {
  padding: 0 1rem;
  margin-top: -6rem;
  position: relative;
  z-index: 10;
}

/* Payment Card */
.payment-card {
  background-color: #e0e0e0;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
  text-align: center;
}

/* Balance Info */
.balance-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.balance-label {
  font-size: 0.875rem;
  color: #333;
  font-weight: 500;
}

.balance-amount {
  font-size: 1.25rem;
  font-weight: 700;
  color: #333;
}

/* Form */
.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  position: relative;
}

.form-select {
  width: 100%;
  padding: 0.875rem 2.5rem 0.875rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: #ffe5dc;
  font-size: 0.875rem;
  color: #333;
  appearance: none;
  cursor: pointer;
  outline: none;
  font-weight: 500;
}

.form-select option {
  background-color: #fff;
  color: #333;
}

.form-select option:disabled {
  color: #999;
}

.select-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: #ffe5dc;
  font-size: 0.875rem;
  color: #333;
  outline: none;
  font-weight: 500;
}

.form-input::placeholder {
  color: #999;
}

.form-input:focus {
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
}

/* Remove spinner from number input */
.form-input[type="number"]::-webkit-inner-spin-button,
.form-input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.form-input[type="number"] {
  -moz-appearance: textfield;
}

/* Warning Message */
.warning-message {
  background-color: #fff3cd;
  color: #856404;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  border: 1px solid #ffc107;
}

.warning-message p {
  margin: 0.25rem 0;
}

.warning-message p:first-child {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

/* Error Message */
.error-message {
  background-color: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  margin: 0;
  text-align: center;
}

/* Submit Button */
.submit-button {
  background: linear-gradient(135deg, #ff6b35 0%, #ff9068 100%);
  color: #fff;
  border: none;
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading & Error States */
.loading-container,
.error-container {
  padding: 3rem 1rem;
  text-align: center;
  color: #666;
}

.error-text {
  color: #c33;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.btn-retry {
  background-color: #ff6b35;
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-retry:hover {
  background-color: #e65a2a;
}

/* Responsive */
@media (min-width: 768px) {
  .payment-container {
    max-width: 600px;
    margin: 0 auto;
  }
}
</style>

