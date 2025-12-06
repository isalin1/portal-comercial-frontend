<template>
  <div class="business-plan-detail-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Detalle del Plan</h1>
    </header>

    <div v-if="loading" class="loading-state">
      <p>Cargando información del plan...</p>
    </div>

    <div v-else-if="allBusinessPlans.length > 0" class="content">
      <!-- Plan Selector -->
      <div v-if="allBusinessPlans.length > 1" class="plan-selector-card">
        <label for="plan-select">Seleccionar Plan:</label>
        <select 
          id="plan-select" 
          v-model="selectedPlanId" 
          class="plan-select"
        >
          <option 
            v-for="plan in allBusinessPlans" 
            :key="plan.id" 
            :value="plan.id"
          >
            {{ plan.plan.tipo }} - {{ plan.plan.nombrePeriodo }} 
            ({{ formatDate(plan.fechaInicio) }} - {{ formatDate(plan.fechaFin) }}) 
            - {{ plan.estado }}
          </option>
        </select>
      </div>

      <!-- Plan Information Card -->
      <div v-if="businessPlan && businessPlan.id" class="info-card">
        <h2>Información del Plan</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Negocio:</label>
            <span>{{ businessPlan.business.name }}</span>
          </div>
          <div class="info-item">
            <label>Estado del Negocio:</label>
            <span :class="businessPlan.business.isActive ? 'status-active' : 'status-inactive'">
              {{ businessPlan.business.isActive ? 'ACTIVO' : 'INACTIVO' }}
            </span>
          </div>
          <div class="info-item">
            <label>Tipo de Plan:</label>
            <span>{{ businessPlan.plan.tipo }}</span>
          </div>
          <div class="info-item">
            <label>Período:</label>
            <span>{{ businessPlan.plan.nombrePeriodo }}</span>
          </div>
          <div class="info-item">
            <label>Días del Período:</label>
            <span>{{ businessPlan.plan.diasPeriodo }} días</span>
          </div>
          <div class="info-item">
            <label>Estado del Plan:</label>
            <span class="status-badge" :class="getStatusClass(businessPlan.estado)">
              {{ businessPlan.estado }}
            </span>
          </div>
          <div class="info-item">
            <label>Fecha de Inicio:</label>
            <span>{{ formatDate(businessPlan.fechaInicio) }}</span>
          </div>
          <div class="info-item">
            <label>Fecha de Fin:</label>
            <span>{{ formatDate(businessPlan.fechaFin) }}</span>
          </div>
          <div class="info-item">
            <label>Días Disponibles:</label>
            <span :class="getDaysRemainingClass(businessPlan.fechaFin, businessPlan.plan.diasPeriodo)">
              {{ getDaysRemaining(businessPlan.fechaFin, businessPlan.plan.diasPeriodo) }}
            </span>
          </div>
          <div v-if="businessPlan.fechaPago" class="info-item">
            <label>Última Fecha de Pago:</label>
            <span>{{ formatDate(businessPlan.fechaPago) }}</span>
          </div>
        </div>
      </div>

      <!-- Actions (SUPERADMIN only) -->
      <div v-if="authStore.user?.role === 'SUPERADMIN'" class="actions-card">
        <h2>Acciones</h2>
        <div class="actions-grid">
          <button class="btn-action btn-primary" @click="navigateToRegisterPayment">
            Registrar Nuevo Pago
          </button>
          <button 
            v-if="businessPlan.estado === 'ACTIVO'"
            class="btn-action btn-warning" 
            @click="suspendPlan"
          >
            Suspender Plan
          </button>
          <button 
            v-if="businessPlan.estado === 'SUSPENDIDO'"
            class="btn-action btn-success" 
            @click="activatePlan"
          >
            Reactivar Plan
          </button>
        </div>
      </div>

      <!-- Alert for ADMIN -->
      <div v-if="authStore.user?.role === 'ADMIN' && businessPlan.estado === 'SUSPENDIDO'" class="alert-card alert-danger">
        <h3>⛔ Plan Suspendido</h3>
        <p>
          Tu plan está actualmente suspendido. Los usuarios del negocio han sido desactivados. 
          Contacta al administrador para reactivar tu plan.
        </p>
      </div>
      <div v-else-if="authStore.user?.role === 'ADMIN' && isPlanExpiringOrExpired" class="alert-card alert-warning">
        <h3>⚠️ Atención</h3>
        <p v-if="isPlanExpired">
          Tu plan ha vencido. Por favor contacta al administrador para renovar tu plan.
        </p>
        <p v-else>
          Tu plan está próximo a vencer. Contacta al administrador para renovar antes de que expire.
        </p>
      </div>

      <!-- Payment History -->
      <div class="payments-card">
        <h2>Historial de Pagos</h2>
        <div v-if="payments.length > 0" class="payments-table">
          <table>
            <thead>
              <tr>
                <th>Fecha de Pago</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in payments" :key="payment.id">
                <td>{{ formatDate(payment.fechaPago) }}</td>
                <td>S/ {{ payment.monto.toFixed(2) }}</td>
                <td>{{ payment.metodoPago || 'N/A' }}</td>
                <td>
                  <span class="status-badge" :class="getPaymentStatusClass(payment.estado)">
                    {{ payment.estado }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <p>No hay pagos registrados</p>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="no-plan-state">
      <div class="no-plan-card">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h2>No hay plan activo</h2>
        <p v-if="authStore.user?.role === 'ADMIN'">
          Tu negocio no tiene un plan activo. Contacta al administrador para activar tu plan.
        </p>
        <p v-else>
          Este negocio no tiene un plan activo asignado.
        </p>
        <button v-if="authStore.user?.role === 'SUPERADMIN'" class="btn-primary" @click="navigateToRegisterPayment">
          Registrar Pago para Activar Plan
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import {
  getActiveBusinessPlan,
  getBusinessPlans,
  getPlanPayments,
  suspendBusinessPlan,
  activateBusinessPlan,
  getBusinessData,
  type BusinessPlan,
  type PlanPayment
} from '@/api/lavanderiaApi'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const businessPlan = ref<any>(null)
const allBusinessPlans = ref<any[]>([])
const selectedPlanId = ref<number | null>(null)
const payments = ref<PlanPayment[]>([])
const loading = ref(true)
const userBusinessId = ref<number | null>(null)

const businessId = computed(() => {
  if (authStore.user?.role === 'ADMIN') {
    return userBusinessId.value || parseInt(route.params.businessId as string)
  }
  return parseInt(route.params.businessId as string)
})

const isPlanExpired = computed(() => {
  if (!businessPlan.value) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(businessPlan.value.fechaFin)
  endDate.setHours(0, 0, 0, 0)
  return endDate < today
})

const isPlanExpiringOrExpired = computed(() => {
  if (!businessPlan.value) return false
  const days = getDaysRemaining(businessPlan.value.fechaFin, businessPlan.value.plan.diasPeriodo)
  return days === 'Vencido' || days.includes('⚠️')
})

const goBack = () => {
  router.push({ name: 'plans-main' })
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const getDaysRemaining = (fechaFin: string, diasPeriodo: number) => {
  if (!fechaFin) return 'N/A'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(fechaFin)
  endDate.setHours(0, 0, 0, 0)
  const diffTime = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  // Calcular días disponibles: mínimo entre días hasta fecha fin y duración del plan
  const availableDays = Math.min(Math.max(0, diffDays), diasPeriodo)
  
  if (diffDays < 0) return 'Vencido'
  if (diffDays === 0) return `0 de ${diasPeriodo} días`
  if (availableDays <= 7) return `${availableDays} de ${diasPeriodo} días ⚠️`
  return `${availableDays} de ${diasPeriodo} días`
}

const getDaysRemainingClass = (fechaFin: string, diasPeriodo: number) => {
  const days = getDaysRemaining(fechaFin, diasPeriodo)
  if (days === 'Vencido') return 'text-danger'
  if (days.includes('⚠️')) return 'text-warning'
  return 'text-success'
}

const getStatusClass = (estado: string) => {
  return {
    'status-active': estado === 'ACTIVO',
    'status-expired': estado === 'VENCIDO',
    'status-suspended': estado === 'SUSPENDIDO'
  }
}

const getPaymentStatusClass = (estado: string) => {
  return {
    'status-active': estado === 'APROBADO',
    'status-expired': estado === 'RECHAZADO',
    'status-suspended': estado === 'PENDIENTE'
  }
}

const navigateToRegisterPayment = () => {
  router.push({ 
    name: 'plans-register-payment', 
    query: { businessId: businessId.value.toString() } 
  })
}

const suspendPlan = async () => {
  if (!confirm('¿Estás seguro de suspender este plan?')) return

  try {
    if (!businessPlan.value) return
    await suspendBusinessPlan(businessPlan.value.id)
    alert('Plan suspendido exitosamente')
    await loadBusinessPlan()
  } catch (error: any) {
    console.error('Error suspendiendo plan:', error)
    alert(error.response?.data?.message || 'Error al suspender el plan')
  }
}

const activatePlan = async () => {
  try {
    if (!businessPlan.value) return
    await activateBusinessPlan(businessPlan.value.id)
    alert('Plan reactivado exitosamente')
    await loadBusinessPlan()
  } catch (error: any) {
    console.error('Error reactivando plan:', error)
    alert(error.response?.data?.message || 'Error al reactivar el plan')
  }
}

const viewReceipt = (comprobante: string) => {
  if (comprobante.startsWith('http')) {
    window.open(comprobante, '_blank')
  } else {
    alert(`Comprobante: ${comprobante}`)
  }
}

const loadUserBusiness = async () => {
  if (authStore.user?.role === 'ADMIN') {
    try {
      const businesses = await getBusinessData()
      const userBusiness = businesses.find((b: any) => b.userId === authStore.user?.id)
      if (userBusiness) {
        userBusinessId.value = userBusiness.id
      }
    } catch (error) {
      console.error('Error cargando negocio del usuario:', error)
    }
  }
}

const loadBusinessPlans = async () => {
  try {
    loading.value = true
    
    // Validar que ADMIN solo pueda ver su propio plan
    if (authStore.user?.role === 'ADMIN') {
      if (userBusinessId.value && businessId.value !== userBusinessId.value) {
        alert('No tienes permiso para ver este plan')
        router.push({ name: 'plans-main' })
        return
      }
    }
    
    // Cargar todos los planes del negocio
    const plansData = await getBusinessPlans({ businesId: businessId.value })
    
    if (Array.isArray(plansData) && plansData.length > 0) {
      allBusinessPlans.value = plansData.map((bp: any) => ({
        id: bp.id,
        business: {
          id: bp.business?.id || bp.businesId,
          name: bp.business?.name || 'Negocio desconocido',
          isActive: bp.business?.isActive || false
        },
        plan: {
          id: bp.plan?.id,
          tipo: bp.plan?.tipo || '',
          nombrePeriodo: bp.plan?.nombrePeriodo || '',
          diasPeriodo: bp.plan?.diasPeriodo || 0
        },
        fechaInicio: bp.fechaInicio,
        fechaFin: bp.fechaFin,
        fechaPago: bp.fechaPago,
        estado: bp.estado
      }))
      
      // Seleccionar el plan activo por defecto, o el primero si no hay activo
      const activePlan = allBusinessPlans.value.find(p => p.estado === 'ACTIVO')
      selectedPlanId.value = activePlan ? activePlan.id : allBusinessPlans.value[0].id
      
      // Cargar el plan seleccionado
      await loadSelectedPlan()
    } else {
      allBusinessPlans.value = []
      businessPlan.value = null
      payments.value = []
    }
  } catch (error: any) {
    console.error('Error cargando planes:', error)
    if (error.response?.status === 404) {
      allBusinessPlans.value = []
      businessPlan.value = null
      payments.value = []
    } else {
      alert(error.response?.data?.message || 'Error al cargar la información de los planes')
      allBusinessPlans.value = []
      businessPlan.value = null
      payments.value = []
    }
  } finally {
    loading.value = false
  }
}

const loadSelectedPlan = async () => {
  if (!selectedPlanId.value) return
  
  const selected = allBusinessPlans.value.find(p => p.id === selectedPlanId.value)
  if (selected) {
    businessPlan.value = selected
    
    // Cargar pagos del negocio (todos los pagos, no solo del plan específico)
    try {
      const paymentsData = await getPlanPayments({ businesId: businessId.value })
      payments.value = paymentsData.map((p: any) => ({
        id: p.id,
        fechaPago: p.fechaPago,
        monto: parseFloat(p.monto),
        metodoPago: p.metodoPago,
        estado: p.estado,
        comprobante: p.comprobante
      }))
    } catch (error) {
      console.error('Error cargando pagos:', error)
      payments.value = []
    }
  }
}

watch(selectedPlanId, () => {
  loadSelectedPlan()
})

onMounted(async () => {
  await loadUserBusiness()
  await loadBusinessPlans()
})
</script>

<style scoped>
.business-plan-detail-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 16px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #f0f0f0;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.content {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-sizing: border-box;
}

.info-card, .actions-card, .payments-card, .alert-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.info-card h2, .actions-card h2, .payments-card h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-weight: 500;
  color: #666;
  font-size: 14px;
}

.info-item span {
  color: #333;
  font-size: 16px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-expired {
  background-color: #f8d7da;
  color: #721c24;
}

.status-suspended {
  background-color: #fff3cd;
  color: #856404;
}

.status-inactive {
  color: #dc3545;
  font-weight: 600;
}

.text-danger {
  color: #dc3545;
  font-weight: 600;
}

.text-warning {
  color: #ffc107;
  font-weight: 600;
}

.text-success {
  color: #28a745;
  font-weight: 600;
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.btn-action {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.btn-primary {
  background-color: #ff6b35;
  color: white;
}

.btn-primary:hover {
  background-color: #e55a2b;
}

.btn-warning {
  background-color: #ffc107;
  color: #333;
}

.btn-warning:hover {
  background-color: #e0a800;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover {
  background-color: #218838;
}

.alert-card {
  border-left: 4px solid #ffc107;
}

.alert-card.alert-danger {
  border-left-color: #dc3545;
  background-color: #f8d7da;
}

.alert-card.alert-danger h3 {
  margin: 0 0 12px 0;
  color: #721c24;
}

.alert-card.alert-danger p {
  margin: 0;
  color: #721c24;
}

.alert-card h3 {
  margin: 0 0 12px 0;
  color: #856404;
}

.alert-card p {
  margin: 0;
  color: #856404;
}

.payments-table {
  overflow-x: visible;
  width: 100%;
}

.payments-table table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.payments-table th {
  background-color: #f8f9fa;
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e5e5e5;
  font-size: 13px;
}

.payments-table th:nth-child(1) {
  width: 20%;
}

.payments-table th:nth-child(2) {
  width: 20%;
}

.payments-table th:nth-child(3) {
  width: 30%;
}

.payments-table th:nth-child(4) {
  width: 30%;
}

.payments-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #e5e5e5;
  font-size: 13px;
  word-break: break-word;
}

.btn-link {
  background: none;
  border: none;
  color: #ff6b35;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
}

.btn-link:hover {
  color: #e55a2b;
}

.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.no-plan-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.no-plan-card {
  background: white;
  border-radius: 12px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 500px;
}

.no-plan-card svg {
  color: #ff6b35;
  margin-bottom: 24px;
}

.no-plan-card h2 {
  margin: 0 0 16px 0;
  color: #333;
}

.no-plan-card p {
  margin: 8px 0 24px 0;
  color: #666;
  line-height: 1.5;
}

@media (min-width: 768px) {
  .business-plan-detail-container {
    padding: 24px;
    width: 100%;
    max-width: 100%;
  }

  .content {
    width: 100%;
    max-width: 100%;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .actions-grid {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .btn-action {
    width: auto;
    flex: 1;
    min-width: 200px;
  }

  .info-card, .actions-card, .payments-card, .alert-card {
    padding: 24px;
  }

  .payments-table th,
  .payments-table td {
    padding: 12px;
    font-size: 14px;
  }
}

@media (min-width: 1024px) {
  .business-plan-detail-container {
    padding: 40px;
    width: 100%;
    max-width: 100%;
  }

  .content {
    width: 100%;
    max-width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
  }

  .plan-selector-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.plan-selector-card label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
  font-size: 1rem;
}

.plan-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
  color: #333;
  cursor: pointer;
  transition: border-color 0.2s;
}

.plan-select:hover {
  border-color: #ff6b35;
}

.plan-select:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.info-card {
    grid-column: 1 / -1;
  }

  .actions-card {
    grid-column: 1;
  }

  .alert-card {
    grid-column: 2;
  }

  .payments-card {
    grid-column: 1 / -1;
  }

  .info-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .business-plan-detail-container {
    padding: 48px 60px;
  }

  .info-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1536px) {
  .business-plan-detail-container {
    padding: 48px 80px;
  }
}
</style>

<style>
/* Override global body styles for full width on desktop */
body:has(.business-plan-detail-container) {
  display: block !important;
  place-items: unset !important;
  align-items: unset !important;
  justify-content: unset !important;
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}

#app:has(.business-plan-detail-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}

router-view:has(.business-plan-detail-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}

/* Asegurar que el contenedor principal use todo el ancho sin scroll horizontal */
.business-plan-detail-container {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}
</style>

