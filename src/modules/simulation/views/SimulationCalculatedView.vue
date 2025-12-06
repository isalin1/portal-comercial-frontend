<template>
  <div class="simulation-calculated-container">
    <header class="header">
      <button class="back-btn" @click="goBack">‹</button>
      <span class="title">Simulación Financiera</span>
    </header>

    <h2 class="subtitle">Simulación Calculada</h2>

    <div v-if="resultados">
      <div class="row">
        <div class="field">
          <label>TEM (mensual)</label>
          <input class="readonly-input" :value="resultados.tem" readonly />
        </div>
        <div class="field">
          <label>TEA</label>
          <input class="readonly-input" :value="resultados.tea" readonly />
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label>Valor Lote</label>
          <input class="readonly-input" :value="resultados.valorLote" readonly />
        </div>
        <div class="field">
          <label>Cuota inicial</label>
          <input class="readonly-input" :value="resultados.initialquote" readonly />
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label>Monto a Financiar</label>
          <input class="readonly-input" :value="resultados.montoFinanciar" readonly />
        </div>
        <div class="field">
          <label># Cuotas</label>
          <input class="readonly-input" :value="resultados.numquotas" readonly />
        </div>
      </div>

      <div class="field">
        <label>Total a pagar crédito</label>
        <input class="readonly-input" :value="resultados.totalPagarCredito" readonly />
      </div>

      <div class="field">
        <label>Interés generado</label>
        <input class="readonly-input" :value="resultados.interesGenerado" readonly />
      </div>

      <div class="field">
        <label>Precio Venta</label>
        <input class="readonly-input" :value="resultados.ventaFinal" readonly />
      </div>

      <div class="row">
        <div class="field">
          <label>Valor cuotas</label>
          <input class="readonly-input" :value="resultados.cuotaBase" readonly />
        </div>
        <div class="field">
          <label>Valor ult. cuota</label>
          <input class="readonly-input" :value="resultados.ultimaCuota" readonly />
        </div>
      </div>

      <div class="button-row">
        <button class="btn recalc-btn" @click="handleRecalcular">Recalcular</button>
        <button class="btn save-btn" @click="handleGuardar">Guardar</button>
      </div>
    </div>
    <div v-else>
      <p>No hay resultados de simulación. Por favor, completa el formulario primero.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSimulationStore } from '../stores/simulation.store'
import {
  guardarSimulacion,
  guardarCotizacion,
  getFormQuotationBySimulationId,
  crearCliente,
} from '@/api/lavanderiaApi'
import { computed } from 'vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const simulationStore = useSimulationStore()
const authStore = useAuthStore()
const resultados = computed(() => simulationStore.resultados)

function goBack() {
  router.back()
}

function handleRecalcular() {
  router.push({ name: 'simulacion-financiera' })
}

async function handleGuardar() {
  if (!resultados.value) {
    alert('No hay resultados de simulación para guardar.')
    return
  }
  // 1. Validar teaId antes de guardar
  console.log('formData antes de guardar:', simulationStore.formData)
  if (!simulationStore.formData?.teaId) {
    alert('Debes seleccionar una TEA válida.')
    return
  }
  // 1.5 Crear cliente y mostrar advertencia si existe
  const clientePayload = {
    firstname: simulationStore.formData?.nombre || '',
    lastname: '',
    phone: simulationStore.formData?.telefono || '',
  }
  const clienteResponse = await crearCliente(clientePayload)
  if (clienteResponse.warning) {
    alert(clienteResponse.warning)
  }
  // 3. Guardar simulación con los campos que espera el backend
  const simData: Record<string, unknown> = {
    clientFirstname: simulationStore.formData?.nombre || '',
    clientLastname: '',
    phone: simulationStore.formData?.telefono || '',
    lotId: simulationStore.formData?.loteId,
    userId: authStore.user?.id, // Usar el usuario autenticado
    initialquote: simulationStore.formData?.cuotaInicial,
    contactType: simulationStore.formData?.contacto,
    teaId: simulationStore.formData?.teaId, // teaId recibida y guardada en el formulario
  }
  // Unificar meses y años en un solo campo 'months'
  let months = 0
  if (simulationStore.formData?.meses) {
    months = simulationStore.formData.meses
  } else if (simulationStore.formData?.anios) {
    months = simulationStore.formData.anios * 12
  }
  if (months < 1) {
    alert('Debes ingresar un número de cuotas válido (mayor o igual a 1).')
    return
  }
  simData['months'] = months
  const simResponse = await guardarSimulacion(simData)
  console.log('Respuesta de guardarSimulacion:', simResponse)
  const simulationId = simResponse.id

  if (!simulationId) {
    alert('Error: No se pudo obtener el ID de la simulación. Intenta de nuevo.')
    return
  }

  const quotationData = {
    simulationId,
    amountFinanced: resultados.value.montoFinanciar,
    intGenerated: resultados.value.interesGenerado,
    saleValue: resultados.value.ventaFinal,
    quotaValue: resultados.value.cuotaBase,
    ultimaCuota: resultados.value.ultimaCuota,
  }
  console.log('quotationData:', quotationData)
  const cotResponse = await guardarCotizacion(quotationData)
  // 5. Obtener los datos completos para la pantalla de cotización
  const quotationFormData = await getFormQuotationBySimulationId(simulationId)

  // 5.1 Agregar el usuario autenticado al objeto de cotización
  quotationFormData.user = {
    firstname: authStore.user?.firstname || '',
    lastname: authStore.user?.lastname || '',
    email: authStore.user?.email || '',
  }

  // 6. Guardar los datos en el store para la pantalla de cotización
  simulationStore.quotationFormData = quotationFormData
  // 7. Redirigir a la vista de cotización
  router.push({ name: 'quotation-view', params: { id: cotResponse.id } })
}
</script>

<style scoped>
.simulation-calculated-container {
  background: #fff;
  border-radius: 0.5rem;
  padding: 1.2rem 0.5rem 1.5rem 0.5rem;
  max-width: 400px;
  margin: 1rem auto;
  min-height: 100vh;
  font-family: 'Inter', Arial, sans-serif;
}
.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.back-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #ff7a2f;
}
.title {
  font-weight: 600;
  font-size: 1.1rem;
}
.subtitle {
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1.2rem;
}
.row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.7rem;
}
.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 0.7rem;
}
label {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.2rem;
}
.readonly-input {
  width: 100%;
  padding: 0.7rem;
  border: none;
  border-radius: 6px;
  background: #ffe5e5;
  font-size: 1rem;
  margin-bottom: 0.2rem;
  outline: none;
  color: #222;
}
.button-row {
  display: flex;
  gap: 1rem;
  margin-top: 1.2rem;
}
.btn {
  flex: 1;
  padding: 0.8rem 0;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.recalc-btn {
  background: #ffecd6;
  color: #ff7a2f;
}
.save-btn {
  background: #ff7a2f;
  color: #fff;
}
.save-btn:hover {
  background: #ff944d;
}
</style>
