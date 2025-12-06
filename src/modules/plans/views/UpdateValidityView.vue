<template>
  <div class="update-validity-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Actualización de Vigencias</h1>
    </header>

    <div class="content">
      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Filtrar por estado:</label>
          <select v-model="filterEstado" class="filter-input">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="VENCIDO">Vencido</option>
            <option value="SUSPENDIDO">Suspendido</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Buscar negocio:</label>
          <input v-model="searchBusiness" type="text" class="filter-input" placeholder="Nombre del negocio">
        </div>
      </div>

      <!-- Business Plans List -->
      <div class="plans-list">
        <div v-for="businessPlan in filteredPlans" :key="businessPlan.id" class="plan-card">
          <div class="plan-card-header">
            <div>
              <h3>{{ businessPlan.business.name }}</h3>
              <p class="plan-info">
                {{ businessPlan.plan.tipo }} - {{ businessPlan.plan.nombrePeriodo }}
              </p>
            </div>
            <span class="status-badge" :class="getStatusClass(businessPlan.estado)">
              {{ businessPlan.estado }}
            </span>
          </div>
          
          <div class="plan-card-body">
            <div class="plan-dates">
              <p><strong>Inicio:</strong> {{ formatDate(businessPlan.fechaInicio) }}</p>
              <p><strong>Fin:</strong> {{ formatDate(businessPlan.fechaFin) }}</p>
              <p><strong>Duración del Plan:</strong> {{ businessPlan.plan.diasPeriodo }} días</p>
              <p><strong>Días disponibles:</strong> {{ getDaysRemaining(businessPlan.fechaFin, businessPlan.plan.diasPeriodo) }}</p>
            </div>
            
            <div class="plan-actions">
              <button 
                v-if="authStore.user?.role === 'SUPERADMIN'"
                class="btn-action" 
                @click="openRenewModal(businessPlan)"
              >
                Renovar Plan
              </button>
              <button 
                v-if="authStore.user?.role === 'SUPERADMIN' && businessPlan.estado === 'ACTIVO'"
                class="btn-action btn-warning" 
                @click="suspendPlan(businessPlan.id)"
              >
                Suspender
              </button>
              <button 
                v-if="authStore.user?.role === 'SUPERADMIN' && businessPlan.estado === 'SUSPENDIDO'"
                class="btn-action btn-success" 
                @click="activatePlan(businessPlan.id)"
              >
                Reactivar
              </button>
              <button class="btn-action btn-secondary" @click="viewDetails(businessPlan.business.id)">
                Ver Detalles
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredPlans.length === 0" class="empty-state">
          <p>No se encontraron planes con los filtros seleccionados</p>
        </div>
      </div>
    </div>

    <!-- Renew Modal -->
    <div v-if="showRenewModal" class="modal-overlay" @click="showRenewModal = false">
      <div class="modal-content" @click.stop>
        <h2>Renovar Plan</h2>
        <div class="renew-info">
          <p>El plan se renovará automáticamente extendiendo la fecha de fin según los días del período del plan actual.</p>
          <p><strong>Plan actual:</strong> {{ selectedPlan?.plan.tipo }} - {{ selectedPlan?.plan.nombrePeriodo }}</p>
          <p><strong>Días del período:</strong> {{ selectedPlan?.plan.diasPeriodo }} días</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="showRenewModal = false">Cancelar</button>
          <button type="button" class="btn-primary" @click="handleRenew">Renovar Plan</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import {
  getBusinessPlans,
  renewBusinessPlan,
  suspendBusinessPlan,
  activateBusinessPlan,
  type BusinessPlan
} from '@/api/lavanderiaApi'

const router = useRouter()
const authStore = useAuthStore()

const businessPlans = ref<BusinessPlan[]>([])
const filterEstado = ref('')
const searchBusiness = ref('')
const showRenewModal = ref(false)
const selectedPlan = ref<any>(null)

const filteredPlans = computed(() => {
  let filtered = businessPlans.value

  if (filterEstado.value) {
    filtered = filtered.filter(p => p.estado === filterEstado.value)
  }

  if (searchBusiness.value) {
    const search = searchBusiness.value.toLowerCase()
    filtered = filtered.filter(p => p.business.name.toLowerCase().includes(search))
  }

  return filtered
})

const goBack = () => {
  router.push({ name: 'plans-main' })
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
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
  return `${availableDays} de ${diasPeriodo} días`
}

const getStatusClass = (estado: string) => {
  return {
    'status-active': estado === 'ACTIVO',
    'status-expired': estado === 'VENCIDO',
    'status-suspended': estado === 'SUSPENDIDO'
  }
}

const openRenewModal = (plan: any) => {
  selectedPlan.value = plan
  showRenewModal.value = true
}

const handleRenew = async () => {
  if (!selectedPlan.value) return

  try {
    await renewBusinessPlan(selectedPlan.value.id)
    
    alert('Plan renovado exitosamente')
    showRenewModal.value = false
    selectedPlan.value = null
    await loadBusinessPlans()
  } catch (error: any) {
    console.error('Error renovando plan:', error)
    alert(error.response?.data?.message || 'Error al renovar el plan')
  }
}

const suspendPlan = async (planId: number) => {
  if (!confirm('¿Estás seguro de suspender este plan?')) return

  try {
    await suspendBusinessPlan(planId)
    alert('Plan suspendido exitosamente')
    await loadBusinessPlans()
  } catch (error: any) {
    console.error('Error suspendiendo plan:', error)
    alert(error.response?.data?.message || 'Error al suspender el plan')
  }
}

const activatePlan = async (planId: number) => {
  try {
    await activateBusinessPlan(planId)
    alert('Plan reactivado exitosamente')
    await loadBusinessPlans()
  } catch (error: any) {
    console.error('Error reactivando plan:', error)
    alert(error.response?.data?.message || 'Error al reactivar el plan')
  }
}

const viewDetails = (businessId: number) => {
  router.push(`/vigencia-planes/business/${businessId}`)
}

const loadBusinessPlans = async () => {
  try {
    const data = await getBusinessPlans()
    businessPlans.value = data.map((bp: any) => ({
      id: bp.id,
      business: {
        id: bp.business?.id || bp.businesId,
        name: bp.business?.name || 'Negocio desconocido'
      },
      plan: {
        tipo: bp.plan?.tipo || '',
        nombrePeriodo: bp.plan?.nombrePeriodo || '',
        diasPeriodo: bp.plan?.diasPeriodo || 0
      },
      fechaInicio: bp.fechaInicio,
      fechaFin: bp.fechaFin,
      estado: bp.estado
    }))
  } catch (error: any) {
    console.error('Error cargando planes de negocios:', error)
    alert(error.response?.data?.message || 'Error al cargar los planes')
  }
}

onMounted(() => {
  loadBusinessPlans()
})
</script>

<style scoped>
.update-validity-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0;
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
  box-sizing: border-box;
}

.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 500;
  color: #333;
}

.filter-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-width: 200px;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.plan-card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.plan-card-header h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.plan-info {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
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

.plan-dates {
  margin-bottom: 16px;
}

.plan-dates p {
  margin: 8px 0;
  color: #666;
}

.plan-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-action {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-action {
  background-color: #ff6b35;
  color: white;
}

.btn-action:hover {
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

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

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
}

.modal-content {
  background: white;
  padding: 32px;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
}

.renew-info {
  margin-bottom: 24px;
}

.renew-info p {
  margin: 8px 0;
  color: #666;
  line-height: 1.5;
}

.modal-content h2 {
  margin: 0 0 24px 0;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-primary {
  padding: 10px 20px;
  background-color: #ff6b35;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover {
  background-color: #e55a2b;
}

@media (min-width: 768px) {
  .update-validity-container {
    padding: 32px;
    width: 100%;
    max-width: 100%;
  }

  .content {
    width: 100%;
    max-width: 100%;
  }

  .filters-section {
    flex-wrap: nowrap;
  }

  .filter-group {
    flex: 1;
  }
}

@media (min-width: 1024px) {
  .update-validity-container {
    padding: 40px;
    width: 100%;
    max-width: 100%;
  }

  .content {
    width: 100%;
    max-width: 100%;
  }

  .plans-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
    gap: 24px;
  }

  .plan-card {
    padding: 28px;
  }
}

@media (min-width: 1280px) {
  .update-validity-container {
    padding: 48px 60px;
    width: 100%;
    max-width: 100%;
  }

  .plans-list {
    grid-template-columns: repeat(auto-fill, minmax(600px, 1fr));
  }
}

@media (min-width: 1536px) {
  .update-validity-container {
    padding: 48px 80px;
    width: 100%;
    max-width: 100%;
  }

  .plans-list {
    grid-template-columns: repeat(auto-fill, minmax(700px, 1fr));
  }
}
</style>

<style>
/* Override global body styles for full width on desktop */
body:has(.update-validity-container) {
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

#app:has(.update-validity-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}

router-view:has(.update-validity-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}

/* Asegurar que el contenedor principal use todo el ancho sin scroll horizontal */
.update-validity-container {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}
</style>

