<template>
  <div class="month-sales">
    <div class="content-wrapper">
      <button class="back-btn" @click="goToDashboard" aria-label="Volver al Dashboard">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff7a2f" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h2>Ventas por Mes</h2>
      <div class="subtitle">Reporte de ventas y estadísticas del mes</div>
    
    <!-- Selector de Tipo de Reporte -->
    <div class="report-type-selector">
      <div class="selector-group">
        <label for="type-select">Tipo de Reporte:</label>
        <select id="type-select" v-model="reportType" @change="handleReportTypeChange">
          <option v-if="canViewBusinessReport" value="business">Por Negocio</option>
          <option value="pointsale">Por Punto de Venta</option>
        </select>
      </div>

      <!-- Selector de Negocio (solo para reporte por negocio) -->
      <div v-if="reportType === 'business' && businesses.length > 0" class="selector-group">
        <label for="business-select">Negocio:</label>
        <select id="business-select" v-model="selectedBusinessId" @change="loadReport">
          <option v-for="business in businesses" :key="business.id" :value="business.id">
            {{ business.name }}
          </option>
        </select>
      </div>

      <!-- Selector de Punto de Venta (solo para reporte por punto de venta) -->
      <div v-if="reportType === 'pointsale' && pointSales.length > 0" class="selector-group">
        <label for="pointsale-select">Punto de Venta:</label>
        <select id="pointsale-select" v-model="selectedPointSaleId" @change="loadReport">
          <option v-for="ps in pointSales" :key="ps.id" :value="ps.id">
            {{ ps.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Selector de Mes y Año -->
    <div class="date-selector">
      <div class="selector-group">
        <label for="month-select">Mes:</label>
        <select id="month-select" v-model="selectedMonth" @change="loadReport">
          <option value="1">Enero</option>
          <option value="2">Febrero</option>
          <option value="3">Marzo</option>
          <option value="4">Abril</option>
          <option value="5">Mayo</option>
          <option value="6">Junio</option>
          <option value="7">Julio</option>
          <option value="8">Agosto</option>
          <option value="9">Septiembre</option>
          <option value="10">Octubre</option>
          <option value="11">Noviembre</option>
          <option value="12">Diciembre</option>
        </select>
      </div>
      
      <div class="selector-group">
        <label for="year-select">Año:</label>
        <select id="year-select" v-model="selectedYear" @change="loadReport">
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
      
      <button class="reload-btn" @click="loadReport" :disabled="loading">
        {{ loading ? '⏳' : '🔄' }} Actualizar
      </button>
    </div>

    <!-- Resumen de Ventas -->
    <div v-if="reportData" class="summary-cards">
      <div class="summary-card">
        <div class="summary-icon">📦</div>
        <div class="summary-content">
          <div class="summary-value">{{ reportData.totalOrders }}</div>
          <div class="summary-label">Órdenes de servicio</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">💰</div>
        <div class="summary-content">
          <div class="summary-value">S/ {{ formatPrice(reportData.totalSales) }}</div>
          <div class="summary-label">Ventas totales</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">💵</div>
        <div class="summary-content">
          <div class="summary-value">S/ {{ formatPrice(reportData.totalCollected) }}</div>
          <div class="summary-label">Total cobrado</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">📊</div>
        <div class="summary-content">
          <div class="summary-value">S/ {{ formatPrice(reportData.pendingBalance) }}</div>
          <div class="summary-label">Saldo pendiente</div>
        </div>
      </div>
    </div>

    <!-- Detalle por Estado de Pago -->
    <div v-if="reportData && reportData.byPaymentStatus.length > 0" class="details-section">
      <h3 class="section-title">Detalle por Estado de Pago</h3>
      <div class="status-cards">
        <div v-for="status in reportData.byPaymentStatus" :key="status.status" class="status-card" :class="getStatusClass(status.status)">
          <div class="status-header">
            <span class="status-icon">{{ getStatusIcon(status.status) }}</span>
            <span class="status-label">{{ getStatusLabel(status.status) }}</span>
          </div>
          <div class="status-stats">
            <div class="stat-item">
              <span class="stat-label">Órdenes:</span>
              <span class="stat-value">{{ status.count }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total:</span>
              <span class="stat-value">S/ {{ formatPrice(status.totalAmount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top 5 Servicios más vendidos -->
    <div v-if="reportData && reportData.topServices.length > 0" class="details-section">
      <h3 class="section-title">Top 5 Servicios Más Vendidos</h3>
      <div class="services-list">
        <div v-for="(service, index) in reportData.topServices" :key="service.serviceName" class="service-item">
          <div class="service-rank">{{ index + 1 }}</div>
          <div class="service-info">
            <div class="service-name">{{ service.serviceName }}</div>
            <div class="service-category">{{ service.categoryName }}</div>
          </div>
          <div class="service-stats">
            <div class="service-quantity">{{ service.quantity }} unidades</div>
            <div class="service-total">S/ {{ formatPrice(service.totalRevenue) }}</div>
          </div>
        </div>
      </div>
    </div>

      <!-- Mensaje cuando no hay datos -->
      <div v-if="!reportData && !loading" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <path d="M9 11l3 3L22 4" stroke="#ccc" stroke-width="2"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="#ccc" stroke-width="2" fill="none"/>
        </svg>
        <p>No hay ventas para {{ getMonthName(selectedMonth) }} {{ selectedYear }}</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando reporte...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { lavanderiaApi, getBusinessData, getAllPointSales } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

function goToDashboard() {
  router.push({ name: 'dashboard' })
}

interface MonthSalesReport {
  totalOrders: number
  totalSales: number
  totalCollected: number
  pendingBalance: number
  byPaymentStatus: Array<{
    status: string
    count: number
    totalAmount: number
  }>
  topServices: Array<{
    serviceName: string
    categoryName: string
    quantity: number
    totalRevenue: number
  }>
}

const reportData = ref<MonthSalesReport | null>(null)
const loading = ref(false)

// Tipo de reporte
const reportType = ref<'business' | 'pointsale'>('pointsale')

// Negocios y puntos de venta
const businesses = ref<any[]>([])
const selectedBusinessId = ref<number | null>(null)
const pointSales = ref<any[]>([])
const selectedPointSaleId = ref<number | null>(null)

// Obtener mes y año actual
const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

// Verificar si el usuario puede ver reporte por negocio
const canViewBusinessReport = computed(() => {
  const role = authStore.user?.role
  return role === 'SUPERADMIN' || role === 'ADMIN'
})

// Generar años disponibles (últimos 5 años)
const availableYears = computed(() => {
  const currentYear = now.getFullYear()
  const years = []
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i)
  }
  return years
})

// Cargar negocios (para SUPERADMIN y ADMIN)
async function loadBusinesses() {
  try {
    const role = authStore.user?.role
    const allBusinesses = await getBusinessData()
    
    if (role === 'SUPERADMIN') {
      businesses.value = allBusinesses
    } else if (role === 'ADMIN') {
      const userBusiness = allBusinesses.find((b: any) => b.userId === authStore.user?.id)
      businesses.value = userBusiness ? [userBusiness] : []
    }
    
    if (businesses.value.length > 0) {
      selectedBusinessId.value = businesses.value[0].id
    }
  } catch (error) {
    console.error('❌ Error al cargar negocios:', error)
    businesses.value = []
  }
}

// Cargar puntos de venta según el rol
async function loadPointSales() {
  try {
    const role = authStore.user?.role
    const allPointSales = await getAllPointSales()
    
    if (role === 'SUPERADMIN') {
      pointSales.value = allPointSales
    } else if (role === 'ADMIN' || role === 'COLABORADOR') {
      const business = await getBusinessData()
      const userBusiness = business.find((b: any) => b.userId === authStore.user?.id)
      if (userBusiness) {
        pointSales.value = allPointSales.filter((ps: any) => ps.businesId === userBusiness.id)
      } else if (role === 'COLABORADOR') {
        // Si es colaborador sin negocio, buscar su punto de venta
        const userPointSale = allPointSales.find((ps: any) => ps.userId === authStore.user?.id)
        if (userPointSale) {
          pointSales.value = allPointSales.filter((ps: any) => ps.businesId === userPointSale.businesId)
        }
      }
    }
    
    if (pointSales.value.length > 0) {
      selectedPointSaleId.value = pointSales.value[0].id
    }
  } catch (error) {
    console.error('❌ Error al cargar puntos de venta:', error)
    pointSales.value = []
  }
}

// Manejar cambio de tipo de reporte
async function handleReportTypeChange() {
  if (reportType.value === 'business') {
    if (businesses.value.length === 0) {
      await loadBusinesses()
    }
  } else {
    if (pointSales.value.length === 0) {
      await loadPointSales()
    }
  }
  
  await loadReport()
}

// Cargar reporte con los filtros seleccionados
async function loadReport() {
  try {
    loading.value = true
    
    const params: any = {
      month: selectedMonth.value,
      year: selectedYear.value,
      type: reportType.value
    }
    
    if (reportType.value === 'business' && selectedBusinessId.value) {
      params.businessId = selectedBusinessId.value
    } else if (reportType.value === 'pointsale' && selectedPointSaleId.value) {
      params.pointSaleId = selectedPointSaleId.value
    }
    
    console.log('🔍 Cargando reporte con params:', params)
    
    const { data } = await lavanderiaApi.get('/analytics/month-sales', { params })
    
    reportData.value = data
    console.log('✅ Reporte cargado:', data)
  } catch (error) {
    console.error('❌ Error al cargar reporte:', error)
    reportData.value = null
  } finally {
    loading.value = false
  }
}

function formatPrice(value: number | string): string {
  if (value === null || value === undefined) return '0.00'
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  return num.toFixed(2)
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    'PAID': '✅',
    'PARTIALLY_PAID': '⏳',
    'PENDING': '❌'
  }
  return icons[status] || '📋'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'PAID': 'Pagado',
    'PARTIALLY_PAID': 'Pago Parcial',
    'PENDING': 'Pendiente'
  }
  return labels[status] || status
}

function getStatusClass(status: string): string {
  return `status-${status.toLowerCase()}`
}

function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return months[month - 1] || 'Desconocido'
}

onMounted(async () => {
  const role = authStore.user?.role
  
  // Inicializar tipo de reporte según el rol
  if (role === 'COLABORADOR') {
    reportType.value = 'pointsale'
    await loadPointSales()
  } else if (role === 'ADMIN' || role === 'SUPERADMIN') {
    reportType.value = 'pointsale'
    await loadPointSales()
  }
  
  await loadReport()
})

onActivated && onActivated(async () => {
  await loadReport()
})
</script>

<style scoped>
.month-sales {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
}

.content-wrapper {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 0 auto;
  position: relative;
}

/* Asegurar que en desktop el contenido esté centrado */
@media (min-width: 769px) {
  .content-wrapper {
    max-width: 1200px;
  }
}

@media (min-width: 1024px) {
  .content-wrapper {
    max-width: 1400px;
  }
}

@media (min-width: 1280px) {
  .content-wrapper {
    max-width: 1600px;
  }
}

h2 {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
  text-align: center;
  width: 100%;
  align-self: center;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
  text-align: center;
  width: 100%;
  align-self: center;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  margin-left: 0;
  margin-right: auto;
}

.back-btn:hover {
  background-color: #f0f0f0;
}

/* Selector de tipo de reporte */
.report-type-selector {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
}

/* Selector de fecha */
.date-selector {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 24px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
}

.selector-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selector-group label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.selector-group select {
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  min-width: 150px;
}

.reload-btn {
  padding: 10px 20px;
  background: #ff7a2f;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.reload-btn:hover:not(:disabled) {
  background: #ff944d;
}

.reload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Tarjetas de resumen */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
  width: 100%;
  box-sizing: border-box;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.summary-icon {
  font-size: 32px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff7a2f 0%, #ff944d 100%);
  border-radius: 12px;
}

.summary-content {
  flex: 1;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 14px;
  color: #666;
}

/* Secciones de detalle */
.details-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  box-sizing: border-box;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
}

/* Tarjetas de estado */
.status-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.status-card {
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #ddd;
}

.status-card.status-paid {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-left-color: #4caf50;
}

.status-card.status-partially_paid {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-left-color: #ff9800;
}

.status-card.status-pending {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border-left-color: #f44336;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.status-icon {
  font-size: 20px;
}

.status-label {
  font-weight: 600;
  color: #333;
}

.status-stats {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

/* Lista de servicios */
.services-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background 0.2s;
}

.service-item:hover {
  background: #e9ecef;
}

.service-rank {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff7a2f 0%, #ff944d 100%);
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 18px;
}

.service-info {
  flex: 1;
}

.service-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.service-category {
  font-size: 12px;
  color: #666;
}

.service-stats {
  text-align: right;
}

.service-quantity {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.service-total {
  font-size: 18px;
  font-weight: 700;
  color: #ff7a2f;
}

/* Estado vacío */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-state svg {
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #ff7a2f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive - Mobile */
@media (max-width: 768px) {
  .month-sales {
    padding: 16px;
  }
  
  .date-selector,
  .report-type-selector {
    flex-direction: column;
    align-items: stretch;
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .status-cards {
    grid-template-columns: 1fr;
  }
}

/* Responsive - Desktop */
@media (min-width: 769px) {
  .month-sales {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 40px 20px;
  }

  .content-wrapper {
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .back-btn {
    margin-left: 0;
    align-self: flex-start;
    margin-right: auto;
  }
  
  .date-selector {
    padding: 24px;
  }

  h2 {
    font-size: 32px;
    text-align: center;
  }

  .subtitle {
    font-size: 16px;
    text-align: center;
    margin-bottom: 32px;
  }

  .back-btn {
    align-self: flex-start;
    margin-bottom: 20px;
  }

  .report-type-selector {
    padding: 24px;
    margin-bottom: 24px;
  }

  .date-selector {
    padding: 24px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 32px;
  }

  .summary-cards {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-bottom: 40px;
  }

  .summary-card {
    padding: 24px;
  }

  .summary-icon {
    font-size: 36px;
    width: 60px;
    height: 60px;
  }

  .summary-value {
    font-size: 28px;
  }

  .summary-label {
    font-size: 15px;
  }

  .details-section {
    padding: 32px;
    margin-bottom: 32px;
  }

  .section-title {
    font-size: 20px;
    margin-bottom: 24px;
  }

  .status-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .status-card {
    padding: 20px;
  }

  .services-list {
    gap: 16px;
  }

  .service-item {
    padding: 20px;
  }

  .service-rank {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .service-name {
    font-size: 16px;
  }

  .service-category {
    font-size: 13px;
  }

  .service-total {
    font-size: 20px;
  }
}

@media (min-width: 1024px) {
  .month-sales {
    padding: 50px 30px;
  }

  .content-wrapper {
    max-width: 1400px;
  }

  h2 {
    font-size: 36px;
  }

  .subtitle {
    font-size: 18px;
  }

  .summary-cards {
    gap: 28px;
  }

  .summary-card {
    padding: 28px;
  }

  .summary-icon {
    font-size: 40px;
    width: 70px;
    height: 70px;
  }

  .summary-value {
    font-size: 32px;
  }

  .details-section {
    padding: 40px;
  }

  .section-title {
    font-size: 22px;
  }
}

@media (min-width: 1280px) {
  .month-sales {
    padding: 60px 40px;
  }
}
</style>

<style>
/* Override global body styles para centrar el contenido */
body:has(.month-sales) {
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

#app:has(.month-sales) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.month-sales) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* Asegurar que el contenedor principal esté centrado */
.month-sales {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* En desktop, centrar el content-wrapper */
@media (min-width: 769px) {
  .month-sales {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
  }
  
  .month-sales .content-wrapper {
    width: 100% !important;
    max-width: 1200px !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
}

@media (min-width: 1024px) {
  .month-sales .content-wrapper {
    max-width: 1400px !important;
  }
}

@media (min-width: 1280px) {
  .month-sales .content-wrapper {
    max-width: 1600px !important;
  }
}
</style>









