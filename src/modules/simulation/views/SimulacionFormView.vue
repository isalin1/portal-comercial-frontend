<template>
  <div class="simulacion-form">
    <h2>Simulación Financiera</h2>
    <form @submit.prevent="handleSubmit">
      <fieldset>
        <legend>Datos del Cliente</legend>
        <input v-model="nombre" placeholder="Ejem: Andres Zapata" required />
        <input v-model="telefono" placeholder="Teléfono" required />
        <select v-model="contacto" required>
          <option disabled value="">Forma de Contacto</option>
          <option v-for="tipo in contactTypes" :key="tipo" :value="tipo">{{ tipo }}</option>
        </select>
      </fieldset>

      <fieldset>
        <legend>Datos de Lote</legend>
        <select v-model="programaId" @change="fetchLotes" required>
          <option disabled value="">Selecciona un programa</option>
          <option v-for="prog in programas" :key="prog.id" :value="prog.id">
            {{ prog.programname }}
          </option>
        </select>
        <select v-model="loteId" required>
          <option disabled value="">Selecciona un lote</option>
          <option v-for="l in lotes" :key="l.id" :value="l.id">{{ l.lotCode }}</option>
        </select>
        <select v-model="moneda" @change="setTasaAnual" required>
          <option disabled value="">Moneda</option>
          <option v-for="m in monedas" :key="m" :value="m">{{ m }}</option>
        </select>
        <input v-model="tasaAnual" placeholder="Tasa Anual (%)" required type="number" readonly />
      </fieldset>

      <fieldset>
        <legend>Financiamiento</legend>
        <input
          v-model.number="cuotaInicial"
          placeholder="Ingresar monto de cuota inicial"
          required
          type="number"
        />
        <div class="plazo">
          <input v-model.number="meses" placeholder="# meses" type="number" min="0" />
          <input v-model.number="anios" placeholder="# años" type="number" min="0" />
        </div>
      </fieldset>

      <button type="submit">Calcular</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSimulationStore } from '../stores/simulation.store'
import { ContactType } from '../interfaces/contacttype.enum'
import { Monedas as Moneda } from '../interfaces/moneda.enum'
import {
  getProgramas,
  getLotesByPrograma,
  getTasaByMoneda,
  calcularSimulacion,
} from '@/api/lavanderiaApi'
import type { Program, Lot } from '@/api/lavanderiaApi'

const simulationStore = useSimulationStore()

const nombre = ref(simulationStore.formData?.nombre || '')
const telefono = ref(simulationStore.formData?.telefono || '')
const contacto = ref(simulationStore.formData?.contacto || '')
const programaId = ref<number | ''>(simulationStore.formData?.programaId || '')
const programas = ref<Program[]>([])
const loteId = ref<number | ''>(simulationStore.formData?.loteId || '')
const lotes = ref<Lot[]>([])
const moneda = ref(simulationStore.formData?.moneda || '')
const monedas = Object.values(Moneda)
const tasaAnual = ref<number | null>(simulationStore.formData?.tasaAnual ?? null)
const cuotaInicial = ref<number | null>(simulationStore.formData?.cuotaInicial ?? null)
const meses = ref<number | null>(simulationStore.formData?.meses ?? null)
const anios = ref<number | null>(simulationStore.formData?.anios ?? null)

const contactTypes = Object.values(ContactType)

const router = useRouter()

onMounted(async () => {
  programas.value = await getProgramas()
  // Si hay un programa seleccionado, carga los lotes
  if (programaId.value) {
    lotes.value = await getLotesByPrograma(Number(programaId.value))
  }
})

async function fetchLotes() {
  if (programaId.value) {
    lotes.value = await getLotesByPrograma(Number(programaId.value))
  } else {
    lotes.value = []
  }
  loteId.value = ''
}

async function setTasaAnual() {
  if (moneda.value) {
    tasaAnual.value = await getTasaByMoneda(moneda.value)
  } else {
    tasaAnual.value = null
  }
}

async function handleSubmit() {
  if (
    !nombre.value ||
    !telefono.value ||
    !contacto.value ||
    !programaId.value ||
    !loteId.value ||
    moneda.value === '' ||
    tasaAnual.value === null ||
    cuotaInicial.value === null ||
    (!meses.value && !anios.value)
  ) {
    alert('Por favor, completa todos los campos obligatorios.')
    return
  }
  if ((meses.value && anios.value) || (!meses.value && !anios.value)) {
    alert('Debes ingresar solo meses o solo años, no ambos.')
    return
  }
  // Guarda los datos del formulario en el store antes de calcular
  const payload = {
    clientFirstname: nombre.value,
    clientLastname: '', // Puedes agregar campo si lo tienes
    phone: telefono.value,
    contactType: contacto.value,
    money: moneda.value,
    lotId: Number(loteId.value),
    teaId: 1, // Ajusta según tu lógica
    initialquote: cuotaInicial.value,
    userId: 1, // Ajusta según tu lógica de usuario
    ...(meses.value ? { months: meses.value } : { years: anios.value }),
  }
  simulationStore.setFormData({
    nombre: nombre.value,
    telefono: telefono.value,
    contacto: contacto.value,
    programaId: programaId.value,
    loteId: loteId.value,
    moneda: moneda.value,
    tasaAnual: tasaAnual.value,
    cuotaInicial: cuotaInicial.value,
    meses: meses.value,
    anios: anios.value,
    teaId: payload.teaId,
    montoFinanciado: 0,
    tasaMensual: 0,
    totalCuotas: 0,
  })
  try {
    const result = await calcularSimulacion(payload)
    simulationStore.setResultados(result)
    router.push({ name: 'simulation-calculated' })
  } catch (error: unknown) {
    let message = 'Error desconocido'
    if (typeof error === 'object' && error !== null) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      message = err.response?.data?.message || err.message || message
    }
    alert('Error al calcular simulación: ' + message)
  }
}
</script>

<style scoped>
.simulacion-form {
  max-width: 400px;
  margin: 0 auto;
}
form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
fieldset {
  border: 1px solid #eee;
  padding: 1rem;
  border-radius: 8px;
}
.lote-valor,
.moneda-tasa,
.plazo {
  display: flex;
  gap: 1rem;
}
button {
  background: orange;
  color: #fff;
  border: none;
  padding: 1rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
</style>
