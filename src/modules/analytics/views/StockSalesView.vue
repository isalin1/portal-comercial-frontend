<template>
  <div class="stock-sales">
    <button class="back-btn" @click="goToDashboard" aria-label="Volver al Dashboard">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="#ff7a2f" stroke-width="2" fill="none" />
      </svg>
    </button>
    <h2>Stock de Ventas y Cobranzas</h2>
    <div class="subtitle">Órdenes pendientes de entrega y saldos por cobrar</div>
    
    <!-- Botón de actualización -->
    <div class="actions-bar">
      <button class="reload-btn" @click="loadReport" :disabled="loading">
        {{ loading ? '⏳' : '🔄' }} Actualizar
      </button>
      <span class="last-update" v-if="lastUpdate">
        Última actualización: {{ formatDateTime(lastUpdate) }}
      </span>
    </div>

    <!-- Resumen General -->
    <div v-if="reportData && reportData.summary" class="summary-cards">
      <div class="summary-card">
        <div class="summary-icon">📍</div>
        <div class="summary-content">
          <div class="summary-value">{{ reportData.summary.totalPointSales }}</div>
          <div class="summary-label">Puntos de venta</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">📦</div>
        <div class="summary-content">
          <div class="summary-value">{{ reportData.summary.totalOrders }}</div>
          <div class="summary-label">Órdenes pendientes</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">💰</div>
        <div class="summary-content">
          <div class="summary-value">S/ {{ formatPrice(reportData.summary.totalSalesValue) }}</div>
          <div class="summary-label">Valor total en stock</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon">📊</div>
        <div class="summary-content">
          <div class="summary-value">S/ {{ formatPrice(reportData.summary.totalPendingBalance) }}</div>
          <div class="summary-label">Saldo por cobrar</div>
        </div>
      </div>
    </div>

    <!-- Tabla de Puntos de Venta -->
    <div v-if="reportData && reportData.byPointSale.length > 0" class="report-table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th class="pointsale-col">Punto de Venta</th>
            <th class="business-col">Negocio</th>
            <th class="orders-col">Órdenes Pendientes</th>
            <th class="value-col">Valor en Stock</th>
            <th class="balance-col">Saldo por Cobrar</th>
            <th class="percentage-col">% Por Cobrar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in reportData.byPointSale" :key="item.pointSaleId">
            <td class="pointsale-col">
              <div class="pointsale-info">
                <div class="pointsale-icon">📍</div>
                <span class="pointsale-name">{{ item.pointSaleName }}</span>
              </div>
            </td>
            <td class="business-col">
              <span class="business-name">{{ item.businessName }}</span>
            </td>
            <td class="orders-col">
              <span class="orders-badge">{{ item.orderCount }}</span>
            </td>
            <td class="value-col">
              <strong>S/ {{ formatPrice(item.totalValue) }}</strong>
            </td>
            <td class="balance-col">
              <span class="balance-amount" :class="getBalanceClass(item.pendingBalance)">
                S/ {{ formatPrice(item.pendingBalance) }}
              </span>
            </td>
            <td class="percentage-col">
              <div class="percentage-bar">
                <div class="percentage-fill" :style="{ width: calculatePercentage(item.pendingBalance, item.totalValue) + '%' }"></div>
                <span class="percentage-text">{{ calculatePercentage(item.pendingBalance, item.totalValue) }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2"><strong>TOTALES</strong></td>
            <td class="orders-col"><strong>{{ reportData.summary.totalOrders }}</strong></td>
            <td class="value-col"><strong>S/ {{ formatPrice(reportData.summary.totalSalesValue) }}</strong></td>
            <td class="balance-col"><strong>S/ {{ formatPrice(reportData.summary.totalPendingBalance) }}</strong></td>
            <td class="percentage-col"><strong>{{ calculatePercentage(reportData.summary.totalPendingBalance, reportData.summary.totalSalesValue) }}%</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Mensaje cuando no hay datos -->
    <div v-if="reportData && reportData.byPointSale.length === 0 && !loading" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3L22 4" stroke="#ccc" stroke-width="2"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="#ccc" stroke-width="2" fill="none"/>
      </svg>
      <p>No hay órdenes pendientes de entrega</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando reporte...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { lavanderiaApi } from '@/api/lavanderiaApi'

const router = useRouter()

function goToDashboard() {
  router.push({ name: 'dashboard' })
}

interface StockSalesReport {
  summary: {
    totalPointSales: number
    totalOrders: number
    totalSalesValue: number
    totalPendingBalance: number
  }
  byPointSale: Array<{
    pointSaleId: number
    pointSaleName: string
    businessName: string
    orderCount: number
    totalValue: number
    pendingBalance: number
  }>
}

const reportData = ref<StockSalesReport | null>(null)
const loading = ref(false)
const lastUpdate = ref<Date | null>(null)

async function loadReport() {
  try {
    loading.value = true
    console.log('🔍 Cargando reporte de stock')
    
    const { data } = await lavanderiaApi.get('/analytics/stock-sales')
    
    reportData.value = data
    lastUpdate.value = new Date()
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

function formatDateTime(date: Date): string {
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function calculatePercentage(balance: number, total: number): number {
  if (total === 0) return 0
  return Math.round((balance / total) * 100)
}

function getBalanceClass(balance: number): string {
  if (balance === 0) return 'balance-zero'
  if (balance > 0) return 'balance-pending'
  return ''
}

onMounted(() => {
  loadReport()
})

onActivated && onActivated(() => {
  loadReport()
})
</script>

<style scoped>
.stock-sales {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
}

h2 {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
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
}

.back-btn:hover {
  background-color: #f0f0f0;
}

/* Barra de acciones */
.actions-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
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

.last-update {
  font-size: 13px;
  color: #666;
  font-style: italic;
}

/* Tarjetas de resumen */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
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

/* Tabla de reporte */
.report-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
}

.report-table thead {
  background: linear-gradient(135deg, #ff7a2f 0%, #ff944d 100%);
  color: white;
}

.report-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
}

.report-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.report-table tbody tr:hover {
  background: #f8f9fa;
}

.report-table td {
  padding: 16px;
  font-size: 14px;
  color: #333;
}

.pointsale-col {
  min-width: 200px;
}

.business-col {
  min-width: 180px;
}

.orders-col {
  text-align: center;
  width: 120px;
}

.value-col {
  text-align: right;
  width: 150px;
}

.balance-col {
  text-align: right;
  width: 150px;
}

.percentage-col {
  width: 150px;
}

.pointsale-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pointsale-icon {
  font-size: 20px;
}

.pointsale-name {
  font-weight: 600;
}

.business-name {
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

.balance-amount {
  font-weight: 700;
}

.balance-pending {
  color: #f44336;
}

.balance-zero {
  color: #4caf50;
}

.percentage-bar {
  position: relative;
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
}

.percentage-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #ff7a2f 0%, #f44336 100%);
  transition: width 0.3s;
}

.percentage-text {
  position: relative;
  display: block;
  text-align: center;
  line-height: 24px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  z-index: 1;
}

.total-row {
  background: #f8f9fa;
  font-weight: 700;
}

.total-row td {
  border-top: 2px solid #ff7a2f;
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

/* Responsive */
@media (max-width: 768px) {
  .stock-sales {
    padding: 16px;
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .report-table-container {
    overflow-x: auto;
  }
  
  .report-table {
    min-width: 800px;
  }
}
</style>










