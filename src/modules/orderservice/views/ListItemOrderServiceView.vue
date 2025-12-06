<template>
  <div class="order-preview-container">
    <!-- Header -->
    <div class="header">
      <button @click="goBack" class="btn-back">
        <span>←</span> Volver
      </button>
      <h1>Vista Previa de Orden de Servicio</h1>
      <div></div>
    </div>

    <!-- Cards Grid Layout for Desktop -->
    <div class="cards-grid">
      <!-- Client Info Card -->
      <div class="card client-card">
      <div class="card-header">
        <h2>👤 Información del Cliente</h2>
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="label">Nombre:</span>
          <span class="value">{{ orderData?.client.name || 'N/A' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Teléfono:</span>
          <span class="value">{{ orderData?.client.phone || 'N/A' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Email:</span>
          <span class="value">{{ orderData?.client.email || 'N/A' }}</span>
        </div>
      </div>
    </div>

    <!-- Point of Sale Info Card -->
    <div class="card pointsale-card">
      <div class="card-header">
        <h2>🏪 Punto de Venta</h2>
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="label">Nombre:</span>
          <span class="value">{{ orderData?.pointsale.name || 'N/A' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Dirección:</span>
          <span class="value">{{ orderData?.pointsale.address || 'N/A' }}</span>
        </div>
      </div>
    </div>

    <!-- Service Items Card -->
    <div class="card services-card">
      <div class="card-header">
        <h2>🧺 Servicios Solicitados</h2>
      </div>
      <div class="card-body">
        <div class="services-list">
          <div 
            v-for="(item, index) in orderData?.items" 
            :key="index"
            class="service-item-card"
          >
            <div class="service-item-header">
              <span class="service-item-number">Item {{ index + 1 }}</span>
              <span class="service-item-subtotal" :class="{ 'has-discount': item.discount > 0 }">
                S/. {{ formatPrice(item.subtotalWithDiscount !== undefined ? item.subtotalWithDiscount : item.subtotal) }}
              </span>
            </div>
            <div class="service-item-details">
              <div class="detail-row">
                <span class="detail-label">Categoría:</span>
                <span class="detail-value">{{ item.categoryName }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Servicio:</span>
                <span class="detail-value">{{ item.serviceName }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Cantidad:</span>
                <span class="detail-value">{{ formatQuantity(item.quantity) }} {{ item.unit }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Precio Unit.:</span>
                <span class="detail-value">S/. {{ formatPrice(item.unitPrice) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Sub Total:</span>
                <span class="detail-value">S/. {{ formatPrice(item.subtotal) }}</span>
              </div>
              <div v-if="item.discount && item.discount > 0" class="detail-row discount-row">
                <span class="detail-label">Descuento:</span>
                <span class="detail-value discount-value">- S/. {{ formatPrice(item.discount) }}</span>
              </div>
              <div v-if="item.discount && item.discount > 0" class="detail-row subtotal-discount-row">
                <span class="detail-label">Sub Total con Descuento:</span>
                <span class="detail-value subtotal-discount-value">
                  S/. {{ formatPrice(item.subtotalWithDiscount !== undefined ? item.subtotalWithDiscount : item.subtotal - (item.discount || 0)) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">N° Piezas:</span>
                <span class="detail-value">{{ item.numberpieces }}</span>
              </div>
              <div v-if="item.observations" class="detail-row observations-row">
                <span class="detail-label">📝 Observaciones:</span>
                <span class="detail-value observations-text">{{ item.observations }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Total -->
        <div class="total-section">
          <div class="total-row">
            <span class="total-label">Total:</span>
            <span class="total-value">S/. {{ formatPrice(orderData?.total || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Deadline Info -->
    <div class="card deadline-card">
      <div class="card-header">
        <h2>📅 Fecha de Entrega *</h2>
      </div>
      <div class="card-body">
        <div class="date-input-container">
          <input 
            v-model="selectedDeadline"
            type="date"
            class="date-input"
            :min="minDate"
            :max="maxDate"
            @change="validateDate"
          >
          <p v-if="dateError" class="error-message">{{ dateError }}</p>
          <p class="date-info">Seleccione una fecha entre hoy y {{ maxDaysText }}</p>
        </div>
      </div>
    </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          @click="goBack" 
          class="btn-cancel"
          :disabled="confirming"
        >
          Cancelar
        </button>
        <button 
          @click="addMoreItems" 
          class="btn-add-more"
          :disabled="confirming || !orderData"
        >
          + Agregar Item
        </button>
        <button 
          @click="confirmService" 
          class="btn-confirm"
          :disabled="confirming || !orderData"
        >
          {{ confirming ? 'Confirmando...' : 'Confirmar Servicio' }}
        </button>
      </div>
    </div> <!-- Cierra cards-grid -->

    <!-- Loading Overlay -->
    <div v-if="confirming" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Creando orden de servicio...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { lavanderiaApi } from '@/api/lavanderiaApi'

// Types
interface OrderPreview {
  client: {
    id: number
    name: string
    phone: string
    email: string
  }
  pointsale: {
    id: number
    name: string
    address: string
  }
  items: Array<{
    listserviceId: number
    categoryName: string
    serviceName: string
    unit: string
    quantity: number
    unitPrice: number
    numberpieces: number
    subtotal: number
    discount?: number
    subtotalWithDiscount?: number
    observations?: string
  }>
  total: number
  servicedeadline: string
}

// Router
const router = useRouter()

// State
const orderData = ref<OrderPreview | null>(null)
const confirming = ref(false)
const selectedDeadline = ref('')
const dateError = ref('')

// Computed - Fechas mínima y máxima
const minDate = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString().split('T')[0]
})

const maxDate = computed(() => {
  const today = new Date()
  today.setDate(today.getDate() + 30)
  return today.toISOString().split('T')[0]
})

const maxDaysText = computed(() => {
  const today = new Date()
  today.setDate(today.getDate() + 30)
  return today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
})

// Methods
const goBack = () => {
  // Limpiar sessionStorage al cancelar
  sessionStorage.removeItem('orderPreview')
  sessionStorage.removeItem('existingOrder')
  router.back()
}

const addMoreItems = () => {
  if (!orderData.value) {
    console.error('❌ No hay datos de orden')
    return
  }
  
  console.log('➕ Agregando más items a la orden existente')
  console.log('📦 Datos a pasar:', orderData.value)
  console.log('📦 Cliente:', orderData.value.client)
  console.log('📦 Punto de venta:', orderData.value.pointsale)
  console.log('📦 Items:', orderData.value.items)
  
  // Guardar los datos en sessionStorage temporalmente
  const dataToSave = JSON.stringify(orderData.value)
  console.log('💾 Guardando en sessionStorage:', dataToSave.substring(0, 200) + '...')
  sessionStorage.setItem('existingOrder', dataToSave)
  
  // Verificar que se guardó correctamente
  const saved = sessionStorage.getItem('existingOrder')
  console.log('✅ Verificación - datos guardados:', saved ? 'SÍ' : 'NO')
  if (saved) {
    console.log('✅ Longitud de datos guardados:', saved.length)
  }
  
  // Navegar a SelectCategoryView para elegir la categoría primero
  console.log('🚀 Navegando a select-category para elegir categoría...')
  router.push({
    name: 'select-category',
    query: { addItems: 'true' }
  })
}

const formatPrice = (price: number): string => {
  return Number(price).toFixed(2)
}

const formatQuantity = (quantity: number): string => {
  return Number(quantity).toFixed(2)
}

const validateDate = () => {
  dateError.value = ''
  
  if (!selectedDeadline.value) {
    dateError.value = 'Por favor seleccione una fecha de entrega'
    return false
  }
  
  const selected = new Date(selectedDeadline.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const maxDateValue = new Date()
  maxDateValue.setDate(maxDateValue.getDate() + 30)
  maxDateValue.setHours(23, 59, 59, 999)
  
  if (selected < today) {
    dateError.value = 'La fecha de entrega debe ser igual o posterior a hoy'
    return false
  }
  
  if (selected > maxDateValue) {
    dateError.value = 'La fecha de entrega no puede ser mayor a 30 días desde hoy'
    return false
  }
  
  console.log('✅ Fecha válida:', selectedDeadline.value)
  return true
}

const confirmService = async () => {
  if (!orderData.value || confirming.value) return

  // Validar fecha antes de continuar
  if (!validateDate()) {
    alert('Por favor seleccione una fecha de entrega válida')
    return
  }

  confirming.value = true

  try {
    // Convertir la fecha seleccionada a ISO string
    const deadlineDate = new Date(selectedDeadline.value)
    deadlineDate.setHours(12, 0, 0, 0) // Establecer al mediodía para evitar problemas de zona horaria
    
    // Preparar los datos para crear la ServiceOrder
    const orderPayload = {
      userId: orderData.value.client.id,
      pointsaleId: orderData.value.pointsale.id,
      items: orderData.value.items.map(item => ({
        listserviceId: item.listserviceId,
        quantity: item.quantity,
        totalPrice: item.unitPrice,
        numberpieces: item.numberpieces,
        subtotal: item.subtotal || 0,
        discount: item.discount || 0,
        subtotalWithDiscount: item.subtotalWithDiscount || item.subtotal || 0,
        observations: item.observations || ''
      })),
      total: orderData.value.total,
      servicedeadline: deadlineDate.toISOString()
    }

    console.log('📤 Creando orden de servicio:', orderPayload)

    // Crear ServiceOrder y SalesOrder en el backend
    const { data } = await lavanderiaApi.post('/serviceorder', orderPayload)
    
    console.log('✅ Orden creada exitosamente:', data)

    // Limpiar sessionStorage después de crear exitosamente
    sessionStorage.removeItem('orderPreview')
    sessionStorage.removeItem('existingOrder')

    // Navegar a la vista de SalesOrder
    router.push({
      name: 'sales-order-detail',
      params: { id: data.salesOrder.id }
    })
  } catch (error: any) {
    console.error('❌ Error al confirmar servicio:', error)
    alert(error.response?.data?.message || 'Error al crear la orden de servicio')
    confirming.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Obtener los datos desde sessionStorage
  const orderPreviewJson = sessionStorage.getItem('orderPreview')
  
  console.log('📋 Leyendo desde sessionStorage...')
  
  if (orderPreviewJson) {
    orderData.value = JSON.parse(orderPreviewJson)
    console.log('✅ Datos de orden cargados:', orderData.value)
    console.log('📦 Total de items:', orderData.value?.items.length)
  } else {
    console.warn('⚠️ No se encontraron datos de orden en sessionStorage')
    alert('No se encontraron datos de la orden. Serás redirigido.')
    router.push({ name: 'create-service-order' })
  }
})
</script>

<style>
/* Estilos globales para sobrescribir el body solo en esta vista */
body:has(.order-preview-container) {
  display: block !important;
  place-items: unset !important;
  padding: 0 !important;
  margin: 0 !important;
}
</style>

<style scoped>
.order-preview-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 15px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  min-height: 100vh;
  box-sizing: border-box;
}

/* Cards Grid - Default (Mobile): No Grid */
.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* Header */
.header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header h1 {
  text-align: center;
  color: #333;
  font-size: 24px;
  margin: 0;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.btn-back:hover {
  background-color: #5a6268;
}

/* Cards */
.card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
  overflow: hidden;
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 12px 18px;
  color: white;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.card-body {
  padding: 15px;
}

/* Info Rows */
.info-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 15px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #666;
}

.value {
  color: #333;
}

/* Services List */
.services-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.service-item-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e0e0e0;
}

.service-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 2px solid #667eea;
}

.service-item-number {
  font-weight: 600;
  color: #667eea;
  font-size: 15px;
}

.service-item-subtotal {
  font-weight: 700;
  color: #667eea;
  font-size: 16px;
}

.service-item-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: start;
  padding: 4px 0;
}

.detail-label {
  font-weight: 600;
  color: #666;
  min-width: 100px;
  font-size: 14px;
}

.detail-value {
  color: #333;
  text-align: right;
  flex: 1;
  font-size: 14px;
}

.observations-row {
  background-color: #fff3cd;
  padding: 10px;
  border-radius: 6px;
  margin-top: 8px;
  flex-direction: column;
  align-items: flex-start;
}

.observations-row .detail-label {
  margin-bottom: 6px;
  color: #856404;
}

.observations-text {
  color: #333;
  font-style: italic;
  text-align: left !important;
  white-space: pre-wrap;
  word-wrap: break-word;
  width: 100%;
}

/* Discount Row Styles */
.discount-row {
  background-color: #fff3cd;
  padding: 8px;
  border-radius: 6px;
  margin-top: 8px;
}

.discount-value {
  color: #dc3545;
  font-weight: 600;
}

.subtotal-discount-row {
  background-color: #d4edda;
  padding: 8px;
  border-radius: 6px;
  margin-top: 8px;
  border-left: 3px solid #28a745;
}

.subtotal-discount-value {
  color: #28a745;
  font-weight: 700;
  font-size: 16px;
}

.service-item-subtotal.has-discount {
  color: #28a745;
  font-weight: 700;
}

/* Total Section */
.total-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 2px solid #e0e0e0;
}

.total-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.total-label {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.total-value {
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
}

/* Deadline */
.date-input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-input {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: white;
  color: #333;
  font-family: inherit;
  transition: border-color 0.3s;
}

.date-input:focus {
  outline: none;
  border-color: #667eea;
}

.date-input:hover {
  border-color: #667eea;
}

.date-info {
  font-size: 13px;
  color: #666;
  margin: 0;
  font-style: italic;
}

.error-message {
  font-size: 14px;
  color: #dc3545;
  margin: 0;
  font-weight: 500;
  padding: 8px 12px;
  background-color: #ffe5e5;
  border-left: 3px solid #dc3545;
  border-radius: 4px;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 2px solid #e0e0e0;
}

.btn-cancel,
.btn-add-more,
.btn-confirm {
  padding: 12px 30px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
}

.btn-cancel:hover:not(:disabled) {
  background-color: #5a6268;
}

.btn-add-more {
  background-color: #28a745;
  color: white;
}

.btn-add-more:hover:not(:disabled) {
  background-color: #218838;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-cancel:disabled,
.btn-add-more:disabled,
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-overlay p {
  color: white;
  font-size: 18px;
  margin-top: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .header h1 {
    font-size: 22px;
  }

  .btn-back {
    justify-content: center;
  }

  .info-row {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .table-header {
    display: none;
  }

  .table-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 10px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-confirm {
    width: 100%;
  }
}

/* Tablet y Desktop */
@media (min-width: 768px) {
  .order-preview-container {
    width: 100vw;
    max-width: 100vw;
    margin: 0;
    padding: 1.5rem;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .header {
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
  }

  .header h1 {
    font-size: 22px;
  }

  /* Grid de 2 columnas para organizar tarjetas */
  .cards-grid {
    display: grid !important;
    grid-template-columns: 360px 1fr;
    grid-template-rows: auto auto auto auto;
    gap: 1.25rem;
    align-items: start;
    width: 100%;
    max-width: 100%;
  }

  .client-card {
    grid-column: 1;
    grid-row: 1;
    margin-bottom: 0 !important;
  }

  .pointsale-card {
    grid-column: 1;
    grid-row: 2;
    margin-bottom: 0 !important;
  }

  .services-card {
    grid-column: 2;
    grid-row: 1 / span 4;
    margin-bottom: 0 !important;
    max-height: calc(100vh - 180px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .services-card .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .services-card .services-list {
    flex: 1;
  }

  .deadline-card {
    grid-column: 1;
    grid-row: 3;
    margin-bottom: 0 !important;
  }

  .action-buttons {
    grid-column: 1;
    grid-row: 4;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  .action-buttons .btn-cancel,
  .action-buttons .btn-add-more,
  .action-buttons .btn-confirm {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 14px;
  }

  .card {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 0 !important;
  }

  .card-body {
    padding: 1rem;
  }

  .card-header {
    padding: 0.875rem 1rem;
  }

  .card-header h2 {
    font-size: 17px;
  }

  .info-row {
    padding: 6px 0;
  }
}

@media (min-width: 1280px) {
  .order-preview-container {
    padding: 1.75rem 2rem;
  }

  .cards-grid {
    grid-template-columns: 400px 1fr;
    gap: 1.75rem;
  }

  .card-header h2 {
    font-size: 18px;
  }

  .card-body {
    padding: 1.25rem;
  }

  .action-buttons .btn-cancel,
  .action-buttons .btn-add-more,
  .action-buttons .btn-confirm {
    padding: 0.875rem 1rem;
    font-size: 15px;
  }
}

@media (min-width: 1600px) {
  .order-preview-container {
    padding: 2rem 3rem;
  }

  .cards-grid {
    grid-template-columns: 440px 1fr;
    gap: 2rem;
  }

  .card-header h2 {
    font-size: 19px;
  }

  .card-body {
    padding: 1.5rem;
  }
}
</style>
