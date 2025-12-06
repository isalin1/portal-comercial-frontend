<template>
  <div class="dashboard-container">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="header-content">
        <button class="menu-button" @click="toggleMenu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div class="header-info">
          <h1 class="app-title">{{ headerTitle }}</h1>
          <span class="user-name">{{ userName }}</span>
        </div>
      </div>
    </header>

    <!-- Plan Expiration Banner -->
    <PlanExpirationBanner />

    <!-- Main Panel Button -->
    <div class="main-panel-section">
      <button class="main-panel-button" @click="goToAdminPanel">
        PANEL DE ADMINISTRACION EMPRESARIO
      </button>
    </div>

    <!-- Crear Orden de Servicio Button -->
    <div class="service-order-section">
      <button class="service-order-button" @click="navigateTo('/select-category')">
        <span>Crear Orden de Servicio</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9,18 15,12 9,6"></polyline>
        </svg>
      </button>
    </div>

    <!-- Menu Sections -->
    <div class="menu-sections">
      <!-- Configuración -->
      <div class="menu-section">
        <h2 class="section-title">Configuración</h2>
        <div class="menu-items">
          <!-- Mi Negocio: Solo para ADMIN y SUPERADMIN -->
          <button 
            v-if="authStore.user?.role === 'ADMIN' || authStore.user?.role === 'SUPERADMIN'"
            class="menu-item" 
            @click="navigateTo('/business-presentation')"
          >
            <span>Mi Negocio</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          
          <button class="menu-item" @click="navigateTo('/list-presentation')">
            <span>Nuestros Servicios</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateTo('/clients')">
            <span>Clientes</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateTo('/sales-orders')">
            <span>Órdenes de Venta</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          
          <!-- Autorizaciones: Solo para ADMIN y SUPERADMIN, y solo si el plan está activo -->
          <button 
            v-if="authStore.user?.role === 'ADMIN' || authStore.user?.role === 'SUPERADMIN'"
            class="menu-item" 
            :class="{ 'disabled': !isPlanActive }"
            :disabled="!isPlanActive"
            @click="handleNavigateToAuthorizations"
            :title="!isPlanActive ? 'El módulo de autorizaciones solo está disponible cuando el negocio tiene un plan activo' : ''"
          >
            <span>Autorizaciones</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          
          <!-- Personalizar Precios: Solo para ADMIN y SUPERADMIN -->
          <button 
            v-if="authStore.user?.role === 'ADMIN' || authStore.user?.role === 'SUPERADMIN'"
            class="menu-item" 
            @click="navigateTo('/personalize-prices')"
          >
            <span>Personalizar Precios</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          
          <!-- Vigencia de Planes: Solo para ADMIN y SUPERADMIN -->
          <button 
            v-if="authStore.user?.role === 'ADMIN' || authStore.user?.role === 'SUPERADMIN'"
            class="menu-item" 
            @click="handleNavigateToVigenciaPlanes"
          >
            <span>Vigencia de Planes</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          
          <!-- Mi Perfil: Disponible para todos los usuarios -->
          <button 
            class="menu-item" 
            @click="navigateTo('/my-profile')"
          >
            <span>Mi Perfil</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- Procesar mis Servicios -->
      <div class="menu-section">
        <h2 class="section-title">Procesar mis Servicios</h2>
        <div class="menu-items">
          <button class="menu-item" @click="navigateToOrdersWithStatus('RECEIVED')">
            <span>Recibidos</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateToOrdersWithStatus('IN_PROGRESS')">
            <span>Proceso</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateToOrdersWithStatus('READY')">
            <span>Listos para Entrega</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateToOrdersWithStatus('DELIVERED')">
            <span>Entregados</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateToOrdersWithStatus('ALL')">
            <span>Todos</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- Actividad por Día -->
      <div class="menu-section">
        <h2 class="section-title">Actividad por Día</h2>
        <div class="menu-items">
          <button class="menu-item" @click="navigateTo('/daily/sales')">
            <span>Ventas y Cobranzas</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateTo('/daily/expenses')">
            <span>Registro de Gastos</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateTo('/daily/cash-balance')">
            <span>Cuadre Caja Efectivo X Día</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- Inteligencia Comercial -->
      <div class="menu-section">
        <h2 class="section-title">Inteligencia Comercial</h2>
        <div class="menu-items">
          <button class="menu-item" @click="navigateTo('/analytics/client-ranking')">
            <span>Ranking de Clientes</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateTo('/analytics/month-sales')">
            <span>Ventas por Mes</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateTo('/analytics/stock-sales')">
            <span>Stock de Ventas y Cobranzas</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
          <button class="menu-item" @click="navigateTo('/analytics/service-ranking')">
            <span>Ranking de Servicios</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Logout Section -->
    <div class="logout-section">
      <button class="logout-button" @click="handleLogout">
        Cerrar Sesión
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { lavanderiaApi } from '@/api/lavanderiaApi'
import { getBusinessPlanStatus, getBusinessData } from '@/api/lavanderiaApi'
import PlanExpirationBanner from '@/components/PlanExpirationBanner.vue'

const router = useRouter()
const authStore = useAuthStore()

// Estado para información del negocio y punto de venta
const businessName = ref<string>('')
const pointSaleName = ref<string>('')
const loadingInfo = ref(false)

// Estado para el plan activo
const planStatus = ref<any>(null)
const userBusinessId = ref<number | null>(null)

const toggleMenu = () => {
  // Implementar lógica del menú hamburguesa si es necesario
  console.log('Toggle menu')
}

const goToAdminPanel = () => {
  // Navegar al panel de administración
  router.push({ name: 'dashboard' })
}

const navigateTo = (path: string) => {
  console.log('🔄 Navegando a:', path)
  router.push(path)
}

const handleNavigateToAuthorizations = () => {
  if (!isPlanActive.value) {
    alert('El módulo de autorizaciones solo está disponible cuando el negocio tiene un plan activo. Por favor, contacta al administrador para renovar tu plan.')
    return
  }
  navigateTo('/autorizacion-usuarios')
}

const handleNavigateToVigenciaPlanes = () => {
  // ADMIN va directamente al detalle de su plan
  if (authStore.user?.role === 'ADMIN' && userBusinessId.value) {
    navigateTo(`/vigencia-planes/business/${userBusinessId.value}`)
  } else {
    // SUPERADMIN va al menú principal
    navigateTo('/vigencia-planes')
  }
}

const navigateToOrdersWithStatus = (status: string) => {
  console.log('🔄 Navegando a órdenes de servicio con estado:', status)
  router.push({ path: '/orders-service-state', query: { status } })
}

const handleLogout = () => {
  authStore.logout()
  router.push({ name: 'login' })
}

// Computed para el título del header según el rol
const headerTitle = computed(() => {
  const role = authStore.user?.role
  
  if (role === 'SUPERADMIN') {
    return 'Sistema de Lavanderia'
  } else if (role === 'ADMIN') {
    return businessName.value || 'Mi Negocio'
  } else if (role === 'COLABORADOR') {
    if (businessName.value && pointSaleName.value) {
      return `${businessName.value} - ${pointSaleName.value}`
    } else if (businessName.value) {
      return businessName.value
    }
    return 'Mi Negocio'
  }
  
  return 'LAVANDERIA'
})

// Computed para el nombre del usuario
const userName = computed(() => {
  const user = authStore.user
  if (!user) return ''
  
  const firstName = user.firstname || ''
  const lastName = user.lastname || ''
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  } else if (firstName) {
    return firstName
  } else if (lastName) {
    return lastName
  }
  
  return user.email || ''
})

// Computed para verificar si el plan está activo
const isPlanActive = computed(() => {
  // SUPERADMIN siempre tiene acceso
  if (authStore.user?.role === 'SUPERADMIN') {
    return true
  }
  
  // Para ADMIN, verificar si tiene plan activo
  if (authStore.user?.role === 'ADMIN') {
    if (!planStatus.value) {
      return false
    }
    
    // El plan debe estar ACTIVO (no SUSPENDIDO ni VENCIDO) y no debe estar vencido
    const estado = planStatus.value.estado
    const isExpired = planStatus.value.isExpired
    
    return estado === 'ACTIVO' && !isExpired
  }
  
  // Para COLABORADOR, verificar el plan del negocio asociado
  if (authStore.user?.role === 'COLABORADOR') {
    if (!planStatus.value) {
      return false
    }
    
    const estado = planStatus.value.estado
    const isExpired = planStatus.value.isExpired
    
    return estado === 'ACTIVO' && !isExpired
  }
  
  return false
})

// Cargar estado del plan
const loadPlanStatus = async () => {
  const user = authStore.user
  if (!user) return
  
  // SUPERADMIN siempre tiene acceso, no necesita verificar plan
  if (user.role === 'SUPERADMIN') {
    planStatus.value = { estado: 'ACTIVO', isExpired: false }
    return
  }
  
  try {
    let businessId: number | null = null
    
    if (user.role === 'ADMIN') {
      // Obtener el businessId del usuario ADMIN
      const businesses = await getBusinessData()
      const userBusiness = businesses.find((b: any) => b.userId === user.id)
      if (userBusiness) {
        businessId = userBusiness.id
        userBusinessId.value = businessId
      }
    } else if (user.role === 'COLABORADOR') {
      // Obtener el businessId del punto de venta del COLABORADOR
      const { data: pointsales } = await lavanderiaApi.get('/pointsale')
      const userPointsale = pointsales.find((ps: any) => ps.userId === user.id)
      if (userPointsale?.businesId) {
        businessId = userPointsale.businesId
        userBusinessId.value = businessId
      }
    }
    
    if (businessId) {
      const status = await getBusinessPlanStatus(businessId)
      planStatus.value = status
    } else {
      planStatus.value = null
    }
  } catch (error: any) {
    // Si no tiene plan activo, retornar null
    if (error.response?.status === 404) {
      planStatus.value = null
    } else {
      console.error('Error cargando estado del plan:', error)
      planStatus.value = null
    }
  }
}

// Cargar información del negocio y punto de venta según el rol
const loadBusinessInfo = async () => {
  const user = authStore.user
  if (!user) return
  
  try {
    loadingInfo.value = true
    
    if (user.role === 'ADMIN') {
      // Para ADMIN, obtener el negocio asociado
      const { data } = await lavanderiaApi.get('/busines')
      const userBusiness = data.find((b: any) => b.userId === user.id)
      if (userBusiness) {
        businessName.value = userBusiness.name || ''
      }
    } else if (user.role === 'COLABORADOR') {
      // Para COLABORADOR, obtener el punto de venta y su negocio
      const { data: pointsales } = await lavanderiaApi.get('/pointsale')
      const userPointsale = pointsales.find((ps: any) => ps.userId === user.id)
      if (userPointsale) {
        pointSaleName.value = userPointsale.name || ''
        // Obtener el negocio del punto de venta
        if (userPointsale.businesId) {
          const { data: businesses } = await lavanderiaApi.get('/busines')
          const business = businesses.find((b: any) => b.id === userPointsale.businesId)
          if (business) {
            businessName.value = business.name || ''
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cargando información del negocio:', error)
  } finally {
    loadingInfo.value = false
  }
}

// Cargar información al montar el componente
onMounted(async () => {
  await loadBusinessInfo()
  await loadPlanStatus()
})
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.dashboard-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.menu-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #333;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.menu-button:hover {
  background-color: #f5f5f5;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  flex-wrap: wrap;
}

.app-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ff6b35;
  margin: 0;
  text-transform: none;
  letter-spacing: 0;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
  margin-left: auto;
}

@media (min-width: 768px) {
  .header-info {
    flex-wrap: nowrap;
  }
  
  .app-title {
    font-size: 1.75rem;
  }
  
  .user-name {
    font-size: 1rem;
    margin-left: 1rem;
  }
}

@media (min-width: 1024px) {
  .app-title {
    font-size: 2rem;
  }
  
  .user-name {
    font-size: 1.125rem;
  }
}

/* Main Panel Button */
.main-panel-section {
  padding: 1.5rem 1rem;
}

.main-panel-button {
  width: 100%;
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.main-panel-button:hover {
  background-color: #e55a2b;
  transform: translateY(-1px);
}

.main-panel-button:active {
  transform: translateY(0);
}

/* Service Order Button */
.service-order-section {
  padding: 0 1rem 1.5rem;
}

.service-order-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background-color: #f8f9fa;
  border: 2px solid #ff6b35;
  padding: 1.25rem 1.5rem;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.service-order-button:hover {
  background-color: #fff5f2;
  border-color: #e55a2b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
}

.service-order-button:active {
  transform: translateY(0);
}

.service-order-button span {
  font-size: 1.125rem;
  color: #ff6b35;
  font-weight: 600;
}

.service-order-button svg {
  color: #ff6b35;
  transition: transform 0.2s;
}

.service-order-button:hover svg {
  transform: translateX(4px);
}

/* Menu Sections */
.menu-sections {
  padding: 0 1rem 2rem;
}

.menu-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.menu-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f8f9fa;
  border: none;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.menu-item:hover {
  background-color: #e9ecef;
  transform: translateX(4px);
}

.menu-item span {
  font-size: 1rem;
  color: #333;
  font-weight: 500;
}

.menu-item svg {
  color: #6c757d;
  transition: color 0.2s;
}

.menu-item:hover svg {
  color: #ff6b35;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #e9ecef;
}

.menu-item.disabled:hover {
  background-color: #e9ecef;
  transform: none;
}

.menu-item.disabled svg {
  color: #adb5bd;
}

.menu-item.disabled:hover svg {
  color: #adb5bd;
}

/* Logout Section */
.logout-section {
  padding: 1rem;
  border-top: 1px solid #e5e5e5;
  margin-top: 2rem;
}

.logout-button {
  width: 100%;
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-button:hover {
  background-color: #c82333;
}

/* Responsive Design */
@media (min-width: 768px) {
  .dashboard-container {
    max-width: 100%;
    margin: 0 auto;
    padding: 0 2rem;
  }
  
  .main-panel-section {
    padding: 2rem 0;
  }
  
  .main-panel-button {
    max-width: 100%;
  }
  
  .menu-sections {
    padding: 0 0 2rem;
  }
  
  .menu-items {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  
  .menu-item {
    padding: 1.25rem;
  }
}

@media (min-width: 1024px) {
  .dashboard-container {
    padding: 0 4rem;
  }
  
  .menu-items {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
}

@media (min-width: 1280px) {
  .dashboard-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 4rem;
  }
  
  .menu-sections {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }
  
  .menu-section {
    margin-bottom: 0;
  }
}
</style>