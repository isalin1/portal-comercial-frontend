<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

type DayPayment = {
  id: number
  firstName: string
  lastName: string
  days: number
  amount: string | number
  planName: string
}

const day = ref(limaToday())
const payments = ref<DayPayment[]>([])
const error = ref('')

function limaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}

function money(amount: string | number) {
  return `S/ ${Number(amount).toFixed(2)}`
}

async function load() {
  error.value = ''
  try {
    const { data } = await http.get<DayPayment[]>('/user/pagos', { params: { date: day.value } })
    payments.value = data
  } catch (err) {
    error.value = apiError(err)
  }
}

onMounted(load)
watch(day, load)
</script>

<template>
  <ScreenFrame title="Reportes" back>
    <label class="field">
      <span>Fecha</span>
      <input v-model="day" type="date" />
    </label>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!payments.length" class="muted">No hay pagos en esta fecha.</p>
    <article v-for="payment in payments" :key="payment.id" class="card">
      <h3>{{ payment.firstName }} {{ payment.lastName }}</h3>
      <p>{{ payment.days }} días - Plan {{ payment.planName }} - {{ money(payment.amount) }}</p>
    </article>
  </ScreenFrame>
</template>
