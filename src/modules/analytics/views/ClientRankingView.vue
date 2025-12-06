<template>
  <div class="client-ranking">
    <div class="content-wrapper">
      <button class="back-btn" @click="goToDashboard" aria-label="Volver al Dashboard">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff7a2f" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h2>Ranking de Clientes</h2>
      <div class="subtitle">Clientes con mayor facturación del mes</div>
    
    <!-- Selector de Tipo de Ranking -->
    <div class="ranking-type-selector">
      <div class="selector-group">
        <label for="type-select">Tipo de Ranking:</label>
        <select id="type-select" v-model="rankingType" @change="handleRankingTypeChange">
          <option v-if="canViewBusinessRanking" value="business">Por Negocio</option>
          <option value="pointsale">Por Punto de Venta</option>
        </select>
      </div>

      <!-- Selector de Negocio (solo para ranking por negocio) -->
      <div v-if="rankingType === 'business' && businesses.length > 0" class="selector-group">
        <label for="business-select">Negocio:</label>
        <select id="business-select" v-model="selectedBusinessId" @change="handleBusinessChange">
          <option v-for="business in businesses" :key="business.id" :value="business.id">
            {{ business.name }}
          </option>
        </select>
      </div>

      <!-- Selector de Punto de Venta (solo para ranking por punto de venta) -->
      <div v-if="rankingType === 'pointsale' && pointSales.length > 0" class="selector-group">
        <label for="pointsale-select">Punto de Venta:</label>
        <select id="pointsale-select" v-model="selectedPointSaleId" @change="loadRanking">
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
        <select id="month-select" v-model="selectedMonth" @change="loadRanking">
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
        <select id="year-select" v-model="selectedYear" @change="loadRanking">
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
      
      <button class="reload-btn" @click="loadRanking" :disabled="loading">
        {{ loading ? '⏳' : '🔄' }} Actualizar
      </button>
    </div>

    <!-- Resumen -->
    <div v-if="rankingData.length > 0" class="summary-cards">
      <div class="summary-card">
        <div class="summary-icon">👥</div>
        <div class="summary-content">
          <div class="summary-value">{{ rankingData.length }}</div>
          <div class="summary-label">Clientes activos</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">📊</div>
        <div class="summary-content">
          <div class="summary-value">{{ totalOrders }}</div>
          <div class="summary-label">Órdenes totales</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">💰</div>
        <div class="summary-content">
          <div class="summary-value">S/ {{ formatPrice(totalRevenue) }}</div>
          <div class="summary-label">Facturación total</div>
        </div>
      </div>
    </div>

    <!-- Tabla de Ranking -->
    <div v-if="rankingData.length > 0" class="ranking-table-container">
      <table class="ranking-table">
        <thead>
          <tr>
            <th class="rank-col">Posición</th>
            <th class="client-col">Cliente</th>
            <th class="orders-col">N° Órdenes</th>
            <th class="total-col">Total Facturado</th>
            <th class="average-col">Promedio por Orden</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(client, index) in rankingData" :key="client.clientId" :class="getRankClass(index)">
            <td class="rank-col">
              <div class="rank-badge" :class="getRankClass(index)">
                <span v-if="index === 0">🥇</span>
                <span v-else-if="index === 1">🥈</span>
                <span v-else-if="index === 2">🥉</span>
                <span v-else>{{ index + 1 }}</span>
              </div>
            </td>
            <td class="client-col">
              <div class="client-info">
                <div class="client-avatar">
                  {{ getInitials(client.clientName) }}
                </div>
                <div class="client-details">
                  <div class="client-name">{{ client.clientName }}</div>
                  <div class="client-phone">{{ client.clientPhone || 'Sin teléfono' }}</div>
                </div>
              </div>
            </td>
            <td class="orders-col">
              <span class="orders-badge">{{ client.orderCount }}</span>
            </td>
            <td class="total-col">
              <strong>S/ {{ formatPrice(client.totalAmount) }}</strong>
            </td>
            <td class="average-col">
              S/ {{ formatPrice(client.averageAmount) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mensaje cuando no hay datos -->
    <div v-else-if="!loading" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3L22 4" stroke="#ccc" stroke-width="2"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="#ccc" stroke-width="2" fill="none"/>
      </svg>
      <p>No hay órdenes de venta para {{ getMonthName(selectedMonth) }} {{ selectedYear }}</p>
    </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando ranking...</p>
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

interface ClientRankingData {
  clientId: number
  clientName: string
  clientPhone: string | null
  orderCount: number
  totalAmount: number
  averageAmount: number
}

const rankingData = ref<ClientRankingData[]>([])
const loading = ref(false)

// Tipo de ranking
const rankingType = ref<'business' | 'pointsale'>('pointsale')

// Negocios y puntos de venta
const businesses = ref<any[]>([])
const selectedBusinessId = ref<number | null>(null)
const pointSales = ref<any[]>([])
const selectedPointSaleId = ref<number | null>(null)

// Obtener mes y año actual
const now = new Date()
const selectedMonth = ref(now.getMonth() + 1) // 1-12
const selectedYear = ref(now.getFullYear())

// Verificar si el usuario puede ver ranking por negocio
const canViewBusinessRanking = computed(() => {
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

// Calcular totales
const totalOrders = computed(() => {
  return rankingData.value.reduce((sum, client) => sum + client.orderCount, 0)
})

const totalRevenue = computed(() => {
  return rankingData.value.reduce((sum, client) => sum + client.totalAmount, 0)
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
    
    console.log('✅ Negocios cargados:', businesses.value.length)
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
    } else if (role === 'ADMIN') {
      const business = await getBusinessData()
      const userBusiness = business.find((b: any) => b.userId === authStore.user?.id)
      if (userBusiness) {
        pointSales.value = allPointSales.filter((ps: any) => ps.businesId === userBusiness.id)
      }
    } else if (role === 'COLABORADOR') {
      const userPointSale = allPointSales.find((ps: any) => ps.userId === authStore.user?.id)
      pointSales.value = userPointSale ? [userPointSale] : []
    }
    
    if (pointSales.value.length > 0) {
      selectedPointSaleId.value = pointSales.value[0].id
    }
    
    console.log('✅ Puntos de venta cargados:', pointSales.value.length)
  } catch (error) {
    console.error('❌ Error al cargar puntos de venta:', error)
    pointSales.value = []
  }
}

// Manejar cambio de tipo de ranking
async function handleRankingTypeChange() {
  console.log('🔄 Tipo de ranking cambiado a:', rankingType.value)
  
  if (rankingType.value === 'business') {
    if (businesses.value.length === 0) {
      await loadBusinesses()
    }
  } else {
    if (pointSales.value.length === 0) {
      await loadPointSales()
    }
  }
  
  await loadRanking()
}

// Manejar cambio de negocio
async function handleBusinessChange() {
  console.log('🔄 Negocio cambiado a:', selectedBusinessId.value)
  await loadRanking()
}

// Cargar ranking con los filtros seleccionados
async function loadRanking() {
  try {
    loading.value = true
    
    const params: any = {
      month: selectedMonth.value,
      year: selectedYear.value,
      type: rankingType.value
    }
    
    if (rankingType.value === 'business' && selectedBusinessId.value) {
      params.businessId = selectedBusinessId.value
    } else if (rankingType.value === 'pointsale' && selectedPointSaleId.value) {
      params.pointSaleId = selectedPointSaleId.value
    }
    
    console.log('🔍 Cargando ranking con params:', params)
    
    const { data } = await lavanderiaApi.get('/analytics/client-ranking', { params })
    
    rankingData.value = data
    console.log('✅ Ranking cargado:', data.length, 'clientes')
  } catch (error) {
    console.error('❌ Error al cargar ranking:', error)
    rankingData.value = []
  } finally {
    loading.value = false
  }
}

function formatPrice(value: number | string): string {
  if (value === null || value === undefined) return '0.00'
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  return num.toFixed(2)
}

function getInitials(name: string): string {
  if (!name) return '??'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getRankClass(index: number): string {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
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
  
  // Inicializar tipo de ranking según el rol
  if (role === 'COLABORADOR') {
    rankingType.value = 'pointsale'
    await loadPointSales()
  } else if (role === 'ADMIN' || role === 'SUPERADMIN') {
    // Por defecto, ranking por punto de venta
    rankingType.value = 'pointsale'
    await loadPointSales()
  }
  
  await loadRanking()
})

onActivated && onActivated(async () => {
  await loadRanking()
})
</script>

<style scoped>
.client-ranking {
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

/* Selector de tipo de ranking */
.ranking-type-selector {
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
  margin-bottom: 24px;
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

/* Tabla de ranking */
.ranking-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
}

.ranking-table thead {
  background: linear-gradient(135deg, #ff7a2f 0%, #ff944d 100%);
  color: white;
}

.ranking-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
}

.ranking-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.ranking-table tbody tr:hover {
  background: #f8f9fa;
}

.ranking-table tbody tr.rank-gold {
  background: linear-gradient(135deg, #fff9e6 0%, #fff3cc 100%);
}

.ranking-table tbody tr.rank-silver {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}

.ranking-table tbody tr.rank-bronze {
  background: linear-gradient(135deg, #fff0e6 0%, #ffe6cc 100%);
}

.ranking-table td {
  padding: 16px;
  font-size: 14px;
  color: #333;
}

.rank-col {
  width: 100px;
  text-align: center;
}

.client-col {
  min-width: 250px;
}

.orders-col {
  width: 120px;
  text-align: center;
}

.total-col {
  width: 150px;
  text-align: right;
}

.average-col {
  width: 150px;
  text-align: right;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 16px;
  background: #f0f0f0;
  color: #666;
}

.rank-badge.rank-gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #8b6914;
  font-size: 20px;
}

.rank-badge.rank-silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e0e0e0 100%);
  color: #555;
  font-size: 20px;
}

.rank-badge.rank-bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #e89b5a 100%);
  color: #5a3a1a;
  font-size: 20px;
}

.client-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.client-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7a2f 0%, #ff944d 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.client-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.client-name {
  font-weight: 600;
  color: #333;
}

.client-phone {
  font-size: 12px;
  color: #666;
}

.orders-badge {
  display: inline-block;
  padding: 6px 12px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-weight: 600;
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
  .client-ranking {
    padding: 16px;
  }
  
  .date-selector {
    flex-direction: column;
    align-items: stretch;
  }
  
  .ranking-table-container {
    overflow-x: auto;
  }
  
  .ranking-table {
    min-width: 600px;
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
}

/* Responsive - Desktop */
@media (min-width: 769px) {
  .client-ranking {
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

  .summary-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 32px;
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

  .ranking-table-container {
    padding: 0;
  }

  .ranking-table th {
    padding: 20px;
    font-size: 15px;
  }

  .ranking-table td {
    padding: 20px;
    font-size: 15px;
  }
}

@media (min-width: 1024px) {
  .client-ranking {
    padding: 50px 30px;
  }

  h2 {
    font-size: 32px;
  }

  .subtitle {
    font-size: 16px;
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
}

@media (min-width: 1280px) {
  .client-ranking {
    padding: 60px 40px;
  }
}
</style>

<style>
/* Override global body styles para centrar el contenido */
body:has(.client-ranking) {
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

#app:has(.client-ranking) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.client-ranking) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* Asegurar que el contenedor principal esté centrado */
.client-ranking {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* En desktop, centrar el content-wrapper */
@media (min-width: 769px) {
  .client-ranking {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
  }
  
  .client-ranking .content-wrapper {
    width: 100% !important;
    max-width: 1200px !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
}

@media (min-width: 1024px) {
  .client-ranking .content-wrapper {
    max-width: 1400px !important;
  }
}

@media (min-width: 1280px) {
  .client-ranking .content-wrapper {
    max-width: 1600px !important;
  }
}
</style>

