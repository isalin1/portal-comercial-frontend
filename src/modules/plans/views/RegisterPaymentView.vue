<template>
  <div class="register-payment-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Registro de Pagos</h1>
    </header>

    <div class="content">
      <form @submit.prevent="handleSubmit" class="payment-form">
        <!-- Business Selection -->
        <div class="form-section">
          <label class="form-label">Negocio *</label>
          <select v-model="form.businesId" class="form-input" required @change="onBusinessChange">
            <option :value="null">Selecciona un negocio</option>
            <option v-for="business in businesses" :key="business.id" :value="business.id">
              {{ business.name }}
            </option>
          </select>
          <div v-if="selectedBusiness" class="business-preview">
            <p><strong>Estado actual:</strong> 
              <span :class="selectedBusiness.isActive ? 'status-active' : 'status-inactive'">
                {{ selectedBusiness.isActive ? 'ACTIVO' : 'INACTIVO' }}
              </span>
            </p>
            <p v-if="selectedBusiness.activePlan">
              <strong>Plan actual:</strong> {{ selectedBusiness.activePlan.plan?.tipo }} - {{ selectedBusiness.activePlan.plan?.nombrePeriodo }}
            </p>
            <p v-if="selectedBusiness.activePlan">
              <strong>Vigencia hasta:</strong> {{ formatDate(selectedBusiness.activePlan.fechaFin) }}
            </p>
            <p v-if="!selectedBusiness.activePlan" class="no-plan-warning">
              ⚠️ Este negocio no tiene plan activo. Al registrar el pago se activará automáticamente.
            </p>
          </div>
        </div>

        <!-- Plan Selection -->
        <div class="form-section">
          <label class="form-label">Plan *</label>
          <select v-model="form.planId" class="form-input" required @change="onPlanChange">
            <option :value="null">Selecciona un plan</option>
            <option v-for="plan in availablePlans" :key="plan.id" :value="plan.id">
              {{ plan.tipo }} - {{ plan.nombrePeriodo }} ({{ plan.diasPeriodo }} días) - S/ {{ plan.costo || '0.00' }}
            </option>
          </select>
        </div>

        <!-- Amount -->
        <div class="form-section">
          <label class="form-label">Monto *</label>
          <input 
            v-model.number="form.monto" 
            type="number" 
            step="0.01"
            min="0"
            class="form-input" 
            required
            placeholder="0.00"
          >
          <p v-if="selectedPlan" class="form-hint">
            Costo del plan: S/ {{ selectedPlan.costo || '0.00' }}
          </p>
        </div>

        <!-- Payment Date -->
        <div class="form-section">
          <label class="form-label">Fecha de Pago *</label>
          <input 
            v-model="form.fechaPago" 
            type="date" 
            class="form-input" 
            required
            :max="todayString"
          >
        </div>

        <!-- Payment Method -->
        <div class="form-section">
          <label class="form-label">Método de Pago</label>
          <select v-model="form.metodoPago" class="form-input">
            <option value="">Selecciona método</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        <!-- Receipt/Comprobante -->
        <div class="form-section">
          <label class="form-label">Comprobante (URL o referencia)</label>
          <input 
            v-model="form.comprobante" 
            type="text" 
            class="form-input" 
            placeholder="URL o referencia del comprobante"
          >
        </div>

        <!-- Notes -->
        <div class="form-section">
          <label class="form-label">Notas/Observaciones</label>
          <textarea 
            v-model="form.notas" 
            class="form-input" 
            rows="4"
            placeholder="Notas adicionales sobre el pago"
          ></textarea>
        </div>

        <!-- Messages -->
        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="goBack">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? 'Registrando...' : 'Registrar Pago' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  getBusinessData, 
  getPlans, 
  getActiveBusinessPlan,
  createPlanPayment,
  type Plan,
  type BusinessPlan
} from '@/api/lavanderiaApi'

const router = useRouter()
const route = useRoute()

interface Business {
  id: number
  name: string
  isActive: boolean
  activePlan?: BusinessPlan | null
}

const businesses = ref<Business[]>([])
const plans = ref<Plan[]>([])
const submitting = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  businesId: null as number | null,
  planId: null as number | null,
  monto: null as number | null,
  fechaPago: '',
  metodoPago: '',
  comprobante: '',
  notas: ''
})

const todayString = computed(() => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const selectedBusiness = computed(() => {
  if (!form.value.businesId) return null
  return businesses.value.find(b => b.id === form.value.businesId)
})

const selectedPlan = computed(() => {
  if (!form.value.planId) return null
  return plans.value.find(p => p.id === form.value.planId)
})

const availablePlans = computed(() => plans.value)

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

const onBusinessChange = async () => {
  if (form.value.businesId) {
    try {
      loading.value = true
      const businessPlan = await getActiveBusinessPlan(form.value.businesId)
      const business = businesses.value.find(b => b.id === form.value.businesId)
      if (business) {
        business.activePlan = businessPlan
      }
    } catch (error: any) {
      // Si no tiene plan activo, es normal (negocio nuevo)
      const business = businesses.value.find(b => b.id === form.value.businesId)
      if (business) {
        business.activePlan = null
      }
    } finally {
      loading.value = false
    }
  }
}

const onPlanChange = () => {
  if (selectedPlan.value && selectedPlan.value.costo) {
    form.value.monto = selectedPlan.value.costo
  }
}

const loadBusinesses = async () => {
  try {
    loading.value = true
    const data = await getBusinessData()
    businesses.value = data.map((b: any) => ({
      id: b.id,
      name: b.name,
      isActive: b.user?.isActive || false,
      activePlan: null
    }))
    
    // Cargar plan activo para cada negocio
    for (const business of businesses.value) {
      try {
        const activePlan = await getActiveBusinessPlan(business.id)
        business.activePlan = activePlan
      } catch (error) {
        // No tiene plan activo, es normal
        business.activePlan = null
      }
    }
  } catch (error: any) {
    console.error('Error cargando negocios:', error)
    alert(error.response?.data?.message || 'Error al cargar los negocios')
  } finally {
    loading.value = false
  }
}

// Función para ordenar planes: primero por tipo, luego por período (mensual, semestral, anual)
const sortPlans = (plansArray: Plan[]) => {
  const tipoOrder: Record<string, number> = {
    'premium': 1,
    'pro': 2,
    'emprendedor': 3
  }
  
  const periodoOrder: Record<string, number> = {
    'mensual': 1,
    'semestral': 2,
    'anual': 3
  }
  
  return [...plansArray].sort((a, b) => {
    // Primero ordenar por tipo
    const tipoDiff = (tipoOrder[a.tipo] || 999) - (tipoOrder[b.tipo] || 999)
    if (tipoDiff !== 0) return tipoDiff
    
    // Si el tipo es igual, ordenar por período
    return (periodoOrder[a.nombrePeriodo] || 999) - (periodoOrder[b.nombrePeriodo] || 999)
  })
}

const loadPlans = async () => {
  try {
    loading.value = true
    const data = await getPlans()
    // Ordenar los planes: primero por tipo, luego por período
    plans.value = sortPlans(data)
  } catch (error: any) {
    console.error('Error cargando planes:', error)
    alert(error.response?.data?.message || 'Error al cargar los planes')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.value.businesId || !form.value.planId || !form.value.monto || !form.value.fechaPago) {
    errorMessage.value = 'Por favor completa todos los campos requeridos'
    return
  }

  if (selectedPlan.value && selectedPlan.value.costo && form.value.monto !== selectedPlan.value.costo) {
    if (!confirm(`El monto ingresado (S/ ${form.value.monto}) no coincide con el costo del plan (S/ ${selectedPlan.value.costo}). ¿Deseas continuar?`)) {
      return
    }
  }

  try {
    submitting.value = true
    
    await createPlanPayment({
      businesId: form.value.businesId!,
      planId: form.value.planId!,
      monto: form.value.monto!,
      fechaPago: form.value.fechaPago,
      metodoPago: form.value.metodoPago || undefined,
      comprobante: form.value.comprobante || undefined,
      notas: form.value.notas || undefined
    })
    
    successMessage.value = 'Pago registrado exitosamente. El negocio ha sido activado/renovado.'
    
    setTimeout(() => {
      router.push({ name: 'plans-main' })
    }, 2000)
  } catch (error: any) {
    console.error('Error registrando pago:', error)
    errorMessage.value = error.response?.data?.message || 'Error al registrar el pago'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  form.value.fechaPago = todayString.value
  
  // Si viene businessId en query params, preseleccionarlo
  const businessIdParam = route.query.businessId as string
  if (businessIdParam) {
    form.value.businesId = parseInt(businessIdParam, 10)
  }
  
  loadBusinesses()
  loadPlans()
  
  // Si hay businessId preseleccionado, cargar su plan activo
  if (form.value.businesId) {
    onBusinessChange()
  }
})
</script>

<style scoped>
.register-payment-container {
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
  max-width: 100%;
  margin: 0 auto;
  width: 100%;
}

.payment-form {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.form-section {
  margin-bottom: 24px;
}

.form-label {
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

.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.business-preview {
  margin-top: 12px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
}

.business-preview p {
  margin: 4px 0;
}

.status-active {
  color: #28a745;
  font-weight: 600;
}

.status-inactive {
  color: #dc3545;
  font-weight: 600;
}

.no-plan-warning {
  color: #ffc107;
  font-weight: 500;
  margin-top: 8px !important;
}

.alert {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.alert-error {
  background-color: #fee;
  color: #c33;
  border: 1px solid #fcc;
}

.alert-success {
  background-color: #efe;
  color: #3c3;
  border: 1px solid #cfc;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #ff6b35;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #e55a2b;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

@media (min-width: 768px) {
  .register-payment-container {
    padding: 32px;
  }

  .content {
    max-width: 900px;
    margin: 0 auto;
  }

  .payment-form {
    padding: 40px;
  }

  .form-section {
    margin-bottom: 28px;
  }

  .form-label {
    font-size: 15px;
    margin-bottom: 10px;
  }

  .form-input {
    padding: 12px;
    font-size: 15px;
  }
}

@media (min-width: 1024px) {
  .register-payment-container {
    padding: 40px 48px;
  }

  .content {
    max-width: 1000px;
  }

  .payment-form {
    padding: 48px;
  }

  .title {
    font-size: 32px;
  }

  .form-section {
    margin-bottom: 32px;
  }
}

@media (min-width: 1280px) {
  .register-payment-container {
    padding: 48px 64px;
  }

  .content {
    max-width: 1100px;
  }

  .payment-form {
    padding: 56px;
  }

  .form-section {
    margin-bottom: 36px;
  }

  .form-label {
    font-size: 16px;
  }

  .form-input {
    padding: 14px;
    font-size: 16px;
  }
}

@media (min-width: 1536px) {
  .register-payment-container {
    padding: 56px 80px;
  }

  .content {
    max-width: 1200px;
  }

  .payment-form {
    padding: 64px;
  }
}
</style>

<style>
/* Override global body styles for full width on desktop */
body:has(.register-payment-container) {
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

#app:has(.register-payment-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.register-payment-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}
</style>

