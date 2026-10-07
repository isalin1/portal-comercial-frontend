<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { openWhatsAppChat } from '../whatsapp'

interface Notice {
  id: number
  target: 'CLIENTE' | 'PROFESIONAL'
  whatsappUrl: string
}
interface Appointment {
  id: number
  serviceName: string
  price: number
  paid: number
  turns: number
  turnLabels: string[]
  clientName: string
  clientPhone: string
  clientAddress: string
  clientDni: string
  date: string
  status: 'PENDIENTE' | 'CONFIRMADA' | 'ANULADA'
  statusLabel: string
  notices: Notice[]
}
interface DaySummary {
  date: string
  label: string
  isToday: boolean
  appointments: number
  cancelled: number
  bookedTurns: number
  freeTurns: number
}

const route = useRoute()
const error = ref('')
const days = ref<DaySummary[]>([])
const rows = ref<Appointment[]>([])
const amounts = ref<Record<number, string>>({})
const searchDate = ref('')
const found = ref<DaySummary[] | null>(null)
const payingId = ref(0)
const payError = ref('')
const saved = ref<{ id: number; text: string } | null>(null)

const fecha = computed(() => (typeof route.query.fecha === 'string' ? route.query.fecha : ''))
const dayRows = computed(() =>
  rows.value
    .filter((row) => row.date === fecha.value)
    .slice()
    .sort((left, right) => (left.turnLabels[0] || '').localeCompare(right.turnLabels[0] || '')),
)
const dayLabel = computed(() => days.value.find((day) => day.date === fecha.value)?.label || formatDay(fecha.value))
const shownDays = computed(() => found.value ?? days.value)

function formatDay(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

function latestNotices(notices: Notice[]) {
  const byTarget = new Map<Notice['target'], Notice>()
  for (const notice of notices) byTarget.set(notice.target, notice)
  return [...byTarget.values()]
}

async function load() {
  const businessId = route.query.negocio
  const [dayList, appointments] = await Promise.all([
    http.get<DaySummary[]>(`/agenda/${businessId}/days`, { params: { professionalId: route.query.profesional } }),
    http.get<Appointment[]>(`/agenda/${businessId}/appointments`, { params: { professionalId: route.query.profesional } }),
  ])
  days.value = dayList.data
  rows.value = appointments.data
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch(() => route.query.negocio, async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

async function run(action: () => Promise<unknown>) {
  error.value = ''
  try {
    await action()
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
}

function money(value: string | undefined) {
  const amount = Number(String(value || '').trim().replace(',', '.'))
  return Number.isFinite(amount) ? amount : 0
}

function cents(value: number) {
  return Math.round(value * 100)
}

function remainingCents(row: Appointment) {
  return Math.max(0, cents(row.price) - cents(row.paid))
}

async function searchDay() {
  error.value = ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(searchDate.value)) {
    error.value = 'Elige una fecha'
    return
  }
  try {
    found.value = (await http.get<DaySummary[]>(`/agenda/${route.query.negocio}/days`, {
      params: { date: searchDate.value },
    })).data
  } catch (err) {
    error.value = apiError(err)
  }
}

function clearSearch() {
  searchDate.value = ''
  found.value = null
}

async function pay(row: Appointment) {
  if (payingId.value) return
  payingId.value = row.id
  const amount = money(amounts.value[row.id])
  const room = remainingCents(row)
  if (amount <= 0) {
    payingId.value = 0
    payError.value = 'Indica el monto recibido'
    saved.value = null
    return
  }
  if (cents(amount) > room) {
    payingId.value = 0
    payError.value = room > 0
      ? `El pago supera el saldo del servicio. Puedes registrar hasta S/ ${(room / 100).toFixed(2)}`
      : 'Los pagos ya cubren el monto del servicio'
    saved.value = null
    return
  }
  payError.value = ''
  saved.value = null
  try {
    await http.post(`/agenda/appointments/${row.id}/payments`, { amount })
    amounts.value[row.id] = ''
    saved.value = { id: row.id, text: `Pago de S/ ${amount.toFixed(2)} registrado` }
    await load()
  } catch (err) {
    payError.value = apiError(err)
  } finally {
    payingId.value = 0
  }
}
</script>

<template>
  <ScreenFrame :title="fecha ? 'Citas del día' : 'Control de citas'" back>
    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="!fecha">
      <label class="field">
        <span>Buscar fecha</span>
        <input v-model="searchDate" type="date" />
      </label>
      <button class="btn" type="button" @click="searchDay">Buscar</button>
      <button v-if="found" class="btn secondary" type="button" @click="clearSearch">Ver próximos días</button>
      <p v-if="!shownDays.length" class="muted">Todavía no hay días de atención.</p>
      <article v-for="day in shownDays" :key="day.date" class="card">
        <h3>{{ day.isToday ? 'Hoy · ' : '' }}{{ day.label }}</h3>
        <p v-if="day.appointments || day.cancelled">
          {{ countLabel(day.appointments, 'cita', 'citas') }}
          <template v-if="day.cancelled"> · {{ countLabel(day.cancelled, 'anulada', 'anuladas') }}</template>
        </p>
        <p v-else>Sin citas</p>
        <p v-if="day.bookedTurns" class="muted">{{ countLabel(day.bookedTurns, 'turno reservado', 'turnos reservados') }}</p>
        <p class="muted">{{ day.freeTurns ? countLabel(day.freeTurns, 'turno libre', 'turnos libres') : 'Sin turnos libres' }}</p>
        <router-link class="btn" style="display: block; text-align: center; text-decoration: none" :to="{ name: 'agenda-board', query: { negocio: route.query.negocio, fecha: day.date } }">
          Ver citas
        </router-link>
      </article>
    </template>

    <template v-else>
      <p class="muted">{{ dayLabel }}</p>
      <p v-if="!dayRows.length" class="muted">No hay citas este día.</p>
      <article v-for="row in dayRows" :key="row.id" class="card">
        <h3>{{ row.clientName }}</h3>
        <p>{{ row.serviceName }} · {{ countLabel(row.turns, 'turno', 'turnos') }}</p>
        <p class="muted">{{ row.turnLabels.join(', ') }}</p>
        <p class="muted">{{ row.statusLabel }} · <template v-if="cents(row.price) > 0">Pagado S/ {{ row.paid.toFixed(2) }} de {{ row.price.toFixed(2) }}</template><template v-else>Sin monto por cobrar</template></p>
        <p v-if="saved?.id === row.id" class="ok">{{ saved.text }}</p>
        <p class="muted">{{ row.clientPhone }} · DNI {{ row.clientDni }}</p>
        <p class="muted">{{ row.clientAddress }}</p>
        <div class="stack">
          <a
            v-for="notice in latestNotices(row.notices)"
            :key="notice.id"
            class="wa-btn"
            :href="notice.whatsappUrl"
            @click.prevent="openWhatsAppChat(notice.whatsappUrl)"
          >
            {{ notice.target === 'CLIENTE' ? 'Avisar al cliente' : 'Avisar al profesional' }}
          </a>
          <template v-if="row.status !== 'ANULADA'">
            <p v-if="cents(row.price) > 0 && cents(row.paid) > cents(row.price)" class="error">Los pagos acumulados superan el monto del servicio.</p>
            <p v-else-if="cents(row.price) > 0 && cents(row.paid) > 0 && !remainingCents(row)" class="muted">El servicio ya está pagado. El pago se registró en esta cita.</p>
            <p v-else-if="cents(row.price) <= 0" class="muted">Esta cita no tiene precio, así que no hay un pago que registrar.</p>
            <template v-else>
              <p class="muted">Saldo S/ {{ (remainingCents(row) / 100).toFixed(2) }}. El pago se registra aquí, en la cita.</p>
              <label class="field">
                <span>Pago recibido</span>
                <input v-model="amounts[row.id]" type="number" min="0.01" :max="remainingCents(row) / 100" step="0.01" />
              </label>
              <p v-if="payError" class="error">{{ payError }}</p>
              <button class="btn" type="button" :disabled="payingId === row.id" @click="pay(row)">
                {{ payingId === row.id ? 'Registrando…' : 'Registrar pago' }}
              </button>
            </template>
          </template>
          <button v-if="row.status === 'PENDIENTE'" class="btn" type="button" @click="run(() => http.patch(`/agenda/appointments/${row.id}/confirm`))">
            Confirmar
          </button>
          <button v-if="row.status !== 'ANULADA'" class="btn secondary" type="button" @click="run(() => http.patch(`/agenda/appointments/${row.id}/cancel`))">
            Anular
          </button>
        </div>
      </article>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.card { margin-bottom: 12px; }
</style>
