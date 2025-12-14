<template>
  <div class="plans-validity-list-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Lista de Planes y Vigencias</h1>
    </header>

    <div class="content">
      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Estado:</label>
          <select v-model="filterEstado" class="filter-input">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="VENCIDO">Vencido</option>
            <option value="SUSPENDIDO">Suspendido</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Tipo de Plan:</label>
          <select v-model="filterTipo" class="filter-input">
            <option value="">Todos</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
            <option value="emprendedor">Emprendedor</option>
            <option value="sin_plan_tipo">Sin Plan</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Buscar negocio:</label>
          <input v-model="searchBusiness" type="text" class="filter-input" placeholder="Nombre del negocio">
        </div>
        <div v-if="authStore.user?.role === 'SUPERADMIN'" class="filter-group">
          <button class="btn-primary" @click="navigateToRegisterPayment">
            Registrar Pago
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && businessPlans.length === 0" class="loading-state">
        <p>Cargando planes...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredPlans.length === 0 && !loading" class="empty-state">
        <p v-if="businessPlans.length === 0">No se encontraron planes</p>
        <p v-else>No hay planes que coincidan con los filtros seleccionados</p>
        <p style="font-size: 12px; color: #999; margin-top: 8px;">
          Total de planes cargados: {{ businessPlans.length }} | 
          Planes filtrados: {{ filteredPlans.length }}
        </p>
      </div>

      <!-- Mobile: Cards View -->
      <div v-else class="cards-container">
        <div 
          v-for="businessPlan in filteredPlans" 
          :key="businessPlan.id" 
          class="plan-card"
          :class="getRowClass(businessPlan)"
        >
          <div class="card-header">
            <h3 class="card-business-name">{{ businessPlan.business.name }}</h3>
            <span class="status-badge" :class="getStatusClass(businessPlan.estado)">
              {{ businessPlan.estado }}
            </span>
          </div>
          <div class="card-body">
            <div class="card-row">
              <span class="card-label">Plan:</span>
              <span class="card-value">{{ businessPlan.plan.tipo }} - {{ businessPlan.plan.nombrePeriodo }}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Fecha Inicio:</span>
              <span class="card-value">{{ formatDate(businessPlan.fechaInicio) }}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Fecha Fin:</span>
              <span class="card-value">{{ formatDate(businessPlan.fechaFin) }}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Duración del Plan:</span>
              <span class="card-value">{{ businessPlan.plan?.diasPeriodo || 0 }} días</span>
            </div>
            <div class="card-row">
              <span class="card-label">Días Disponibles:</span>
              <span class="card-value" :class="getDaysRemainingClass(businessPlan.fechaFin, businessPlan.plan?.diasPeriodo || 0)">
                {{ getDaysRemaining(businessPlan.fechaFin, businessPlan.plan?.diasPeriodo || 0) }}
              </span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn-small" @click="viewDetails(businessPlan.business.id)">
              Ver
            </button>
            <button 
              v-if="authStore.user?.role === 'SUPERADMIN'"
              class="btn-small btn-primary" 
              @click="navigateToRegisterPayment(businessPlan.business.id)"
            >
              Pagar
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop: Table View -->
      <div v-if="!loading && filteredPlans.length > 0" class="table-container">
        <table class="plans-table">
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Fecha Inicio</th>
              <th>Fecha Fin</th>
              <th>Duración</th>
              <th>Días Disponibles</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="businessPlan in filteredPlans" :key="businessPlan.id" :class="getRowClass(businessPlan)">
              <td>{{ businessPlan.business.name }}</td>
              <td>{{ businessPlan.plan.tipo }} - {{ businessPlan.plan.nombrePeriodo }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(businessPlan.estado)">
                  {{ businessPlan.estado }}
                </span>
              </td>
              <td>{{ formatDate(businessPlan.fechaInicio) }}</td>
              <td>{{ formatDate(businessPlan.fechaFin) }}</td>
              <td>{{ businessPlan.plan?.diasPeriodo || 0 }} días</td>
              <td :class="getDaysRemainingClass(businessPlan.fechaFin, businessPlan.plan?.diasPeriodo || 0)">
                {{ getDaysRemaining(businessPlan.fechaFin, businessPlan.plan?.diasPeriodo || 0) }}
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn-small" @click="viewDetails(businessPlan.business.id)">
                    Ver
                  </button>
                  <button 
                    v-if="authStore.user?.role === 'SUPERADMIN'"
                    class="btn-small btn-primary" 
                    @click="navigateToRegisterPayment(businessPlan.business.id)"
                  >
                    Pagar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { getBusinessPlans, getBusinessData, getActiveBusinessPlan, type BusinessPlan } from '@/api/lavanderiaApi'

const router = useRouter()
const authStore = useAuthStore()

const businessPlans = ref<any[]>([])
const filterEstado = ref('')
const filterTipo = ref('')
const searchBusiness = ref('')
const loading = ref(false)
const userBusinessId = ref<number | null>(null)

const filteredPlans = computed(() => {
  let filtered = businessPlans.value

  console.log('🔍 Filtrando planes. Total antes de filtros:', filtered.length)

  // ADMIN solo ve su propio plan
  if (authStore.user?.role === 'ADMIN' && userBusinessId.value) {
    filtered = filtered.filter(p => p.business.id === userBusinessId.value)
    console.log('🔍 Después de filtrar por ADMIN:', filtered.length)
  }

  if (filterEstado.value) {
    filtered = filtered.filter(p => p.estado === filterEstado.value)
    console.log('🔍 Después de filtrar por estado:', filtered.length)
  }

  if (filterTipo.value) {
    filtered = filtered.filter(p => p.plan.tipo === filterTipo.value)
    console.log('🔍 Después de filtrar por tipo:', filtered.length)
  }

  if (searchBusiness.value) {
    const search = searchBusiness.value.toLowerCase()
    filtered = filtered.filter(p => p.business.name.toLowerCase().includes(search))
    console.log('🔍 Después de filtrar por búsqueda:', filtered.length)
  }

  console.log('✅ Planes filtrados finales:', filtered.length)
  return filtered
})

const goBack = () => {
  router.push({ name: 'plans-main' })
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  
  // Si viene como "YYYY-MM-DD", parsearlo directamente
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number)
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  }
  
  // Si viene como ISO string, usar métodos UTC
  const date = new Date(dateString)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

const getDaysRemaining = (fechaFin: string, diasPeriodo: number) => {
  if (!fechaFin) return 'N/A'
  
  // Obtener fecha de hoy en local (solo fecha, sin hora)
  const today = new Date()
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  // Parsear fecha de fin
  let endDate: Date
  if (typeof fechaFin === 'string' && fechaFin.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Si viene como "YYYY-MM-DD", parsearlo directamente
    const [year, month, day] = fechaFin.split('-').map(Number)
    endDate = new Date(year, month - 1, day)
  } else {
    // Si viene como ISO string, usar métodos UTC para extraer la fecha
    const date = new Date(fechaFin)
    endDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  }
  
  const diffTime = endDate.getTime() - todayLocal.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  // Calcular días disponibles: mínimo entre días hasta fecha fin y duración del plan
  const availableDays = Math.min(Math.max(0, diffDays), diasPeriodo)
  
  if (diffDays < 0) return 'Vencido'
  if (diffDays === 0) return `0 de ${diasPeriodo} días`
  if (availableDays <= 7) return `${availableDays} de ${diasPeriodo} días ⚠️`
  return `${availableDays} de ${diasPeriodo} días`
}

const getStatusClass = (estado: string) => {
  return {
    'status-active': estado === 'ACTIVO',
    'status-expired': estado === 'VENCIDO',
    'status-suspended': estado === 'SUSPENDIDO',
    'status-inactive': estado === 'INACTIVO'
  }
}

const getRowClass = (businessPlan: BusinessPlan) => {
  const days = getDaysRemaining(businessPlan.fechaFin, businessPlan.plan.diasPeriodo)
  if (days === 'Vencido') return 'row-expired'
  if (days.includes('⚠️')) return 'row-warning'
  return ''
}

const getDaysRemainingClass = (fechaFin: string, diasPeriodo: number) => {
  const days = getDaysRemaining(fechaFin, diasPeriodo)
  if (days === 'Vencido') return 'days-expired'
  if (days.includes('⚠️')) return 'days-warning'
  return ''
}

const viewDetails = (businessId: number) => {
  router.push(`/vigencia-planes/business/${businessId}`)
}

const navigateToRegisterPayment = (businessId?: number) => {
  const query = businessId ? { businessId: businessId.toString() } : {}
  router.push({ name: 'plans-register-payment', query })
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
    console.log('🔄 Cargando planes de negocios...', {
      role: authStore.user?.role,
      userBusinessId: userBusinessId.value
    })
    
    // Para ADMIN, cargar todos los planes de su negocio (igual que SUPERADMIN pero filtrado)
    if (authStore.user?.role === 'ADMIN' && userBusinessId.value) {
      try {
        console.log('📋 ADMIN: Cargando todos los planes para negocio:', userBusinessId.value)
        const data = await getBusinessPlans({ businesId: userBusinessId.value })
        console.log('✅ Datos recibidos del backend (ADMIN):', data)
        console.log('📊 Cantidad de planes recibidos:', Array.isArray(data) ? data.length : 'No es un array')
        
        if (Array.isArray(data)) {
          businessPlans.value = data.map((bp: any) => {
            console.log('🔍 Plan original del backend (ADMIN):', {
              id: bp.id,
              plan: bp.plan,
              planDiasPeriodo: bp.plan?.diasPeriodo,
              planTipo: bp.plan?.tipo,
              planNombrePeriodo: bp.plan?.nombrePeriodo
            })
            
            const mapped = {
              id: bp.id,
              business: {
                id: bp.business?.id || bp.businesId,
                name: bp.business?.name || 'Mi Negocio',
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
              estado: bp.estado
            }
            console.log('📝 Plan mapeado (ADMIN):', mapped)
            console.log('📊 diasPeriodo en plan mapeado (ADMIN):', mapped.plan.diasPeriodo)
            return mapped
          })
          console.log('✅ Total de planes mapeados (ADMIN):', businessPlans.value.length)
        } else {
          console.error('❌ Los datos recibidos no son un array:', typeof data, data)
          businessPlans.value = []
        }
      } catch (error: any) {
        console.error('❌ Error cargando planes de negocio:', error)
        console.error('Detalles del error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          stack: error.stack
        })
        alert(error.response?.data?.message || error.message || 'Error al cargar los planes')
        businessPlans.value = []
      }
    } else {
      // SUPERADMIN ve todos los planes
      console.log('📋 SUPERADMIN: Cargando todos los planes')
      const data = await getBusinessPlans()
      console.log('✅ Datos recibidos del backend:', data)
      console.log('📊 Cantidad de planes recibidos:', Array.isArray(data) ? data.length : 'No es un array')
      
      if (Array.isArray(data)) {
        businessPlans.value = data.map((bp: any) => {
          console.log('🔍 Plan original del backend:', {
            id: bp.id,
            plan: bp.plan,
            planDiasPeriodo: bp.plan?.diasPeriodo,
            planTipo: bp.plan?.tipo,
            planNombrePeriodo: bp.plan?.nombrePeriodo
          })
          
          const mapped = {
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
            estado: bp.estado
          }
          console.log('📝 Plan mapeado:', mapped)
          console.log('📊 diasPeriodo en plan mapeado:', mapped.plan.diasPeriodo)
          return mapped
        })
        console.log('✅ Total de planes mapeados:', businessPlans.value.length)
      } else {
        console.error('❌ Los datos recibidos no son un array:', typeof data, data)
        businessPlans.value = []
      }
    }
  } catch (error: any) {
    console.error('❌ Error cargando planes de negocios:', error)
    console.error('Detalles del error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    })
    alert(error.response?.data?.message || error.message || 'Error al cargar los planes')
    businessPlans.value = []
  } finally {
    loading.value = false
    console.log('🏁 Carga de planes finalizada. Total:', businessPlans.value.length)
  }
}

onMounted(async () => {
  await loadUserBusiness()
  await loadBusinessPlans()
})
</script>

<style scoped>
.plans-validity-list-container {
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

@media (min-width: 1024px) {
  .content {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    padding: 0;
  }
}

.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
  width: 100%;
  box-sizing: border-box;
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

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.plans-table {
  width: 100%;
  border-collapse: collapse;
}

.plans-table th {
  background-color: #f8f9fa;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e5e5e5;
}

.plans-table td {
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.plans-table tr:hover {
  background-color: #f8f9fa;
}

.plans-table tr.row-expired {
  background-color: #fee;
}

.plans-table tr.row-warning {
  background-color: #fff3cd;
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
  background-color: #9e9e9e;
  color: white;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-small {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-small {
  background-color: #6c757d;
  color: white;
}

.btn-small:hover {
  background-color: #5a6268;
}

.btn-small.btn-primary {
  background-color: #ff6b35;
  color: white;
}

.btn-small.btn-primary:hover {
  background-color: #e55a2b;
}

.btn-primary {
  padding: 10px 20px;
  background-color: #ff6b35;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  background-color: #e55a2b;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #666;
  background: white;
  border-radius: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
  background: white;
  border-radius: 12px;
}

/* Mobile: Cards View */
.cards-container {
  display: grid;
  gap: 16px;
  padding-bottom: 20px;
}

.plan-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
}

.plan-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.plan-card.row-expired {
  background-color: #fee;
  border-left: 4px solid #dc3545;
}

.plan-card.row-warning {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e5e5;
}

.card-business-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-label {
  font-weight: 500;
  color: #666;
  font-size: 14px;
}

.card-value {
  font-weight: 400;
  color: #333;
  font-size: 14px;
  text-align: right;
}

.card-value.days-expired {
  color: #dc3545;
  font-weight: 600;
}

.card-value.days-warning {
  color: #856404;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
}

/* Desktop: Hide cards, show table */
@media (min-width: 1024px) {
  .cards-container {
    display: none;
  }

  .table-container {
    display: block;
  }
}

/* Mobile: Hide table, show cards */
@media (max-width: 1023px) {
  .table-container {
    display: none;
  }

  .cards-container {
    display: grid;
  }
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .plans-validity-list-container {
    padding: 32px;
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
  .plans-validity-list-container {
    padding: 40px;
    width: 100%;
    max-width: 100%;
    margin: 0;
  }

  .content {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }

  .table-container {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
  }

  .plans-table {
    width: 100%;
    min-width: 1000px;
    table-layout: auto;
  }

  .filters-section {
    width: 100%;
    max-width: 100%;
  }
}

@media (min-width: 1280px) {
  .plans-validity-list-container {
    padding: 48px 60px;
    width: 100%;
    max-width: 100%;
    margin: 0;
  }

  .plans-table {
    min-width: 1200px;
  }
}

@media (min-width: 1536px) {
  .plans-validity-list-container {
    padding: 48px 80px;
    width: 100%;
    max-width: 100%;
    margin: 0;
  }

  .plans-table {
    min-width: 1400px;
  }
}
</style>

<style>
/* Override global body styles for full width on desktop */
body:has(.plans-validity-list-container) {
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

#app:has(.plans-validity-list-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.plans-validity-list-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* Asegurar que el contenedor principal use todo el ancho */
.plans-validity-list-container {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
</style>

