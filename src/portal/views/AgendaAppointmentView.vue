<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

interface Service { id: number; name: string; durationMinutes: number; price: number; isActive: boolean }
interface Turn {
  startsAt: string
  endsAt: string
  active: boolean
  estado: 'inactivo' | 'libre' | 'separado'
  clientName: string | null
}
interface Professional { id: number; name: string }

const route = useRoute()
const router = useRouter()
const error = ref('')
const loading = ref(false)
const step = ref<'turnos' | 'datos'>('turnos')
const services = ref<Service[]>([])
const professional = ref<Professional | null>(null)
const serviceId = ref(0)
const date = ref(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }))
const turns = ref<Turn[]>([])
const selected = ref<string[]>([])
const slotMinutes = ref(30)
const notifyClient = ref(true)
const form = ref({ clientName: '', clientPhone: '', clientDni: '', clientAddress: '', notes: '' })

const service = computed(() => services.value.find((item) => item.id === serviceId.value))
const chosen = computed(() => turns.value.filter((turn) => selected.value.includes(turn.startsAt)))
const price = computed(() => {
  if (!service.value || !chosen.value.length) return 0
  return (service.value.price * chosen.value.length * slotMinutes.value) / service.value.durationMinutes
})

async function loadServices() {
  const { data } = await http.get<{ professionals: Professional[]; agenda: null | { services: Service[] } }>(`/agenda/${route.query.negocio}`, {
    params: { professionalId: route.query.profesional },
  })
  professional.value = data.professionals.find((item) => item.id === Number(route.query.profesional)) || null
  services.value = (data.agenda?.services || []).filter((item) => item.isActive)
  if (!services.value.some((item) => item.id === serviceId.value)) serviceId.value = services.value[0]?.id || 0
}

async function loadDay() {
  selected.value = []
  const { data } = await http.get<{ slotMinutes: number; turns: Turn[] }>(`/agenda/${route.query.negocio}/dia`, {
    params: { professionalId: route.query.profesional, date: date.value },
  })
  slotMinutes.value = data.slotMinutes
  turns.value = data.turns
}

function toggle(turn: Turn) {
  if (turn.estado !== 'libre') return
  selected.value = selected.value.includes(turn.startsAt)
    ? selected.value.filter((item) => item !== turn.startsAt)
    : [...selected.value, turn.startsAt].sort()
}

async function submit() {
  error.value = ''
  if (!/^\d{8}$/.test(form.value.clientDni.trim())) {
    error.value = 'El DNI debe tener 8 dígitos'
    return
  }
  loading.value = true
  try {
    await http.post(`/agenda/${route.query.negocio}/appointments`, {
      professionalId: Number(route.query.profesional),
      serviceId: serviceId.value,
      date: date.value,
      times: [...selected.value].sort(),
      clientName: form.value.clientName,
      clientPhone: form.value.clientPhone,
      clientDni: form.value.clientDni,
      clientAddress: form.value.clientAddress,
      notes: form.value.notes,
      notifyClient: notifyClient.value,
    })
    await router.push({ name: 'agenda-board', query: { negocio: route.query.negocio, profesional: route.query.profesional, fecha: date.value } })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await loadServices()
    await loadDay()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch(date, async () => {
  try {
    await loadDay()
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <h2>{{ step === 'turnos' ? 'Separar turno' : 'Crear cita' }}</h2>
      <p v-if="professional">{{ professional.name }}</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <template v-if="step === 'turnos'">
      <label class="line">
        <span>Día</span>
        <input v-model="date" type="date" />
      </label>
      <label class="line">
        <span>Servicio</span>
        <select v-model.number="serviceId">
          <option v-for="item in services" :key="item.id" :value="item.id">{{ item.name }} · S/ {{ item.price.toFixed(2) }}</option>
        </select>
      </label>
      <p v-if="!services.length" class="hint">Este profesional todavía no tiene servicios activos.</p>
      <p class="legend"><i class="free"></i> Libre <i class="mine"></i> Seleccionado <i class="busy"></i> Separado <i class="off"></i> Inactivo</p>
      <p v-if="!turns.length" class="hint">Este día no tiene horario configurado.</p>
      <button
        v-for="turn in turns"
        :key="turn.startsAt"
        class="slot"
        :class="selected.includes(turn.startsAt) ? 'mine' : turn.estado"
        type="button"
        :disabled="turn.estado !== 'libre'"
        @click="toggle(turn)"
      >
        <strong>{{ turn.startsAt }} – {{ turn.endsAt }}</strong>
        <span v-if="turn.estado === 'separado'">{{ turn.clientName }}</span>
        <span v-else-if="turn.estado === 'inactivo'">Inactivo</span>
        <span v-else-if="selected.includes(turn.startsAt)">Seleccionado</span>
        <span v-else>Libre</span>
      </button>
      <button class="save" type="button" :disabled="!selected.length" @click="step = 'datos'">Registrar cita</button>
    </template>
    <form v-else class="sheet" @submit.prevent="submit">
      <label class="line"><span>Nombre del cliente</span><input v-model="form.clientName" required /></label>
      <label class="line"><span>Teléfono</span><input v-model="form.clientPhone" required inputmode="numeric" /></label>
      <label class="line"><span>DNI</span><input v-model="form.clientDni" required maxlength="8" inputmode="numeric" /></label>
      <label class="line"><span>Dirección</span><input v-model="form.clientAddress" required /></label>
      <section class="picked">
        <header>
          <strong>Horario elegido</strong>
          <span>{{ chosen.length }} turno{{ chosen.length === 1 ? '' : 's' }}</span>
        </header>
        <p>{{ service?.name }} · {{ date }} · {{ professional?.name }}</p>
        <p v-for="turn in chosen" :key="turn.startsAt">{{ turn.startsAt }} – {{ turn.endsAt }}</p>
        <b>S/ {{ price.toFixed(2) }}</b>
      </section>
      <label class="line"><span>Observaciones</span><textarea v-model="form.notes" rows="3" placeholder="Notas de la cita"></textarea></label>
      <label class="check">
        <input v-model="notifyClient" type="checkbox" />
        <span>Recordatorio por WhatsApp al confirmar</span>
      </label>
      <button class="save" type="submit" :disabled="loading">{{ loading ? 'Guardando…' : 'Aceptar' }}</button>
      <button class="ghost" type="button" @click="step = 'turnos'">Modificar turnos</button>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 14px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; }
.head p, .hint { margin: 6px 0 0; color: #64748b; font-size: 13px; }
.line { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.line span { color: #475569; font-size: 12px; font-weight: 600; }
.line input, .line select, .line textarea {
  width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-control); font: inherit;
}
.legend { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 10px; color: #64748b; font-size: 11px; }
.legend i { width: 10px; height: 10px; border-radius: 999px; }
.legend .free { background: #fff; border: 1px solid #cbd5e1; }
.legend .mine { background: #fde68a; }
.legend .busy { background: #fecaca; }
.legend .off { background: #e2e8f0; }
.slot {
  display: flex; justify-content: space-between; gap: 8px; width: 100%; min-height: 48px; margin-bottom: 8px; padding: 10px 12px;
  border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; font: inherit; text-align: left; cursor: pointer;
}
.slot.inactivo { background: #f1f5f9; color: #94a3b8; }
.slot.separado { background: #fff1f2; border-color: #fecdd3; }
.slot.mine { background: #fef3c7; border-color: #fcd34d; }
.slot:disabled { cursor: default; }
.save, .ghost { width: 100%; min-height: 48px; margin-top: 8px; border: 0; border-radius: var(--radius-control); font: inherit; font-weight: 700; }
.save { background: var(--color-brand); color: #fff; }
.save:disabled { opacity: 0.5; }
.ghost { background: #e2e8f0; color: #334155; }
.picked { margin-bottom: 12px; padding: 12px; border-radius: var(--radius-card); background: #fff; box-shadow: var(--shadow-soft); }
.picked header { display: flex; justify-content: space-between; }
.picked p { margin: 4px 0 0; color: #475569; font-size: 13px; }
.check { display: flex; gap: 8px; align-items: center; margin: 8px 0; font-size: 13px; }
</style>
