<template>
  <div class="expenses-register-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">{{ isEditing ? 'Editar Gasto' : 'Registro de Gastos' }}</h1>
    </header>

    <!-- Content -->
    <div class="content">
      <!-- Loading State -->
      <div v-if="loadingExpense" class="loading-container">
        <p>Cargando gasto...</p>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="expense-form">
        <!-- Punto de Venta -->
        <div class="form-group">
          <label for="pointsale" class="form-label">Punto de Venta *</label>
          <select 
            id="pointsale"
            v-model="form.pointsaleId" 
            class="form-select"
            required
            disabled
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
          <p class="field-info">Este campo fue seleccionado previamente y no puede ser modificado</p>
        </div>

        <!-- Día -->
        <div class="form-group">
          <label for="date" class="form-label">Día *</label>
          <input 
            id="date"
            v-model="form.date"
            type="date"
            class="form-input"
            required
            disabled
            :max="todayString"
            @change="validateDate"
          >
          <p class="field-info">Este campo fue seleccionado previamente y no puede ser modificado</p>
        </div>

        <!-- Destinatario -->
        <div class="form-group">
          <label for="recipient" class="form-label">Destinatario *</label>
          <input 
            id="recipient"
            v-model="form.recipient"
            type="text"
            class="form-input"
            placeholder="Ejem: Juan Perez"
            required
          >
        </div>

        <!-- Concepto -->
        <div class="form-group">
          <label for="concept" class="form-label">Concepto *</label>
          <input 
            id="concept"
            v-model="form.concept"
            type="text"
            class="form-input"
            placeholder="Ejem: Movilidad, Almuerzo, Internet, etc."
            required
          >
        </div>

        <!-- Monto -->
        <div class="form-group">
          <label for="amount" class="form-label">Monto *</label>
          <input 
            id="amount"
            v-model.number="form.amount"
            type="number"
            step="0.01"
            min="0"
            class="form-input"
            placeholder="0.00"
            required
          >
          <div class="amount-display" v-if="form.amount > 0">
            S/. {{ formatPrice(form.amount) }}
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <!-- Mensaje de cuadre aprobado -->
        <div v-if="isCashBalanceApprovedForDate" class="warning-message">
          <p>⚠️ El cuadre de caja para esta fecha ya está aprobado. No se pueden modificar los gastos.</p>
          <p>Contacte a un administrador para reactivar el cuadre si necesita hacer cambios.</p>
        </div>

        <!-- Submit Button -->
        <button 
          type="submit" 
          class="submit-button"
          :disabled="saving || isCashBalanceApprovedForDate"
        >
          {{ saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { getAllPointSales, getBusinessData, createExpense, getExpenseById, updateExpense } from '@/api/lavanderiaApi'
import { isCashBalanceApproved } from '@/utils/cashBalance'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Data
const form = ref({
  pointsaleId: null as number | null,
  date: '',
  recipient: '',
  concept: '',
  amount: 0
})

const loadingPointSales = ref(false)
const loadingExpense = ref(false)
const availablePointSales = ref<any[]>([])
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const expenseId = ref<number | null>(null)
const isEditing = computed(() => expenseId.value !== null)

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

// Verificar si el cuadre está aprobado
const isCashBalanceApprovedForDate = computed(() => {
  if (!form.value.pointsaleId || !form.value.date) return false
  return isCashBalanceApproved(form.value.pointsaleId, form.value.date)
})

// Methods
const goBack = () => {
  router.push({ name: 'expenses-list' })
}

const formatPrice = (price: number) => {
  if (!price) return '0.00'
  return Number(price).toFixed(2)
}

const loadPointSales = async () => {
  loadingPointSales.value = true
  try {
    if (userRole.value === 'SUPERADMIN') {
      // Para SUPERADMIN, cargar todos los puntos de venta
      const data = await getAllPointSales()
      availablePointSales.value = data
    } else if (userRole.value === 'ADMIN') {
      // Para ADMIN, cargar puntos de venta del negocio
      const businessData = await getBusinessData()
      if (businessData && businessData.length > 0) {
        const businessId = businessData[0].id
        const data = await getAllPointSales()
        availablePointSales.value = data.filter((ps: any) => ps.businesId === businessId)
      }
    } else if (userRole.value === 'COLABORADOR') {
      // Para COLABORADOR, cargar solo su punto de venta asignado
      const data = await getAllPointSales()
      const userId = authStore.user?.id
      const userPointSale = data.find((ps: any) => ps.userId === userId)
      if (userPointSale) {
        availablePointSales.value = [userPointSale]
        form.value.pointsaleId = userPointSale.id
      }
    }
  } catch (error) {
    console.error('Error cargando puntos de venta:', error)
    errorMessage.value = 'Error al cargar los puntos de venta'
  } finally {
    loadingPointSales.value = false
  }
}

const validateDate = () => {
  if (form.value.date && form.value.date > todayString.value) {
    errorMessage.value = 'No se pueden registrar gastos con fechas futuras'
    form.value.date = todayString.value
    return false
  }
  return true
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  
  // Verificar si el cuadre está aprobado
  if (isCashBalanceApprovedForDate.value) {
    errorMessage.value = 'El cuadre de caja para esta fecha ya está aprobado. No se pueden modificar los gastos. Contacte a un administrador para reactivar el cuadre.'
    return
  }
  
  // Validar que la fecha no sea mayor a hoy
  if (!validateDate()) {
    return
  }

  if (form.value.date && form.value.date > todayString.value) {
    errorMessage.value = 'No se pueden registrar gastos con fechas futuras. La fecha máxima permitida es hoy.'
    return
  }
  
  // Validar campos requeridos (punto de venta y fecha ya vienen preestablecidos)
  if (!form.value.recipient || !form.value.recipient.trim()) {
    errorMessage.value = 'Por favor ingresa el destinatario'
    return
  }

  if (!form.value.concept || !form.value.concept.trim()) {
    errorMessage.value = 'Por favor ingresa el concepto'
    return
  }

  if (!form.value.amount || form.value.amount <= 0) {
    errorMessage.value = 'Por favor ingresa un monto válido'
    return
  }

  saving.value = true

  try {
    const payload = {
      pointsaleId: form.value.pointsaleId!,
      date: form.value.date,
      recipient: form.value.recipient.trim(),
      concept: form.value.concept.trim(),
      amount: form.value.amount
    }

    if (isEditing.value && expenseId.value) {
      // Actualizar gasto existente
      console.log('🔄 Actualizando gasto:', expenseId.value, payload)
      await updateExpense(expenseId.value, payload)
      console.log('✅ Gasto actualizado exitosamente')
      successMessage.value = 'Gasto actualizado exitosamente'
    } else {
      // Crear nuevo gasto
      console.log('🔄 Guardando gasto:', payload)
      await createExpense(payload)
      console.log('✅ Gasto registrado exitosamente')
      successMessage.value = 'Gasto registrado exitosamente'
    }
    
    // Navegar a la lista después de mostrar el mensaje de éxito con los parámetros del gasto guardado
    setTimeout(() => {
      router.push({ 
        name: 'expenses-list',
        query: {
          pointsaleId: form.value.pointsaleId?.toString(),
          date: form.value.date
        }
      })
    }, 1500)

  } catch (error: any) {
    console.error('Error guardando gasto:', error)
    errorMessage.value = error.response?.data?.message || `Error al ${isEditing.value ? 'actualizar' : 'guardar'} el gasto. Por favor intenta nuevamente.`
  } finally {
    saving.value = false
  }
}

const loadExpense = async (id: number) => {
  loadingExpense.value = true
  try {
    const expense = await getExpenseById(id)
    console.log('📥 Gasto cargado:', expense)
    
    // Formatear la fecha si viene como objeto Date o string ISO
    let dateString = ''
    if (expense.date) {
      if (typeof expense.date === 'string') {
        dateString = expense.date.split('T')[0]
      } else if (expense.date instanceof Date) {
        dateString = expense.date.toISOString().split('T')[0]
      }
    }
    
    form.value = {
      pointsaleId: expense.pointsaleId,
      date: dateString,
      recipient: expense.recipient || '',
      concept: expense.concept || '',
      amount: Number(expense.amount) || 0
    }
  } catch (error: any) {
    console.error('Error cargando gasto:', error)
    errorMessage.value = 'Error al cargar el gasto. Por favor intenta nuevamente.'
    setTimeout(() => {
      router.push({ name: 'expenses-list' })
    }, 2000)
  } finally {
    loadingExpense.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Leer parámetros de la URL
  const idParam = route.query.id as string
  const pointsaleIdParam = route.query.pointsaleId as string
  const dateParam = route.query.date as string

  // Si hay un ID, estamos editando
  if (idParam) {
    expenseId.value = parseInt(idParam, 10)
    // Cargar puntos de venta primero
    await loadPointSales()
    // Cargar el gasto existente
    await loadExpense(expenseId.value)
    return
  }

  // Si no hay ID, estamos creando un nuevo gasto
  // Validar que los parámetros requeridos estén presentes
  if (!pointsaleIdParam || !dateParam) {
    alert('Debes seleccionar un punto de venta y una fecha antes de registrar gastos')
    router.push({ name: 'expenses-list' })
    return
  }

  // Cargar puntos de venta primero
  await loadPointSales()

  // Establecer valores del formulario desde los parámetros
  form.value.pointsaleId = parseInt(pointsaleIdParam, 10)
  form.value.date = dateParam

  // Validar que el punto de venta existe en la lista disponible
  const selectedPointSale = availablePointSales.value.find(ps => ps.id === form.value.pointsaleId)
  if (!selectedPointSale) {
    alert('El punto de venta seleccionado no es válido')
    router.push({ name: 'expenses-list' })
    return
  }
})
</script>

<style scoped>
.expenses-register-container {
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
  padding: 1.5rem 1rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* Form */
.expense-form {
  background-color: #fff;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Form Group */
.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

/* Form Input */
.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  background-color: #fff;
  font-size: 1rem;
  color: #333;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.form-input::placeholder {
  color: #999;
}

.form-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #666;
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
  padding-right: 2.5rem;
}

.form-select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #666;
}

/* Field Info */
.field-info {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #666;
  font-style: italic;
}

/* Amount Display */
.amount-display {
  margin-top: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #ff6b35;
}

/* Messages */
.error-message {
  background-color: #fee;
  color: #c33;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  border: 1px solid #fcc;
}

.success-message {
  background-color: #efe;
  color: #3c3;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  border: 1px solid #cfc;
}

.warning-message {
  background-color: #fff3cd;
  color: #856404;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  border: 1px solid #ffc107;
}

.warning-message p {
  margin: 0.25rem 0;
}

.warning-message p:first-child {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

/* Loading */
.loading-container {
  background-color: #fff;
  border-radius: 0.75rem;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.loading-container p {
  color: #666;
  font-size: 1rem;
}

/* Submit Button */
.submit-button {
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
  margin-top: 1rem;
}

.submit-button:hover:not(:disabled) {
  background-color: #e55a2b;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Responsive */
@media (min-width: 768px) {
  .expenses-register-container {
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

  .expense-form {
    padding: 2rem;
  }

  .form-group {
    margin-bottom: 2rem;
  }

  .form-label {
    font-size: 1rem;
  }

  .form-input,
  .form-select {
    padding: 0.875rem 1rem;
    font-size: 1rem;
  }

  .submit-button {
    padding: 1.125rem;
    font-size: 1.0625rem;
  }
}

@media (min-width: 1024px) {
  .content {
    padding: 2.5rem;
    max-width: 900px;
  }

  .expense-form {
    padding: 2.5rem;
  }

  .form-group {
    margin-bottom: 2.25rem;
  }
}

@media (min-width: 1280px) {
  .content {
    padding: 3rem;
    max-width: 1000px;
  }

  .expense-form {
    padding: 3rem;
  }
}

/* Global styles to ensure full width */
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
