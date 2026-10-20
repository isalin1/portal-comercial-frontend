<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import HourField from '../components/HourField.vue'
import { apiError, http } from '../api'

type DayRow = {
  weekday: number
  opensAt: string
  closesAt: string
  active: boolean
}

type Schedule = {
  id: number
  name: string
  businessName: string
  chargesDelivery: boolean
  deliveryFee: number
  openNow: boolean
  days: DayRow[]
}

const DAY_NAME: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  0: 'Domingo',
}

const points = ref<{ id: number; name: string; business?: { commercialName?: string } }[]>([])
const pointId = ref(0)
const schedule = ref<Schedule | null>(null)
const error = ref('')
const notice = ref('')
const saving = ref(false)
const editing = ref<DayRow | null>(null)
const draftOpen = ref('09:00')
const draftClose = ref('21:00')
const editingFee = ref(false)
const draftFee = ref('0')

const title = computed(() => {
  if (!schedule.value) return ''
  const business = schedule.value.businessName
  return business ? `${schedule.value.name} · ${business}` : schedule.value.name
})

function clock(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '')
  if (!match) return value
  const hour = Number(match[1])
  const period = hour >= 12 ? 'pm' : 'am'
  return `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]} ${period}`
}

function money(value: number) {
  return Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

async function loadPoints() {
  const { data } = await http.get<{ id: number; name: string; business?: { commercialName?: string } }[]>('/point-sales')
  points.value = data
  if (!pointId.value && data[0]) pointId.value = data[0].id
}

async function loadSchedule() {
  if (!pointId.value) {
    schedule.value = null
    return
  }
  const { data } = await http.get<Schedule>(`/point-sales/${pointId.value}/horario`)
  schedule.value = data
}

async function refresh() {
  error.value = ''
  try {
    await loadPoints()
    await loadSchedule()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function save(body: Record<string, unknown>, ok: string) {
  if (!pointId.value || saving.value) return
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    const { data } = await http.patch<Schedule>(`/point-sales/${pointId.value}/horario`, body)
    schedule.value = data
    notice.value = ok
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

function openEditor(day: DayRow) {
  editing.value = day
  draftOpen.value = day.opensAt
  draftClose.value = day.closesAt
}

function closeEditor() {
  editing.value = null
}

async function saveHours() {
  if (!editing.value) return
  const day = editing.value
  await save(
    { weekday: day.weekday, opensAt: draftOpen.value, closesAt: draftClose.value },
    `Horario de ${DAY_NAME[day.weekday]} guardado`,
  )
  if (!error.value) editing.value = null
}

function toggleDay(day: DayRow) {
  save({ weekday: day.weekday, active: !day.active }, day.active ? `${DAY_NAME[day.weekday]} cerrado` : `${DAY_NAME[day.weekday]} abierto`)
}

function toggleDelivery() {
  if (!schedule.value) return
  save({ chargesDelivery: !schedule.value.chargesDelivery }, schedule.value.chargesDelivery ? 'Delivery desactivado' : 'Delivery activado')
}

function openFee() {
  draftFee.value = String(schedule.value?.deliveryFee ?? 0)
  editingFee.value = true
}

async function saveFee() {
  const fee = Number(String(draftFee.value).replace(',', '.'))
  await save({ deliveryFee: fee }, 'Costo de delivery guardado')
  if (!error.value) editingFee.value = false
}

onMounted(refresh)
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Horarios, Disponibilidad y Delivery</h2>
      <p v-if="schedule" class="where">{{ title }}</p>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="notice" class="ok">{{ notice }}</p>

    <p v-if="!points.length" class="empty">
      Todavía no hay un punto de venta.
      <router-link :to="{ name: 'businesses' }">Registra uno en Mi negocio</router-link>
    </p>

    <template v-else>
      <label v-if="points.length > 1" class="picker">
        <span>Punto de venta</span>
        <select v-model.number="pointId" @change="loadSchedule">
          <option v-for="point in points" :key="point.id" :value="point.id">
            {{ point.name }}{{ point.business?.commercialName ? ` · ${point.business.commercialName}` : '' }}
          </option>
        </select>
      </label>

      <p v-if="schedule" class="now" :class="{ on: schedule.openNow }">
        {{ schedule.openNow ? 'La tienda está abierta' : 'La tienda está cerrada' }}
      </p>

      <section v-if="schedule" class="card">
        <h3>Horario de atención</h3>
        <div class="table">
          <div class="row labels">
            <span>Día</span>
            <span>Inicio</span>
            <span>Cierre</span>
            <span>Estado</span>
          </div>
          <div v-for="day in schedule.days" :key="day.weekday" class="row">
            <strong>{{ DAY_NAME[day.weekday] }}</strong>
            <span>{{ clock(day.opensAt) }}</span>
            <span>{{ clock(day.closesAt) }}</span>
            <span class="tools">
              <button type="button" class="pen" :aria-label="`Editar horario de ${DAY_NAME[day.weekday]}`" @click="openEditor(day)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5zm15.7-9.2a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.2 1.2 3.5 3.5 1.1-1.1z" />
                </svg>
              </button>
              <button
                type="button"
                class="toggle"
                :class="{ on: day.active }"
                :aria-pressed="day.active"
                :aria-label="`${DAY_NAME[day.weekday]} ${day.active ? 'abierto' : 'cerrado'}`"
                :disabled="saving"
                @click="toggleDay(day)"
              >
                <i></i>
              </button>
            </span>
          </div>
        </div>
      </section>

      <section v-if="schedule" class="card">
        <h3>Delivery a domicilio</h3>
        <div class="ship">
          <span>Habilitar</span>
          <button
            type="button"
            class="toggle"
            :class="{ on: schedule.chargesDelivery }"
            :aria-pressed="schedule.chargesDelivery"
            aria-label="Habilitar delivery"
            :disabled="saving"
            @click="toggleDelivery"
          >
            <i></i>
          </button>
          <span>Costo</span>
          <span class="cost">
            S/. {{ money(schedule.deliveryFee) }}
            <button type="button" class="pen" aria-label="Editar costo de delivery" @click="openFee">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5zm15.7-9.2a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.2 1.2 3.5 3.5 1.1-1.1z" />
              </svg>
            </button>
          </span>
        </div>
      </section>
    </template>

    <div v-if="editing" class="backdrop" @click.self="closeEditor">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-hours-title">
        <header>
          <h3 id="edit-hours-title">Editar Horario</h3>
          <button type="button" class="x" aria-label="Cerrar" @click="closeEditor">×</button>
        </header>
        <p class="day">Día: {{ DAY_NAME[editing.weekday] }}</p>
        <HourField v-model="draftOpen" label="Inicio" />
        <HourField v-model="draftClose" label="Cierre" />
        <button class="save" type="button" :disabled="saving" @click="saveHours">Guardar</button>
      </section>
    </div>

    <div v-if="editingFee" class="backdrop" @click.self="editingFee = false">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-fee-title">
        <header>
          <h3 id="edit-fee-title">Costo de delivery</h3>
          <button type="button" class="x" aria-label="Cerrar" @click="editingFee = false">×</button>
        </header>
        <label class="fee">
          <span>S/.</span>
          <input v-model="draftFee" inputmode="decimal" />
        </label>
        <button class="save" type="button" :disabled="saving" @click="saveFee">Guardar</button>
      </section>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.head h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
}

.where,
.empty {
  margin: 8px 0 0;
  color: var(--color-muted);
  font-size: 14px;
}

.empty a {
  color: var(--color-brand);
  font-weight: 700;
}

.ok {
  margin: 12px 0 0;
  color: #0f7a32;
  font-weight: 700;
}

.picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
  font-weight: 700;
}

.picker select,
.fee input {
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: #fff;
  font: inherit;
}

.now {
  margin: 16px 0 0;
  padding: 10px 14px;
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-muted);
  font-weight: 700;
}

.now.on {
  background: #e8f7ee;
  color: #0f7a32;
}

.card {
  margin-top: 16px;
  padding: 16px;
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-soft);
}

.card h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: grid;
  grid-template-columns: minmax(72px, 1.1fr) minmax(68px, 0.9fr) minmax(68px, 0.9fr) 78px;
  gap: 6px;
  align-items: center;
  font-size: 13px;
}

.labels {
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 700;
}

.row strong {
  font-size: 13px;
}

.tools,
.cost {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.pen {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.pen svg {
  width: 18px;
  height: 18px;
  fill: var(--color-brand);
}

.toggle {
  position: relative;
  width: 44px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #d5d7de;
  cursor: pointer;
}

.toggle i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.15s ease;
}

.toggle.on {
  background: var(--color-brand);
}

.toggle.on i {
  left: 21px;
}

.toggle:disabled {
  opacity: 0.6;
}

.ship {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px 8px;
  align-items: center;
  font-weight: 700;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: end center;
  padding: 16px;
  background: rgba(20, 22, 28, 0.45);
}

.modal {
  width: min(390px, 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 16px 20px;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
}

.modal header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal h3,
.day {
  margin: 0;
}

.x {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-ink);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.fee {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  font-weight: 700;
}

.save {
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.save:disabled {
  opacity: 0.55;
}
</style>
