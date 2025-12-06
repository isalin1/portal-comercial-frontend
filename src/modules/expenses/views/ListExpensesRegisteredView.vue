<template>
  <div class="expenses-list-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Gastos Registrados x Dia</h1>
    </header>

    <div class="content">
      <!-- Filters Section -->
      <div class="filters-section">
        <!-- Punto de Venta -->
        <div class="form-section">
          <label class="form-label">Punto de Venta</label>
          <select 
            v-model="selectedPointSaleId" 
            class="form-select"
            @change="loadExpenses"
          >
            <option :value="null">Selecciona Punto de Venta</option>
            <option 
              v-for="pointsale in availablePointSales" 
              :key="pointsale.id" 
              :value="pointsale.id"
            >
              {{ pointsale.name }}
            </option>
          </select>
        </div>

        <!-- Elegir Dia -->
        <div class="form-section">
          <label class="form-label">Elegir Dia</label>
          <div class="date-search-container">
            <input 
              v-model="dateSearch"
              type="date"
              class="date-input"
              :max="todayString"
              @change="onDateChange"
            >
            <button class="filter-button" @click="toggleDateFilter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
              </svg>
            </button>
          </div>
        </div>

        <!-- Botón Registrar Gastos -->
        <div class="form-section register-button-section">
          <button class="register-button" @click="goToRegisterExpenses">
            Registrar Gastos
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <p>Cargando gastos...</p>
      </div>

      <!-- Lista de Gastos -->
      <div v-else class="expenses-list">
        <div v-if="groupedExpenses.length === 0" class="empty-message">
          <p>No hay gastos registrados para esta fecha</p>
        </div>

        <div 
          v-for="group in groupedExpenses" 
          :key="group.date"
          class="expense-group"
        >
          <div class="group-header">
            <span class="group-date">{{ formatDate(group.date) }}</span>
            <span class="group-total">S/. {{ formatPrice(group.total) }}</span>
          </div>

          <div class="expenses-table">
            <table>
              <thead>
                <tr>
                  <th>Destinatario</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="expense in group.expenses" :key="expense.id">
                  <td>{{ expense.recipient }}</td>
                  <td>{{ expense.concept }}</td>
                  <td>S/. {{ formatPrice(expense.amount) }}</td>
                  <td>
                    <button class="edit-button" @click="editExpense(expense)">
                      Edit
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { getAllPointSales, getBusinessData, getExpenses } from '@/api/lavanderiaApi'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Data
const selectedPointSaleId = ref<number | null>(null)
const dateSearch = ref<string>('')
const loading = ref(false)
const availablePointSales = ref<any[]>([])
const businesses = ref<any[]>([])
const expenses = ref<any[]>([])

// Computed
const userRole = computed(() => authStore.user?.role)

const todayString = computed(() => {
  // Usar la fecha local del sistema, no UTC
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const groupedExpenses = computed(() => {
  if (expenses.value.length === 0) return []
  
  const grouped: { [key: string]: { date: string; total: number; expenses: any[] } } = {}
  
  expenses.value.forEach(expense => {
    const date = expense.date || expense.createdAt?.split('T')[0] || ''
    console.log('🟡 [FRONTEND] Agrupando gasto:', {
      id: expense.id,
      date: expense.date,
      createdAt: expense.createdAt,
      dateUsada: date,
      recipient: expense.recipient
    })
    if (!grouped[date]) {
      grouped[date] = {
        date,
        total: 0,
        expenses: []
      }
    }
    grouped[date].expenses.push(expense)
    grouped[date].total += expense.amount || 0
  })
  
  console.log('🟡 [FRONTEND] Gastos agrupados:', grouped)
  const sorted = Object.values(grouped).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  console.log('🟡 [FRONTEND] Gastos agrupados y ordenados:', sorted)
  return sorted
})

// Methods
const goBack = () => {
  router.push({ name: 'dashboard' })
}

const goToRegisterExpenses = () => {
  // Validar que se haya seleccionado un punto de venta
  if (!selectedPointSaleId.value) {
    alert('Por favor selecciona un punto de venta antes de registrar gastos')
    return
  }

  // Validar que se haya seleccionado una fecha
  if (!dateSearch.value) {
    alert('Por favor selecciona una fecha antes de registrar gastos')
    return
  }

  // Validar que la fecha no sea mayor a hoy
  if (dateSearch.value > todayString.value) {
    alert('No se pueden registrar gastos con fechas futuras. La fecha máxima permitida es hoy.')
    dateSearch.value = todayString.value
    return
  }

  console.log('🔄 Navegando a registro de gastos')
  router.push({ 
    name: 'expenses-register',
    query: {
      pointsaleId: selectedPointSaleId.value.toString(),
      date: dateSearch.value
    }
  })
}

const onDateChange = () => {
  // Validar que la fecha no sea mayor a hoy
  if (dateSearch.value && dateSearch.value > todayString.value) {
    alert('No se pueden consultar gastos con fechas futuras. La fecha máxima permitida es hoy.')
    dateSearch.value = todayString.value
    return
  }
  loadExpenses()
}

const toggleDateFilter = () => {
  // Implementar lógica de filtro si es necesario
  loadExpenses()
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  // Si la fecha viene como string "YYYY-MM-DD", parsearla directamente sin usar Date
  // para evitar problemas de zona horaria
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }
  // Si viene en otro formato, usar métodos UTC para evitar problemas de zona horaria
  const date = new Date(dateString)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

const formatPrice = (price: number) => {
  if (!price) return '0.00'
  return Number(price).toFixed(2)
}

const editExpense = (expense: any) => {
  console.log('🔄 Editando gasto:', expense)
  // Navegar a la vista de registro con el ID del gasto y los parámetros necesarios
  router.push({
    name: 'expenses-register',
    query: {
      id: expense.id.toString(),
      pointsaleId: selectedPointSaleId.value?.toString(),
      date: dateSearch.value
    }
  })
}

const loadPointSales = async (skipAutoSelect: boolean = false) => {
  try {
    if (userRole.value === 'SUPERADMIN') {
      // Para SUPERADMIN, cargar todos los puntos de venta
      const data = await getAllPointSales()
      availablePointSales.value = data
      // NO establecer punto de venta por defecto - el usuario debe elegir
    } else if (userRole.value === 'ADMIN') {
      // Para ADMIN, cargar puntos de venta del negocio
      const businessData = await getBusinessData()
      if (businessData && businessData.length > 0) {
        const businessId = businessData[0].id
        const data = await getAllPointSales()
        availablePointSales.value = data.filter((ps: any) => ps.businesId === businessId)
      }
      // NO establecer punto de venta por defecto - el usuario debe elegir
    } else if (userRole.value === 'COLABORADOR') {
      // Para COLABORADOR, cargar solo su punto de venta asignado y establecerlo automáticamente
      const data = await getAllPointSales()
      const userId = authStore.user?.id
      const userPointSale = data.find((ps: any) => ps.userId === userId)
      if (userPointSale) {
        availablePointSales.value = [userPointSale]
        // Solo establecer si no se debe omitir (cuando viene desde ExpensesRegister)
        if (!skipAutoSelect) {
          selectedPointSaleId.value = userPointSale.id
        }
      }
    }
  } catch (error) {
    console.error('Error cargando puntos de venta:', error)
  }
}

const loadExpenses = async () => {
  if (!selectedPointSaleId.value) {
    expenses.value = []
    return
  }

  loading.value = true
  try {
    const params: { pointsaleId?: number; date?: string } = {
      pointsaleId: selectedPointSaleId.value
    }
    
    if (dateSearch.value) {
      params.date = dateSearch.value
    }

    const data = await getExpenses(params)
    console.log('🔵 [FRONTEND] Datos recibidos del backend:', data)
    expenses.value = data.map((expense: any) => {
      // La fecha ya viene formateada como string "YYYY-MM-DD" desde el backend
      // Solo necesitamos usarla directamente
      const dateString = expense.date || ''
      console.log('🔵 [FRONTEND] Gasto procesado:', {
        id: expense.id,
        dateOriginal: expense.date,
        dateString,
        recipient: expense.recipient,
        concept: expense.concept
      })
      return {
        id: expense.id,
        date: dateString,
        recipient: expense.recipient,
        concept: expense.concept,
        amount: Number(expense.amount)
      }
    })
    console.log('🔵 [FRONTEND] Gastos procesados:', expenses.value)
  } catch (error) {
    console.error('Error cargando gastos:', error)
    expenses.value = []
  } finally {
    loading.value = false
  }
}

// Watch para recargar gastos cuando cambian los filtros (solo después de la inicialización)
watch([selectedPointSaleId, dateSearch], () => {
  if (selectedPointSaleId.value) {
    loadExpenses()
  }
}, { immediate: false })

// Lifecycle
onMounted(async () => {
  // Verificar si hay parámetros en la URL (viene del registro de gasto)
  const pointsaleIdParam = route.query.pointsaleId as string
  const dateParam = route.query.date as string
  
  // Establecer fecha
  if (dateParam) {
    // Si viene desde ExpensesRegister, usar la fecha del query param
    dateSearch.value = dateParam
  } else {
    // Si viene desde Dashboard, usar fecha actual
    const today = new Date()
    dateSearch.value = today.toISOString().split('T')[0]
  }
  
  // Cargar puntos de venta
  // Si viene desde ExpensesRegister, omitir la selección automática para COLABORADOR
  await loadPointSales(!!pointsaleIdParam)
  
  if (pointsaleIdParam) {
    // Si viene desde ExpensesRegister, usar el punto de venta del query param
    selectedPointSaleId.value = parseInt(pointsaleIdParam, 10)
  }
  // Si no viene desde ExpensesRegister:
  // - ADMIN/SUPERADMIN: selectedPointSaleId queda null (usuario debe elegir)
  // - COLABORADOR: ya se estableció en loadPointSales (porque skipAutoSelect fue false)
  
  // Cargar gastos si hay un punto de venta seleccionado
  if (selectedPointSaleId.value) {
    await loadExpenses()
  }
})

// Recargar cuando se activa la vista (al regresar desde otra vista)
onActivated(async () => {
  // Verificar si hay parámetros en la URL (viene del registro de gasto)
  const pointsaleIdParam = route.query.pointsaleId as string
  const dateParam = route.query.date as string
  
  if (pointsaleIdParam) {
    const newPointsaleId = parseInt(pointsaleIdParam, 10)
    if (newPointsaleId !== selectedPointSaleId.value) {
      selectedPointSaleId.value = newPointsaleId
    }
  } else {
    // Si no hay query param, verificar si es COLABORADOR y no tiene punto de venta seleccionado
    if (userRole.value === 'COLABORADOR' && !selectedPointSaleId.value) {
      // Recargar puntos de venta para asegurar que el colaborador tenga su punto asignado
      await loadPointSales()
    }
  }
  
  if (dateParam && dateParam !== dateSearch.value) {
    dateSearch.value = dateParam
  } else if (!dateParam) {
    // Si no hay fecha en query param, usar fecha actual
    const today = new Date()
    dateSearch.value = today.toISOString().split('T')[0]
  }
  
  // Recargar gastos si hay un punto de venta seleccionado
  if (selectedPointSaleId.value) {
    await loadExpenses()
  }
})
</script>

<style scoped>
.expenses-list-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-bottom: 2rem;
  width: 100%;
  max-width: 100%;
}

/* Header */
.page-header {
  background-color: #fff;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.back-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #f5f5f5;
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

/* Content */
.content {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* Filters Section */
.filters-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Form Section */
.form-section {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

.register-button-section {
  display: flex;
  align-items: flex-end;
}

.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  background-color: #fff;
  font-size: 1rem;
  color: #333;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
  padding-right: 2.5rem;
}

.form-select:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

/* Date Search Container */
.date-search-container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.date-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  background-color: #fff;
  font-size: 1rem;
  color: #333;
}

.date-input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.filter-button {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  background-color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.filter-button:hover {
  background-color: #f5f5f5;
  border-color: #ff6b35;
}

/* Register Button */
.register-button {
  width: 100%;
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.register-button:hover {
  background-color: #e55a2b;
}

/* Loading */
.loading-container {
  text-align: center;
  padding: 2rem;
  color: #666;
}

/* Expenses List */
.expenses-list {
  margin-top: 1.5rem;
}

.empty-message {
  text-align: center;
  padding: 3rem 1rem;
  color: #666;
}

/* Expense Group */
.expense-group {
  background-color: #fff;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.group-date {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.group-total {
  font-size: 1.125rem;
  font-weight: 700;
  color: #ff6b35;
}

/* Expenses Table */
.expenses-table {
  overflow-x: auto;
}

.expenses-table table {
  width: 100%;
  border-collapse: collapse;
}

.expenses-table thead {
  background-color: #f8f9fa;
}

.expenses-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  border-bottom: 1px solid #e0e0e0;
}

.expenses-table td {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
}

.expenses-table tbody tr:hover {
  background-color: #f8f9fa;
}

.expenses-table tbody tr:last-child td {
  border-bottom: none;
}

.edit-button {
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.edit-button:hover {
  background-color: #e55a2b;
}

/* Responsive */
@media (min-width: 768px) {
  .expenses-list-container {
    width: 100%;
    max-width: 100%;
  }

  .page-header {
    padding: 1.25rem 2rem;
  }

  .title {
    font-size: 1.5rem;
  }

  .content {
    padding: 2rem;
  }

  .filters-section {
    flex-direction: row;
    align-items: flex-end;
    gap: 1.5rem;
  }

  .form-section {
    flex: 1;
  }

  .register-button-section {
    flex: 0 0 auto;
    min-width: 200px;
  }

  .register-button {
    width: auto;
    min-width: 200px;
  }

  .expenses-table {
    overflow-x: visible;
  }

  .expense-group {
    margin-bottom: 2rem;
  }

  .group-header {
    padding: 1.25rem 2rem;
  }

  .expenses-table th,
  .expenses-table td {
    padding: 1rem 1.5rem;
  }
}

@media (min-width: 1024px) {
  .content {
    padding: 2rem 3rem;
  }

  .filters-section {
    gap: 2rem;
  }

  .form-label {
    font-size: 1rem;
  }

  .form-select,
  .date-input {
    padding: 0.875rem 1rem;
    font-size: 1rem;
  }

  .group-date {
    font-size: 1.125rem;
  }

  .group-total {
    font-size: 1.25rem;
  }

  .expenses-table th {
    font-size: 0.9375rem;
  }

  .expenses-table td {
    font-size: 1rem;
  }
}

@media (min-width: 1280px) {
  .content {
    padding: 2.5rem 4rem;
    max-width: 1600px;
  }

  .filters-section {
    gap: 2.5rem;
  }

  .register-button {
    min-width: 220px;
    padding: 1.125rem 1.5rem;
    font-size: 1.0625rem;
  }
}

/* Global styles to ensure full width */
:global(body),
:global(#app) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>

<style>
body,
#app {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>

