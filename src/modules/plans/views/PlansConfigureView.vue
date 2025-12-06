<template>
  <div class="plans-configure-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Configuración de Planes</h1>
    </header>

    <div class="content">
      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" @click="showAddPlanModal = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Agregar Plan
        </button>
        <button class="btn-success" @click="saveAllChanges" :disabled="!hasChanges || loading">
          {{ loading ? 'Guardando...' : 'Guardar Todos los Cambios' }}
        </button>
      </div>

      <!-- Plans Table (Desktop) -->
      <div v-if="loading && plans.length === 0" class="loading-state">
        <p>Cargando planes...</p>
      </div>
      <div v-else>
        <!-- Desktop Table View -->
        <div class="table-container desktop-view">
          <table class="plans-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Nombre Período</th>
                <th>Días Período</th>
                <th>Costo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="plan in plans" :key="plan.id">
                <td>{{ plan.id }}</td>
                <td>
                  <select v-model="plan.tipo" class="inline-select" @change="onTypeChange(plan)">
                    <option 
                      value="premium"
                      :disabled="isTypeOptionDisabled(plan.id, 'premium', plan.nombrePeriodo)"
                    >
                      Premium
                    </option>
                    <option 
                      value="pro"
                      :disabled="isTypeOptionDisabled(plan.id, 'pro', plan.nombrePeriodo)"
                    >
                      Pro
                    </option>
                    <option 
                      value="emprendedor"
                      :disabled="isTypeOptionDisabled(plan.id, 'emprendedor', plan.nombrePeriodo)"
                    >
                      Emprendedor
                    </option>
                  </select>
                </td>
                <td>
                  <select v-model="plan.nombrePeriodo" class="inline-select" @change="onPeriodChange(plan)">
                    <option 
                      value="mensual"
                      :disabled="isPeriodOptionDisabled(plan.id, 'mensual', plan.tipo)"
                    >
                      Mensual
                    </option>
                    <option 
                      value="semestral"
                      :disabled="isPeriodOptionDisabled(plan.id, 'semestral', plan.tipo)"
                    >
                      Semestral
                    </option>
                    <option 
                      value="anual"
                      :disabled="isPeriodOptionDisabled(plan.id, 'anual', plan.tipo)"
                    >
                      Anual
                    </option>
                  </select>
                </td>
                <td>
                  <input 
                    v-model.number="plan.diasPeriodo" 
                    type="number" 
                    class="inline-input"
                    min="1"
                    readonly
                    disabled
                    style="background-color: #f0f0f0; cursor: not-allowed;"
                  >
                </td>
                <td>
                  <input 
                    v-model.number="plan.costo" 
                    type="number" 
                    class="inline-input"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    @change="markAsChanged(plan.id)"
                  >
                </td>
                <td>
                  <button class="btn-danger-small" @click="deletePlan(plan.id)" :disabled="loading">
                    Eliminar
                  </button>
                </td>
              </tr>
              <tr v-if="plans.length === 0 && !loading">
                <td colspan="6" class="empty-state">No hay planes registrados</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards View -->
        <div class="cards-container mobile-view">
          <div v-for="plan in plans" :key="plan.id" class="plan-card">
            <div class="card-header">
              <span class="card-id">ID: {{ plan.id }}</span>
              <button class="btn-danger-small" @click="deletePlan(plan.id)" :disabled="loading">
                Eliminar
              </button>
            </div>
            <div class="card-body">
              <div class="card-field">
                <label>Tipo</label>
                <select v-model="plan.tipo" class="card-select" @change="onTypeChange(plan)">
                  <option 
                    value="premium"
                    :disabled="isTypeOptionDisabled(plan.id, 'premium', plan.nombrePeriodo)"
                  >
                    Premium
                  </option>
                  <option 
                    value="pro"
                    :disabled="isTypeOptionDisabled(plan.id, 'pro', plan.nombrePeriodo)"
                  >
                    Pro
                  </option>
                  <option 
                    value="emprendedor"
                    :disabled="isTypeOptionDisabled(plan.id, 'emprendedor', plan.nombrePeriodo)"
                  >
                    Emprendedor
                  </option>
                </select>
              </div>
              <div class="card-field">
                <label>Nombre Período</label>
                <select v-model="plan.nombrePeriodo" class="card-select" @change="onPeriodChange(plan)">
                  <option 
                    value="mensual"
                    :disabled="isPeriodOptionDisabled(plan.id, 'mensual', plan.tipo)"
                  >
                    Mensual
                  </option>
                  <option 
                    value="semestral"
                    :disabled="isPeriodOptionDisabled(plan.id, 'semestral', plan.tipo)"
                  >
                    Semestral
                  </option>
                  <option 
                    value="anual"
                    :disabled="isPeriodOptionDisabled(plan.id, 'anual', plan.tipo)"
                  >
                    Anual
                  </option>
                </select>
              </div>
              <div class="card-field">
                <label>Días Período</label>
                <input 
                  v-model.number="plan.diasPeriodo" 
                  type="number" 
                  class="card-input"
                  min="1"
                  readonly
                  disabled
                >
                <small class="card-hint">Calculado automáticamente</small>
              </div>
              <div class="card-field">
                <label>Costo</label>
                <input 
                  v-model.number="plan.costo" 
                  type="number" 
                  class="card-input"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  @change="markAsChanged(plan.id)"
                >
              </div>
            </div>
          </div>
          <div v-if="plans.length === 0 && !loading" class="empty-state-card">
            <p>No hay planes registrados</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Plan Modal -->
    <div v-if="showAddPlanModal" class="modal-overlay" @click="showAddPlanModal = false">
      <div class="modal-content" @click.stop>
        <h2>Agregar Nuevo Plan</h2>
        <form @submit.prevent="addNewPlan">
          <div class="form-group">
            <label>Tipo</label>
            <select v-model="newPlan.tipo" @change="onTypeChange(newPlan, true)" required>
              <option 
                value="premium"
                :disabled="isNewPlanTypeDisabled('premium')"
              >
                Premium
              </option>
              <option 
                value="pro"
                :disabled="isNewPlanTypeDisabled('pro')"
              >
                Pro
              </option>
              <option 
                value="emprendedor"
                :disabled="isNewPlanTypeDisabled('emprendedor')"
              >
                Emprendedor
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Nombre Período</label>
            <select v-model="newPlan.nombrePeriodo" @change="onPeriodChange(newPlan, true)" required>
              <option 
                value="mensual"
                :disabled="isNewPlanPeriodDisabled(newPlan.tipo, 'mensual')"
              >
                Mensual
              </option>
              <option 
                value="semestral"
                :disabled="isNewPlanPeriodDisabled(newPlan.tipo, 'semestral')"
              >
                Semestral
              </option>
              <option 
                value="anual"
                :disabled="isNewPlanPeriodDisabled(newPlan.tipo, 'anual')"
              >
                Anual
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Días Período</label>
            <input 
              v-model.number="newPlan.diasPeriodo" 
              type="number" 
              min="1" 
              readonly
              disabled
              required
              style="background-color: #f0f0f0; cursor: not-allowed;"
            >
            <small style="color: #666; font-size: 12px; display: block; margin-top: 4px;">
              Se calcula automáticamente según el período seleccionado
            </small>
          </div>
          <div class="form-group">
            <label>Costo</label>
            <input v-model.number="newPlan.costo" type="number" step="0.01" min="0" required>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showAddPlanModal = false" :disabled="loading">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Agregando...' : 'Agregar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPlans, createPlan, updatePlan, deletePlan as deletePlanApi, type Plan } from '@/api/lavanderiaApi'

const router = useRouter()

const plans = ref<Plan[]>([])
const changedPlans = ref<Set<number>>(new Set())
const showAddPlanModal = ref(false)
const loading = ref(false)
const newPlan = ref({
  tipo: 'premium',
  nombrePeriodo: 'mensual',
  diasPeriodo: 30,
  costo: 0
})

// Función para calcular días según el período
const calculateDays = (nombrePeriodo: string): number => {
  const daysMap: Record<string, number> = {
    'mensual': 30,
    'semestral': 180,
    'anual': 360
  }
  return daysMap[nombrePeriodo] || 30
}

// Watcher para actualizar días cuando cambia el período
const onPeriodChange = (plan: any, isNewPlan: boolean = false) => {
  const days = calculateDays(plan.nombrePeriodo)
  if (isNewPlan) {
    newPlan.value.diasPeriodo = days
    // No validar aquí, solo actualizar días
  } else {
    plan.diasPeriodo = days
    markAsChanged(plan.id)
    // No validar aquí, permitir cambiar libremente
  }
}

// Watcher para cuando cambia el tipo
const onTypeChange = (plan: any, isNewPlan: boolean = false) => {
  if (isNewPlan) {
    // No validar aquí, permitir cambiar libremente
  } else {
    markAsChanged(plan.id)
    // No validar aquí, permitir cambiar libremente
  }
}

const hasChanges = computed(() => changedPlans.value.size > 0)

// Función para verificar si una combinación tipo + nombrePeriodo ya existe
const isCombinationTaken = (tipo: string, nombrePeriodo: string, excludeId?: number): boolean => {
  return plans.value.some(plan => 
    plan.tipo === tipo && 
    plan.nombrePeriodo === nombrePeriodo &&
    plan.id !== excludeId
  )
}

// Función para verificar si un tipo tiene todos los períodos completos
const hasAllPeriods = (tipo: string): boolean => {
  const periods = ['mensual', 'semestral', 'anual']
  return periods.every(period => 
    plans.value.some(plan => plan.tipo === tipo && plan.nombrePeriodo === period)
  )
}

// Función para verificar si una opción de tipo debe estar deshabilitada en un plan específico
// Ahora recibe el período actual para evaluar la combinación completa
const isTypeOptionDisabled = (planId: number, tipo: string, nombrePeriodo: string): boolean => {
  const currentPlan = plans.value.find(p => p.id === planId)
  if (!currentPlan) return false
  
  // Si es el tipo actual del plan, no deshabilitar
  if (currentPlan.tipo === tipo) {
    return false
  }
  
  // Deshabilitar solo si ese tipo ya tiene los 3 períodos completos
  if (hasAllPeriods(tipo)) {
    return true
  }
  
  // Verificar si la combinación específica (tipo + período actual) ya existe
  return isCombinationTaken(tipo, nombrePeriodo, planId)
}

// Función para verificar si una opción de período debe estar deshabilitada en un plan específico
// Ahora recibe el tipo actual para evaluar la combinación completa
const isPeriodOptionDisabled = (planId: number, nombrePeriodo: string, tipo: string): boolean => {
  const currentPlan = plans.value.find(p => p.id === planId)
  if (!currentPlan) return false
  
  // Si es el período actual del plan, no deshabilitar
  if (currentPlan.nombrePeriodo === nombrePeriodo) {
    return false
  }
  
  // Verificar si la combinación específica (tipo actual + período) ya existe
  return isCombinationTaken(tipo, nombrePeriodo, planId)
}

// Función para verificar si una opción de tipo está disponible para el nuevo plan
const isNewPlanTypeDisabled = (tipo: string): boolean => {
  // Deshabilitar solo si ese tipo ya tiene los 3 períodos completos
  return hasAllPeriods(tipo)
}

// Función para verificar si una opción de período está disponible para el nuevo plan
// Esta función se llama con el tipo y período actuales del formulario
const isNewPlanPeriodDisabled = (tipo: string, nombrePeriodo: string): boolean => {
  // Deshabilitar solo si ya existe esa combinación específica
  return isCombinationTaken(tipo, nombrePeriodo)
}

const goBack = () => {
  router.push({ name: 'plans-main' })
}

const markAsChanged = (planId: number) => {
  changedPlans.value.add(planId)
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
    const mappedPlans = data.map((plan: any) => {
      // Asegurar que los días coincidan con el período
      const correctDays = calculateDays(plan.nombrePeriodo)
      return {
        id: plan.id,
        tipo: plan.tipo,
        nombrePeriodo: plan.nombrePeriodo,
        diasPeriodo: correctDays, // Usar los días correctos según el período
        costo: plan.costo
      }
    })
    
    // Ordenar los planes: primero por tipo, luego por período
    plans.value = sortPlans(mappedPlans)
  } catch (error: any) {
    console.error('Error cargando planes:', error)
    alert(error.response?.data?.message || 'Error al cargar los planes')
  } finally {
    loading.value = false
  }
}

const saveAllChanges = async () => {
  if (!hasChanges.value) {
    alert('No hay cambios para guardar')
    return
  }

  try {
    loading.value = true
    const plansToUpdate = plans.value.filter(p => changedPlans.value.has(p.id))
    
    for (const plan of plansToUpdate) {
      // Validar que no exista otra combinación igual
      if (isCombinationTaken(plan.tipo, plan.nombrePeriodo, plan.id)) {
        alert(`No se puede guardar el plan ID ${plan.id}: Ya existe otro plan con tipo "${plan.tipo}" y período "${plan.nombrePeriodo}".`)
        continue
      }
      
      // Asegurar que los días sean correctos según el período
      const correctDays = calculateDays(plan.nombrePeriodo)
      await updatePlan(plan.id, {
        tipo: plan.tipo,
        nombrePeriodo: plan.nombrePeriodo,
        diasPeriodo: correctDays,
        costo: plan.costo
      })
    }
    
    alert(`Se guardaron ${plansToUpdate.length} plan(es) exitosamente`)
    changedPlans.value.clear()
    await loadPlans()
  } catch (error: any) {
    console.error('Error guardando planes:', error)
    alert(error.response?.data?.message || 'Error al guardar los cambios')
  } finally {
    loading.value = false
  }
}

const addNewPlan = async () => {
  // Validar que no exista ya esta combinación (validación final antes de guardar)
  if (isCombinationTaken(newPlan.value.tipo, newPlan.value.nombrePeriodo)) {
    alert(`Ya existe un plan con tipo "${newPlan.value.tipo}" y período "${newPlan.value.nombrePeriodo}". Por favor, selecciona otra combinación.`)
    return
  }

  // Validar que el tipo no tenga todos los períodos completos
  if (hasAllPeriods(newPlan.value.tipo)) {
    alert(`El tipo "${newPlan.value.tipo}" ya tiene todos los períodos configurados (Mensual, Semestral y Anual). No se pueden agregar más planes de este tipo.`)
    return
  }

  try {
    loading.value = true
    // Asegurar que los días sean correctos antes de enviar
    const correctDays = calculateDays(newPlan.value.nombrePeriodo)
    const created = await createPlan({
      tipo: newPlan.value.tipo,
      nombrePeriodo: newPlan.value.nombrePeriodo,
      diasPeriodo: correctDays,
      costo: newPlan.value.costo || null
    })
    
    // Agregar el nuevo plan y reordenar
    const newPlanData = {
      id: created.id,
      tipo: created.tipo,
      nombrePeriodo: created.nombrePeriodo,
      diasPeriodo: correctDays,
      costo: created.costo
    }
    plans.value.push(newPlanData)
    plans.value = sortPlans(plans.value)
    
    showAddPlanModal.value = false
    newPlan.value = {
      tipo: 'premium',
      nombrePeriodo: 'mensual',
      diasPeriodo: 30,
      costo: 0
    }
    alert('Plan agregado exitosamente')
  } catch (error: any) {
    console.error('Error agregando plan:', error)
    alert(error.response?.data?.message || 'Error al agregar el plan')
  } finally {
    loading.value = false
  }
}

const deletePlan = async (planId: number) => {
  if (!confirm('¿Estás seguro de eliminar este plan? Esta acción no se puede deshacer.')) {
    return
  }
  
  try {
    loading.value = true
    await deletePlanApi(planId)
    
    plans.value = plans.value.filter(p => p.id !== planId)
    changedPlans.value.delete(planId)
    alert('Plan eliminado exitosamente')
  } catch (error: any) {
    console.error('Error eliminando plan:', error)
    alert(error.response?.data?.message || 'Error al eliminar el plan')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPlans()
})
</script>

<style scoped>
.plans-configure-container {
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
  margin: 0 auto;
  box-sizing: border-box;
}

@media (min-width: 768px) {
  .content {
    max-width: 100%;
    width: 100%;
    padding: 0;
  }
}

@media (min-width: 1024px) {
  .plans-configure-container {
    padding: 32px 48px;
  }
}

@media (min-width: 1280px) {
  .plans-configure-container {
    padding: 40px 64px;
  }
}

@media (min-width: 1536px) {
  .plans-configure-container {
    padding: 48px 80px;
  }
}

.actions-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.btn-primary, .btn-success, .btn-secondary, .btn-danger-small {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #ff6b35;
  color: white;
}

.btn-primary:hover {
  background-color: #e55a2b;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #218838;
}

.btn-success:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger-small {
  background-color: #dc3545;
  color: white;
  padding: 6px 12px;
  font-size: 14px;
}

.btn-danger-small:hover {
  background-color: #c82333;
}

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 768px) {
  .table-container {
    width: 100%;
    max-width: 100%;
    margin: 0;
  }
}

.plans-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

@media (min-width: 768px) {
  .plans-table {
    width: 100%;
    table-layout: fixed;
  }
  
  .plans-table th,
  .plans-table td {
    padding: 16px 20px;
  }
  
  .plans-table th:first-child,
  .plans-table td:first-child {
    width: 5%;
    text-align: center;
  }
  
  .plans-table th:nth-child(2),
  .plans-table td:nth-child(2) {
    width: 18%;
  }
  
  .plans-table th:nth-child(3),
  .plans-table td:nth-child(3) {
    width: 18%;
  }
  
  .plans-table th:nth-child(4),
  .plans-table td:nth-child(4) {
    width: 15%;
  }
  
  .plans-table th:nth-child(5),
  .plans-table td:nth-child(5) {
    width: 18%;
  }
  
  .plans-table th:last-child,
  .plans-table td:last-child {
    width: 16%;
    text-align: center;
  }
}

@media (min-width: 1024px) {
  .plans-table th,
  .plans-table td {
    padding: 18px 24px;
  }
}

@media (min-width: 1280px) {
  .plans-table th,
  .plans-table td {
    padding: 20px 28px;
  }
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

.inline-select, .inline-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.inline-select option:disabled,
select option:disabled {
  background-color: #f0f0f0;
  color: #999;
  font-style: italic;
  cursor: not-allowed;
}

.inline-input {
  min-width: 100px;
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
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 32px;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin: 0 0 24px 0;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group select option:disabled {
  background-color: #f0f0f0;
  color: #999;
  font-style: italic;
  cursor: not-allowed;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* Mobile Cards View */
.mobile-view {
  display: block;
}

.desktop-view {
  display: none;
}

.cards-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e5e5;
}

.card-id {
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-field label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.card-select,
.card-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
}

.card-input:disabled {
  background-color: #f0f0f0;
  cursor: not-allowed;
  color: #666;
}

.card-hint {
  font-size: 12px;
  color: #999;
  font-style: italic;
  margin-top: -4px;
}

.empty-state-card {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-select option:disabled {
  background-color: #f0f0f0;
  color: #999;
  font-style: italic;
  cursor: not-allowed;
}

/* Desktop Table View */
@media (min-width: 768px) {
  .plans-configure-container {
    padding: 32px;
    width: 100%;
    max-width: 100%;
  }

  .mobile-view {
    display: none;
  }

  .desktop-view {
    display: block;
  }
}

/* Asegurar que no haya restricciones de ancho */
.plans-configure-container :deep(*) {
  max-width: none;
}

@media (min-width: 1024px) {
  .plans-configure-container {
    padding: 32px 48px;
  }
}

@media (min-width: 1280px) {
  .plans-configure-container {
    padding: 40px 64px;
  }
}

@media (min-width: 1536px) {
  .plans-configure-container {
    padding: 48px 80px;
  }
}
</style>

<style>
/* Override global body styles for full width on desktop */
body:has(.plans-configure-container) {
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

#app:has(.plans-configure-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.plans-configure-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}
</style>

