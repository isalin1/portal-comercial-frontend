<template>
  <div class="payment-history-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Historial de Pagos</h1>
    </header>

    <div v-if="loading" class="loading-state">
      <p>Cargando historial de pagos...</p>
    </div>

    <div v-else-if="payments.length > 0" class="content">
      <!-- Business Info -->
      <div class="info-card">
        <h2>Negocio: {{ businessName }}</h2>
      </div>

      <!-- Payment History Table -->
      <div class="payments-card">
        <h2>Historial de Pagos</h2>
        <div class="payments-table">
          <table>
            <thead>
              <tr>
                <th>Fecha de Pago</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Estado</th>
                <th>Plan</th>
                <th>Período</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in payments" :key="payment.id">
                <td>{{ formatDate(payment.fechaPago) }}</td>
                <td>S/ {{ formatPrice(payment.monto) }}</td>
                <td>{{ payment.metodoPago || 'N/A' }}</td>
                <td>
                  <span class="status-badge" :class="getPaymentStatusClass(payment.estado)">
                    {{ payment.estado }}
                  </span>
                </td>
                <td>{{ getPlanType(payment) }}</td>
                <td>{{ getPlanPeriod(payment) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="empty-state">
      <div class="empty-card">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        <h2>No hay pagos registrados</h2>
        <p>No se han registrado pagos para este negocio.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import {
  getPlanPayments,
  getBusinessData,
  type PlanPayment
} from '@/api/lavanderiaApi'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const payments = ref<PlanPayment[]>([])
const loading = ref(true)
const userBusinessId = ref<number | null>(null)
const businessName = ref<string>('')

const businessId = computed(() => {
  if (authStore.user?.role === 'ADMIN') {
    return userBusinessId.value || parseInt(route.params.businessId as string)
  }
  return parseInt(route.params.businessId as string)
})

const goBack = () => {
  router.push({ name: 'plans-main' })
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const formatPrice = (price: any) => {
  // Convertir a número si es string o Decimal de Prisma
  const numPrice = typeof price === 'number' ? price : Number(price) || 0
  return numPrice.toFixed(2)
}

const getPaymentStatusClass = (status: string) => {
  const statusMap: Record<string, string> = {
    'APROBADO': 'status-approved',
    'PENDIENTE': 'status-pending',
    'RECHAZADO': 'status-rejected'
  }
  return statusMap[status] || 'status-pending'
}

const getPlanType = (payment: any) => {
  if (payment.businessPlan?.plan?.tipo) {
    return payment.businessPlan.plan.tipo
  }
  if (payment.plan?.tipo) {
    return payment.plan.tipo
  }
  return 'N/A'
}

const getPlanPeriod = (payment: any) => {
  if (payment.businessPlan?.plan?.nombrePeriodo) {
    return payment.businessPlan.plan.nombrePeriodo
  }
  if (payment.plan?.nombrePeriodo) {
    return payment.plan.nombrePeriodo
  }
  return 'N/A'
}

const loadUserBusiness = async () => {
  if (authStore.user?.role === 'ADMIN') {
    try {
      const businesses = await getBusinessData()
      const userBusiness = businesses.find((b: any) => b.userId === authStore.user?.id)
      if (userBusiness) {
        userBusinessId.value = userBusiness.id
        businessName.value = userBusiness.name
      }
    } catch (error) {
      console.error('Error cargando información del negocio:', error)
    }
  }
}

const loadPayments = async () => {
  try {
    loading.value = true
    const businessIdValue = businessId.value
    
    if (!businessIdValue) {
      console.error('No se pudo obtener el ID del negocio')
      alert('No se pudo obtener la información del negocio')
      loading.value = false
      return
    }
    
    // Obtener nombre del negocio si es SUPERADMIN
    if (authStore.user?.role === 'SUPERADMIN') {
      try {
        const businesses = await getBusinessData()
        const business = businesses.find((b: any) => b.id === businessIdValue)
        if (business) {
          businessName.value = business.name
        }
      } catch (error) {
        console.error('Error cargando nombre del negocio:', error)
      }
    }
    
    console.log('🔍 Cargando pagos para businessId:', businessIdValue)
    const paymentsData = await getPlanPayments({ businesId: businessIdValue })
    console.log('📦 Pagos recibidos:', paymentsData)
    
    // Asegurar que paymentsData sea un array
    if (Array.isArray(paymentsData)) {
      payments.value = paymentsData
    } else if (paymentsData && Array.isArray(paymentsData.data)) {
      payments.value = paymentsData.data
    } else {
      payments.value = []
    }
    
    console.log('✅ Pagos procesados:', payments.value.length)
  } catch (error: any) {
    console.error('❌ Error cargando historial de pagos:', error)
    const errorMessage = error.response?.data?.message || error.message || 'Error al cargar el historial de pagos'
    alert(errorMessage)
    payments.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await loadUserBusiness()
    // Esperar un momento para asegurar que userBusinessId esté cargado
    if (authStore.user?.role === 'ADMIN' && !userBusinessId.value) {
      // Si es ADMIN y no se cargó el businessId, intentar de nuevo
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadUserBusiness()
    }
    await loadPayments()
  } catch (error) {
    console.error('Error en onMounted:', error)
    loading.value = false
  }
})
</script>

<style scoped>
.payment-history-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.back-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
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

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.empty-card {
  text-align: center;
  background: white;
  padding: 48px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-card svg {
  color: #999;
  margin-bottom: 16px;
}

.empty-card h2 {
  font-size: 24px;
  color: #333;
  margin: 0 0 8px 0;
}

.empty-card p {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card,
.payments-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-card h2,
.payments-card h2 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
}

.payments-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background-color: #f8f9fa;
}

th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #333;
  font-size: 14px;
  border-bottom: 2px solid #e5e5e5;
}

td {
  padding: 12px;
  border-bottom: 1px solid #e5e5e5;
  font-size: 14px;
  color: #666;
}

tbody tr:hover {
  background-color: #f8f9fa;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.status-badge.status-approved {
  background-color: #d1e7dd;
  color: #0f5132;
}

.status-badge.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-badge.status-rejected {
  background-color: #f8d7da;
  color: #842029;
}

@media (min-width: 768px) {
  .payment-history-container {
    padding: 32px;
  }

  .title {
    font-size: 32px;
  }
}

@media (min-width: 1024px) {
  .payment-history-container {
    padding: 40px;
  }
}
</style>

