<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

interface Turn { startsAt: string; endsAt: string; active: boolean }
interface Schedule {
  configured: boolean
  customized: boolean
  habitual: boolean
  opensAt: string
  closesAt: string
  slotMinutes: number
  turns: Turn[]
}

const route = useRoute()
const error = ref('')
const message = ref('')
const loading = ref(false)
const mode = ref<'semana' | 'fecha'>('semana')
const weekday = ref(1)
const date = ref(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }))
const opensAt = ref('09:00')
const closesAt = ref('18:00')
const slotMinutes = ref(30)
const turns = ref<Turn[]>([])
const customized = ref(false)
const habitual = ref(false)
const weekDays = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
]

const activeCount = computed(() => turns.value.filter((turn) => turn.active).length)
const dayName = computed(() => weekDays.find((day) => day.id === (mode.value === 'fecha' ? weekdayOf(date.value) : weekday.value))?.label.toLowerCase() || 'día')
const dayPlural = computed(() => ({ 0: 'domingos', 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábados' } as Record<number, string>)[mode.value === 'fecha' ? weekdayOf(date.value) : weekday.value])

function weekdayOf(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function minutes(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}
function label(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function rebuild(keep: boolean) {
  const slot = Number(slotMinutes.value)
  const open = minutes(opensAt.value)
  const close = minutes(closesAt.value)
  if (![15, 30, 60].includes(slot) || close <= open) {
    turns.value = []
    return
  }
  const previous = new Map(turns.value.map((turn) => [turn.startsAt, turn.active]))
  const next: Turn[] = []
  for (let start = open; start + slot <= close; start += slot) {
    const startsAt = label(start)
    next.push({ startsAt, endsAt: label(start + slot), active: keep ? previous.get(startsAt) !== false : true })
  }
  turns.value = next
}

async function load() {
  const { data } = await http.get<Schedule>(`/agenda/${route.query.negocio}/horario`, {
    params: {
      professionalId: route.query.profesional,
      mode: mode.value,
      weekday: weekday.value,
      date: date.value,
    },
  })
  opensAt.value = data.opensAt
  closesAt.value = data.closesAt
  slotMinutes.value = data.slotMinutes || 30
  customized.value = data.customized
  habitual.value = data.habitual
  turns.value = data.turns || []
  if (!turns.value.length) rebuild(false)
}

async function save() {
  error.value = ''
  message.value = ''
  rebuild(true)
  loading.value = true
  try {
    await http.put(`/agenda/${route.query.negocio}/horario`, {
      professionalId: Number(route.query.profesional),
      mode: mode.value,
      weekday: weekday.value,
      date: date.value,
      opensAt: opensAt.value,
      closesAt: closesAt.value,
      slotMinutes: Number(slotMinutes.value),
      turns: turns.value,
    })
    message.value = mode.value === 'fecha'
      ? `Horario personalizado solo para el ${dayName.value} ${date.value.split('-').reverse().join('/')}`
      : `Horario guardado para todos los ${dayPlural.value}`
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

function setAll(active: boolean) {
  turns.value = turns.value.map((turn) => ({ ...turn, active }))
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch([mode, weekday, date], async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <h2>Configuración de horarios y turnos</h2>
      <p>Primero elige un día, por ejemplo lunes, y ese horario queda para todos los lunes. Después puedes abrir un lunes concreto y personalizar solo esa fecha.</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>
    <div class="modes">
      <button type="button" :class="{ on: mode === 'semana' }" @click="mode = 'semana'">Todos los días</button>
      <button type="button" :class="{ on: mode === 'fecha' }" @click="mode = 'fecha'">Una fecha</button>
    </div>
    <div v-if="mode === 'semana'" class="days">
      <button v-for="day in weekDays" :key="day.id" type="button" :class="{ on: weekday === day.id }" @click="weekday = day.id">{{ day.label }}</button>
    </div>
    <label v-else class="line">
      <span>Fecha a personalizar</span>
      <input v-model="date" type="date" />
    </label>
    <p v-if="mode === 'semana'" class="hint">Este horario se guarda para todos los {{ dayPlural }}. Las fechas que ya personalizaste no cambian.</p>
    <p v-else-if="!habitual" class="hint">Configura primero el horario de todos los {{ dayPlural }}. Después podrás personalizar esta fecha.</p>
    <p v-else-if="customized" class="hint">Este {{ dayName }} ya tiene un horario propio. Los demás {{ dayPlural }} siguen con el habitual.</p>
    <p v-else class="hint">Esta fecha usa el horario de todos los {{ dayPlural }}. Al guardar, solo cambia este día.</p>
    <div class="split">
      <label class="line"><span>Inicio jornada</span><input v-model="opensAt" type="time" /></label>
      <label class="line"><span>Fin jornada</span><input v-model="closesAt" type="time" /></label>
    </div>
    <p class="label">Duración de cada turno</p>
    <div class="slots">
      <button v-for="minutes in [15, 30, 60]" :key="minutes" type="button" :class="{ on: slotMinutes === minutes }" @click="slotMinutes = minutes">{{ minutes }} min</button>
    </div>
    <button class="ghost" type="button" @click="rebuild(true)">Recalcular · {{ turns.length }} turnos</button>
    <header class="row">
      <strong>Turnos del día</strong>
      <span>{{ activeCount }} activos</span>
    </header>
    <div class="bulk">
      <button type="button" @click="setAll(true)">Activar todos</button>
      <button type="button" @click="setAll(false)">Pausar todos</button>
    </div>
    <p v-if="!turns.length" class="hint">El horario no alcanza para un turno.</p>
    <article v-for="(turn, index) in turns" :key="turn.startsAt" class="turn">
      <b>#{{ index + 1 }}</b>
      <span>{{ turn.startsAt }} – {{ turn.endsAt }}</span>
      <em>{{ turn.active ? 'Activo' : 'Inactivo' }}</em>
      <button type="button" :class="{ on: turn.active }" @click="turn.active = !turn.active">{{ turn.active ? 'Activo' : 'Inactivo' }}</button>
    </article>
    <button class="save" type="button" :disabled="loading || (mode === 'fecha' && !habitual)" @click="save">{{ loading ? 'Guardando…' : mode === 'fecha' ? 'Personalizar esta fecha' : `Guardar para todos los ${dayPlural}` }}</button>
    <p class="hint">Activo o inactivo es la disponibilidad del turno. No indica si ya hay una cita.</p>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 14px; text-align: center; }
.head h2 { margin: 0; font-size: 22px; line-height: 28px; font-weight: 800; }
.head p, .hint { margin: 6px 0 0; color: #64748b; font-size: 12px; line-height: 16px; }
.modes, .days, .slots, .bulk, .split { display: flex; gap: 8px; margin-bottom: 12px; }
.modes button, .days button, .slots button, .bulk button, .ghost {
  min-height: 40px; border: 0; border-radius: 999px; background: #e2e8f0; color: #334155; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
}
.modes button, .slots button, .days button { flex: 1; }
.modes button.on, .days button.on, .slots button.on { background: var(--color-brand); color: #fff; }
.split .line { flex: 1; }
.line { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.line span, .label { color: #475569; font-size: 12px; font-weight: 600; }
.line input { min-height: 44px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: var(--radius-control); font: inherit; }
.ghost, .save { width: 100%; border-radius: var(--radius-control); }
.ghost { margin-bottom: 12px; background: #e2e8f0; }
.row { display: flex; justify-content: space-between; margin: 8px 0; }
.turn { display: grid; grid-template-columns: 36px 1fr auto auto; gap: 8px; align-items: center; margin-bottom: 8px; padding: 10px; background: #fff; border-radius: 12px; box-shadow: var(--shadow-soft); }
.turn em { color: #64748b; font-size: 11px; font-style: normal; }
.turn button { min-height: 32px; padding: 0 10px; border: 0; border-radius: 999px; background: #e2e8f0; font: inherit; font-size: 11px; font-weight: 700; }
.turn button.on { background: #d1fae5; color: #047857; }
.save { min-height: 48px; margin-top: 8px; border: 0; background: var(--color-brand); color: #fff; font: inherit; font-weight: 700; }
</style>
