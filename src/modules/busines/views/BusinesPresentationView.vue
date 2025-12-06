<template>
  <div class="busines-presentation-container">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" @click="goBack" aria-label="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#333" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Datos Empresa y Punto de Venta</h1>
      <button
        @click="loadData"
        class="reload-btn"
        :disabled="loading"
        title="Recargar datos"
      >
        {{ loading ? '🔄' : '🔄' }}
      </button>
    </header>

    <!-- Contenido principal -->
    <div class="content">

      <!-- Para SUPERADMIN: mostrar todos los negocios -->
      <template v-if="authStore.user?.role === 'SUPERADMIN' && Array.isArray(businessData)">
        <div v-for="business in businessData" :key="business.id" class="business-section">
          <!-- Información del Negocio -->
          <section class="info-section">
            <div class="section-header">
              <h2 class="section-title">{{ business.name }}</h2>
              <button class="edit-btn" @click="editSpecificBusiness(business)">
                Editar
              </button>
            </div>

            <div class="info-box">
              <div class="info-content">
                <div class="info-item">
                  <span class="label">RUC:</span>
                  <span class="value">{{ business.numdoc }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Nombre Comercial:</span>
                  <span class="value">{{ business.comercialname }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Administrador:</span>
                  <span class="value">{{ business.user ? `${business.user.firstname} ${business.user.lastname}` : 'No especificado' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Teléfono:</span>
                  <span class="value">{{ business.user?.phone || 'No especificado' }}</span>
                </div>
              </div>
              <div class="info-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#ff7a2f" stroke-width="2" fill="none"/>
                  <polyline points="9,22 9,12 15,12 15,22" stroke="#ff7a2f" stroke-width="2" fill="none"/>
                </svg>
              </div>
            </div>
          </section>

          <!-- Puntos de Venta de este negocio -->
          <section class="info-section">
            <div class="section-header">
              <h3 class="section-subtitle">Puntos de Venta</h3>
            </div>

            <div v-if="getPointSalesByBusinessId(business.id).length > 0" class="pointsales-container">
              <div
                v-for="(pointSale, index) in getPointSalesByBusinessId(business.id)"
                :key="pointSale.id"
                class="info-box pointsale-item"
              >
                <div class="info-content">
                  <div class="pointsale-header">
                    <div class="pointsale-title-section">
                      <h3 class="pointsale-title">{{ pointSale.name || 'Punto de Venta' }}</h3>
                      <span class="pointsale-number">#{{ index + 1 }}</span>
                    </div>
                  </div>
                  <div class="info-item">
                    <span class="label">Ubicación:</span>
                    <span class="value">{{ formatLocation(pointSale) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Dirección:</span>
                    <span class="value">{{ pointSale.address || 'No especificada' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Administrador:</span>
                    <span class="value">{{ getCollaboratorName(pointSale) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Teléfono:</span>
                    <span class="value">{{ getCollaboratorPhone(pointSale) }}</span>
                  </div>
                </div>
                <div class="info-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#ff7a2f" stroke-width="2" fill="none"/>
                    <circle cx="12" cy="10" r="3" stroke="#ff7a2f" stroke-width="2" fill="none"/>
                  </svg>
                </div>
              </div>
            </div>

            <div v-else class="no-data-message-small">
              <p>Sin puntos de venta</p>
            </div>
          </section>
        </div>
      </template>

      <!-- Para ADMIN y COLABORADOR: mostrar su negocio -->
      <template v-else>
        <!-- Información General -->
        <section class="info-section">
          <div class="section-header">
            <h2 class="section-title">Datos de Empresa</h2>
            <button v-if="authStore.user?.role === 'ADMIN'" class="edit-btn" @click="editGeneralInfo">
              Editar
            </button>
          </div>

          <div v-if="businessData && !Array.isArray(businessData)" class="info-box">
            <div class="info-content">
              <div class="info-item">
                <span class="label">Empresa:</span>
                <span class="value">{{ businessData.name }}</span>
              </div>
              <div class="info-item">
                <span class="label">RUC:</span>
                <span class="value">{{ businessData.numdoc }}</span>
              </div>
              <div class="info-item">
                <span class="label">Nombre Comercial:</span>
                <span class="value">{{ businessData.comercialname }}</span>
              </div>
              <div class="info-item">
                <span class="label">Contacto:</span>
                <span class="value">{{ getUserContactName() }}</span>
              </div>
              <div class="info-item">
                <span class="label">Teléfono:</span>
                <span class="value">{{ getUserPhone() }}</span>
              </div>
            </div>
            <div class="info-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#ff7a2f" stroke-width="2" fill="none"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="#ff7a2f" stroke-width="2" fill="none"/>
              </svg>
            </div>
          </div>

          <div v-else class="no-data-message">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="#ccc" stroke-width="2"/>
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="#ccc" stroke-width="2" fill="none"/>
            </svg>
            <p>Sin datos que mostrar</p>
          </div>
        </section>

        <!-- Datos Punto de Venta -->
        <section class="info-section">
          <div class="section-header">
            <h2 class="section-title">Datos de Puntos de Venta</h2>
            <button v-if="authStore.user?.role === 'ADMIN'" class="add-pointsale-btn" @click="editPointSaleInfo">
              + Agregar Punto de Venta
            </button>
          </div>

          <div v-if="pointSalesData.length > 0" class="pointsales-container">
            <div
              v-for="(pointSale, index) in pointSalesData"
              :key="pointSale.id || index"
              class="info-box pointsale-item"
            >
              <div class="info-content">
                <div class="pointsale-header">
                  <div class="pointsale-title-section">
                    <h3 class="pointsale-title">{{ pointSale.name || 'Punto de Venta' }}</h3>
                    <span class="pointsale-number">#{{ index + 1 }}</span>
                  </div>
                  <button v-if="authStore.user?.role === 'ADMIN'" class="edit-pointsale-btn" @click="editPointSale(pointSale)">
                    Editar
                  </button>
                </div>
                <div class="info-item">
                  <span class="label">Ubicación:</span>
                  <span class="value">{{ formatLocation(pointSale) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Dirección:</span>
                  <span class="value">{{ pointSale.address || 'No especificada' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Pagos:</span>
                  <span class="value">{{ pointSale.phonenumber || 'No especificado' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Administrador:</span>
                  <span class="value">{{ getCollaboratorName(pointSale) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Teléfono:</span>
                  <span class="value">{{ getCollaboratorPhone(pointSale) }}</span>
                </div>
              </div>
              <div class="info-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#ff7a2f" stroke-width="2" fill="none"/>
                  <circle cx="12" cy="10" r="3" stroke="#ff7a2f" stroke-width="2" fill="none"/>
                </svg>
              </div>
            </div>
          </div>

          <div v-else class="no-data-message">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="#ccc" stroke-width="2"/>
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="#ccc" stroke-width="2" fill="none"/>
            </svg>
            <p>Sin datos que mostrar</p>
          </div>
        </section>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { getBusinessData, getAllPointSales } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

// Estados reactivos
const businessData = ref<any>(null)
const pointSalesData = ref<any[]>([])
const loading = ref(true)

// Función para volver al dashboard
function goBack() {
  router.push({ name: 'dashboard' })
}

// Función para formatear la ubicación
function formatLocation(pointSale: any): string {
  if (!pointSale) return 'No especificada'

  const parts = []
  if (pointSale.district?.province?.department?.name) {
    parts.push(pointSale.district.province.department.name)
  }
  if (pointSale.district?.province?.name) {
    parts.push(pointSale.district.province.name)
  }
  if (pointSale.district?.name) {
    parts.push(pointSale.district.name)
  }

  return parts.length > 0 ? parts.join(' / ') : 'No especificada'
}

// Función para editar información general
function editGeneralInfo() {
  console.log('Navegando a edición de empresa')
  router.push({ name: 'business-register' })
}

// Función para editar punto de venta (general - para crear nuevo)
function editPointSaleInfo() {
  console.log('Navegando a registro de punto de venta')
  router.push({ name: 'pointsale-register' })
}

// Función para editar un punto de venta específico
function editPointSale(pointSale: any) {
  console.log('Editando punto de venta:', pointSale)
  // Por ahora navega al registro, pero en el futuro podría navegar a edición específica
  router.push({
    name: 'pointsale-register',
    query: { edit: 'true', id: pointSale.id }
  })
}

// Función para obtener el nombre del contacto (usuario logueado)
function getUserContactName(): string {
  if (authStore.user) {
    return `${authStore.user.firstname} ${authStore.user.lastname}`
  }
  return 'No especificado'
}

// Función para obtener el teléfono del usuario logueado
function getUserPhone(): string {
  return authStore.user?.phone || 'No especificado'
}

// Función para obtener el nombre del colaborador asignado al punto de venta
function getCollaboratorName(pointSale: any): string {
  if (pointSale?.colaborador) {
    return `${pointSale.colaborador.firstname} ${pointSale.colaborador.lastname}`
  }
  return 'No especificado'
}

// Función para obtener el teléfono del colaborador asignado al punto de venta
function getCollaboratorPhone(pointSale: any): string {
  return pointSale?.colaborador?.phone || 'No especificado'
}

// Función para obtener los puntos de venta de un negocio específico (para SUPERADMIN)
function getPointSalesByBusinessId(businessId: number): any[] {
  return pointSalesData.value.filter((ps: any) => ps.businesId === businessId)
}

// Función para editar un negocio específico (para SUPERADMIN)
function editSpecificBusiness(business: any) {
  console.log('Editando negocio específico:', business)
  router.push({
    name: 'business-register',
    query: { edit: 'true', id: business.id }
  })
}

// Cargar datos al montar el componente
async function loadData() {
  try {
    loading.value = true
    const userRole = authStore.user?.role
    console.log('🔍 Rol del usuario:', userRole)

    // Cargar datos de la empresa
    try {
      const allBusinesses = await getBusinessData()
      
      if (userRole === 'SUPERADMIN') {
        // SUPERADMIN ve TODOS los negocios
        businessData.value = allBusinesses && allBusinesses.length > 0 ? allBusinesses : []
        console.log('✅ SUPERADMIN - Todos los negocios cargados:', businessData.value.length)
      } else if (userRole === 'ADMIN') {
        // ADMIN ve solo su negocio
        if (allBusinesses && allBusinesses.length > 0) {
          const userBusiness = allBusinesses.find((b: any) => b.userId === authStore.user?.id)
          businessData.value = userBusiness || null
          console.log('✅ ADMIN - Negocio cargado:', businessData.value)
        } else {
          businessData.value = null
        }
      } else if (userRole === 'COLABORADOR') {
        // COLABORADOR ve el negocio de su punto de venta
        const pointSales = await getAllPointSales()
        const userPointSale = pointSales.find((ps: any) => ps.userId === authStore.user?.id)
        if (userPointSale && allBusinesses) {
          const business = allBusinesses.find((b: any) => b.id === userPointSale.businesId)
          businessData.value = business || null
          console.log('✅ COLABORADOR - Negocio cargado:', businessData.value)
        } else {
          businessData.value = null
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar datos de empresa:', error)
      businessData.value = null
    }

    // Cargar datos de los puntos de venta
    try {
      const allPointSales = await getAllPointSales()
      
      if (userRole === 'SUPERADMIN') {
        // SUPERADMIN ve TODOS los puntos de venta
        pointSalesData.value = allPointSales || []
        console.log('✅ SUPERADMIN - Todos los puntos de venta cargados:', pointSalesData.value.length)
      } else if (userRole === 'ADMIN') {
        // ADMIN ve todos los puntos de venta de su negocio
        if (allPointSales && allPointSales.length > 0 && businessData.value) {
          const businessId = Array.isArray(businessData.value) ? businessData.value[0]?.id : businessData.value.id
          const userPointSales = allPointSales.filter((ps: any) => ps.businesId === businessId)
          pointSalesData.value = userPointSales
          console.log('✅ ADMIN - Puntos de venta del negocio cargados:', pointSalesData.value.length)
        } else {
          pointSalesData.value = []
        }
      } else if (userRole === 'COLABORADOR') {
        // COLABORADOR ve solo su punto de venta asignado
        if (allPointSales && allPointSales.length > 0) {
          const userPointSale = allPointSales.find((ps: any) => ps.userId === authStore.user?.id)
          pointSalesData.value = userPointSale ? [userPointSale] : []
          console.log('✅ COLABORADOR - Punto de venta asignado cargado:', pointSalesData.value.length)
        } else {
          pointSalesData.value = []
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar datos de puntos de venta:', error)
      pointSalesData.value = []
    }

  } catch (error) {
    console.error('❌ Error general al cargar datos:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  console.log('🔄 Componente montado - cargando datos...')
  loadData()
})

// Recargar datos cuando se regrese a esta vista
onActivated(() => {
  console.log('🔄 Vista activada - recargando datos...')
  loadData()
})
</script>

<style scoped>
.busines-presentation-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 0;
  margin: 0;
}

.header {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: #f0f0f0;
}

.reload-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
  font-size: 1.2rem;
}

.reload-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.reload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.title {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.content {
  padding: 1rem;
}

.info-section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.section-subtitle {
  font-size: 0.95rem;
  font-weight: 600;
  color: #666;
  margin: 0;
}

.business-section {
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #ff7a2f;
}

.edit-btn {
  background-color: #ff7a2f;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background-color: #ff944d;
}

.add-pointsale-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-pointsale-btn:hover {
  background-color: #218838;
}

.info-box {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.pointsales-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pointsale-item {
  border-left: 4px solid #ff6b35;
}

.pointsale-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.pointsale-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-pointsale-btn {
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.edit-pointsale-btn:hover {
  background-color: #ff944d;
}

.pointsale-title {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.pointsale-number {
  background: #ff6b35;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.info-content {
  flex: 1;
}

.info-item {
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
  margin-bottom: 0.2rem;
}

.value {
  font-size: 0.95rem;
  color: #333;
  font-weight: 400;
}

.info-icon {
  margin-left: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-data-message {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 2rem 1rem;
  text-align: center;
  color: #999;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.no-data-message svg {
  margin-bottom: 1rem;
}

.no-data-message p {
  margin: 0;
  font-size: 1rem;
}

.no-data-message-small {
  background-color: #fafafa;
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
  color: #999;
  font-size: 0.9rem;
  font-style: italic;
}

.no-data-message-small p {
  margin: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .content {
    padding: 0.5rem;
  }

  .info-box {
    flex-direction: column;
  }

  .info-icon {
    margin-left: 0;
    margin-top: 1rem;
    align-self: center;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .edit-btn {
    align-self: flex-end;
  }
}

/* Tablet y Desktop */
@media (min-width: 769px) {
  .busines-presentation-container {
    max-width: 100%;
    padding: 0 2rem;
  }

  .content {
    padding: 2rem;
  }

  .pointsales-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  .info-box {
    padding: 1.5rem;
  }
}

/* Desktop Grande */
@media (min-width: 1024px) {
  .busines-presentation-container {
    padding: 0 4rem;
  }

  .content {
    max-width: 1400px;
    margin: 0 auto;
  }

  .pointsales-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .business-section {
    padding: 2rem;
  }

  .info-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    min-width: 150px;
  }
}

/* Desktop Extra Grande */
@media (min-width: 1440px) {
  .content {
    max-width: 1600px;
  }
}
</style>
