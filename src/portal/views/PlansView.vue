<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

type Plan = {
  id: number
  name: string
  days: number
  commercialName: string
  price: number | string
  showProducts: boolean
  whatsappButton: boolean
  showPhone: boolean
  operatorOrders: boolean
  clientOrders: boolean
  daySummary: boolean
  agenda: boolean
}

type RubroRow = {
  id: number
  name: string
  allowsOrders: boolean
  allowsAgenda: boolean
}

const plans = ref<Plan[]>([])
const maxProfessionals = ref(3)
const quotaMessage = ref('')
const rubros = ref<RubroRow[]>([])
const savedPlans = ref<Plan[]>([])
const savedRubros = ref<RubroRow[]>([])
const error = ref('')
const message = ref('')
const pending = ref<{ title: string; lines: string[]; apply: () => Promise<void>; cancel: () => void } | null>(null)
const filter = ref('Todos')

const filters = computed(() => {
  const names: string[] = []
  for (const plan of plans.value) {
    if (!names.includes(plan.commercialName)) names.push(plan.commercialName)
  }
  return names
})

const visiblePlans = computed(() =>
  filter.value === 'Todos' ? plans.value : plans.value.filter((plan) => plan.commercialName === filter.value),
)

function planBadge(plan: Plan) {
  return plan.commercialName === 'Free' ? 'Gratuito' : plan.name
}

function planSubtitle(plan: Plan) {
  if (plan.commercialName === 'Corporativo') return 'Plan premium integral'
  if (plan.commercialName === 'Empresario') return 'Plan semestral avanzado'
  if (plan.commercialName === 'Free') return 'Acceso libre de bienvenida'
  return `Modalidad ${plan.name}`
}

const flags = [
  ['showProducts', 'Muestra productos y servicios'],
  ['whatsappButton', 'Botón de WhatsApp'],
  ['showPhone', 'Muestra el teléfono'],
  ['operatorOrders', 'Pedidos del empresario'],
  ['clientOrders', 'Pedidos del cliente'],
  ['daySummary', 'Resumen del día'],
  ['agenda', 'Agenda'],
] as const

function planRank(plan: Plan) {
  if (plan.commercialName === 'Corporativo') return 1
  if (plan.commercialName === 'Empresario') return 2
  if (plan.name === 'Trimestral') return 3
  if (plan.name === 'Mensual') return 4
  if (plan.commercialName === 'Free') return 5
  return 6
}

function isAnnual(plan: { name: string }) {
  return /anual/i.test(plan.name) && !/semestral/i.test(plan.name)
}

function agendaLabel(plan: { name: string }) {
  if (isAnnual(plan)) return `Agenda · hasta ${maxProfessionals.value} profesionales`
  if (/semestral/i.test(plan.name)) return 'Agenda · 1 profesional'
  return 'Agenda'
}

async function load() {
  const [planRes, rubroRes, settingsRes] = await Promise.all([
    http.get<Plan[]>('/plans'),
    http.get<RubroRow[]>('/rubros'),
    http.get<{ maxAgendaProfessionals?: number }>('/settings'),
  ])
  maxProfessionals.value = settingsRes.data.maxAgendaProfessionals || 3
  plans.value = [...planRes.data].sort((a, b) => planRank(a) - planRank(b))
  rubros.value = rubroRes.data
  savedPlans.value = planRes.data.map((plan) => ({ ...plan }))
  savedRubros.value = rubroRes.data.map((rubro) => ({ ...rubro }))
}

function yesNo(value: boolean) {
  return value ? 'activado' : 'desactivado'
}

function askPlan(plan: Plan) {
  const saved = savedPlans.value.find((item) => item.id === plan.id)
  const lines = flags
    .filter(([key]) => Boolean(plan[key]) !== Boolean(saved?.[key]))
    .map(([key, label]) => `${key === 'agenda' ? agendaLabel(plan) : label}: ${yesNo(Boolean(plan[key]))}`)
  if (!lines.length) {
    void savePlan(plan)
    return
  }
  pending.value = {
    title: plan.commercialName,
    lines,
    apply: () => savePlan(plan),
    cancel: () => {
      if (!saved) return
      for (const [key] of flags) plan[key] = saved[key]
    },
  }
}

function askRubro(rubro: RubroRow) {
  const saved = savedRubros.value.find((item) => item.id === rubro.id)
  const lines = [
    ['allowsOrders', 'Pedidos'],
    ['allowsAgenda', 'Agenda'],
  ] as const
  const changes = lines
    .filter(([key]) => Boolean(rubro[key]) !== Boolean(saved?.[key]))
    .map(([key, label]) => `${label}: ${yesNo(Boolean(rubro[key]))}`)
  if (!changes.length) {
    message.value = 'No hay cambios de funcionalidades en este rubro'
    return
  }
  pending.value = {
    title: rubro.name,
    lines: changes,
    apply: () => saveRubro(rubro),
    cancel: () => {
      if (!saved) return
      rubro.allowsOrders = saved.allowsOrders
      rubro.allowsAgenda = saved.allowsAgenda
    },
  }
}

async function confirmPending() {
  const current = pending.value
  if (!current) return
  pending.value = null
  await current.apply()
}

function desist() {
  pending.value?.cancel()
  pending.value = null
  message.value = 'No se aplicaron los cambios'
}

async function saveQuota() {
  quotaMessage.value = ''
  error.value = ''
  try {
    const { data } = await http.patch<{ maxAgendaProfessionals: number }>('/settings/profesionales-agenda', {
      maxAgendaProfessionals: Number(maxProfessionals.value),
    })
    maxProfessionals.value = data.maxAgendaProfessionals
    quotaMessage.value = 'Cantidad de profesionales guardada'
  } catch (err) {
    error.value = apiError(err)
  }
}

onMounted(load)

async function savePlan(plan: Plan) {
  error.value = ''
  message.value = ''
  try {
    await http.patch(`/plans/${plan.id}`, {
      name: plan.name,
      days: Number(plan.days),
      commercialName: plan.commercialName,
      price: Number(plan.price),
      showProducts: plan.showProducts,
      whatsappButton: plan.whatsappButton,
      showPhone: plan.showPhone,
      operatorOrders: plan.operatorOrders,
      clientOrders: plan.clientOrders,
      daySummary: plan.daySummary,
      agenda: plan.agenda,
    })
    message.value = `Plan ${plan.commercialName} guardado`
    const index = savedPlans.value.findIndex((item) => item.id === plan.id)
    if (index >= 0) savedPlans.value[index] = { ...plan }
  } catch (err) {
    error.value = apiError(err)
  }
}

async function saveRubro(rubro: RubroRow) {
  error.value = ''
  message.value = ''
  try {
    await http.patch(`/rubros/${rubro.id}`, {
      allowsOrders: rubro.allowsOrders,
      allowsAgenda: rubro.allowsAgenda,
    })
    message.value = `Rubro ${rubro.name} guardado`
    const index = savedRubros.value.findIndex((item) => item.id === rubro.id)
    if (index >= 0) savedRubros.value[index] = { ...rubro }
  } catch (err) {
    error.value = apiError(err)
  }
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <article v-if="pending" class="sheet">
      <h3>Confirmar cambio de funcionalidades</h3>
      <p class="warn">Los cambios realizados son muy importantes. Modifican las reglas de negocio de {{ pending.title }}.</p>
      <ul>
        <li v-for="line in pending.lines" :key="line">{{ line }}</li>
      </ul>
      <p class="hint">Confirma si harás estos cambios o desiste para dejar todo como estaba.</p>
      <button class="save" type="button" @click="confirmPending">Confirmar cambios</button>
      <button class="drop" type="button" @click="desist">Desistir</button>
    </article>
    <template v-else>
      <header class="head">
        <h2>Planes</h2>
        <p>Configura tarifas, vigencia y funciones activas para cada membresía</p>
      </header>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="message" class="ok">{{ message }}</p>
      <div class="pills">
        <button type="button" :class="{ on: filter === 'Todos' }" @click="filter = 'Todos'">Todos ({{ plans.length }})</button>
        <button v-for="name in filters" :key="name" type="button" :class="{ on: filter === name }" @click="filter = name">{{ name }}</button>
      </div>
      <article v-for="plan in visiblePlans" :key="plan.id" class="sheet">
        <header>
          <b>{{ plan.commercialName.slice(0, 1) }}</b>
          <div>
            <h3>{{ plan.commercialName }}</h3>
            <small>{{ planSubtitle(plan) }}</small>
          </div>
          <em>{{ planBadge(plan) }}</em>
        </header>
        <div class="grid">
          <label><span>Nombre</span><input v-model="plan.name" /></label>
          <label><span>Días</span><input v-model.number="plan.days" type="number" min="1" /></label>
          <label><span>Nombre comercial</span><input v-model="plan.commercialName" /></label>
          <label><span>Precio (S/.)</span><input v-model.number="plan.price" type="number" min="0" step="0.1" /></label>
        </div>
        <div class="perms">
          <span>Permisos y características</span>
          <label v-for="flag in flags" :key="flag[0]">
            <input v-model="plan[flag[0]]" type="checkbox" />
            <span :class="{ off: !plan[flag[0]] }">{{ flag[0] === 'agenda' ? agendaLabel(plan) : flag[1] }}</span>
          </label>
        </div>
        <button class="save" type="button" @click="askPlan(plan)">Guardar plan</button>
      </article>
      <section class="sheet">
        <header>
          <b>A</b>
          <div>
            <h3>Agenda del plan anual</h3>
            <small>El semestral controla un profesional</small>
          </div>
        </header>
        <label class="quota">
          <span>Profesionales que el plan anual controla en la agenda</span>
          <input v-model.number="maxProfessionals" type="number" min="1" max="20" />
        </label>
        <button class="save" type="button" @click="saveQuota">Guardar cantidad</button>
        <p v-if="quotaMessage" class="ok">{{ quotaMessage }}</p>
      </section>
      <header class="head rubro-head">
        <h2>Agenda según rubro</h2>
        <p>Un rubro nuevo nace con pedidos y sin agenda. Solo el rubro profesional usa agenda.</p>
      </header>
      <article v-for="rubro in rubros" :key="rubro.id" class="sheet">
        <header>
          <b>{{ rubro.name.slice(0, 1) }}</b>
          <div>
            <h3>{{ rubro.name }}</h3>
            <small>{{ rubro.allowsAgenda ? 'Con agenda' : 'Sin agenda' }}</small>
          </div>
        </header>
        <div class="perms">
          <label>
            <input v-model="rubro.allowsOrders" type="checkbox" />
            <span :class="{ off: !rubro.allowsOrders }">Pedidos</span>
          </label>
          <label>
            <input v-model="rubro.allowsAgenda" type="checkbox" />
            <span :class="{ off: !rubro.allowsAgenda }">Agenda</span>
          </label>
        </div>
        <button class="save" type="button" @click="askRubro(rubro)">Guardar rubro</button>
      </article>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 14px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.head p { margin: 6px 0 0; color: #64748b; font-size: 12px; line-height: 1.4; }
.rubro-head { margin-top: 8px; }
.pills { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 14px; padding-bottom: 4px; }
.pills button {
  flex: none;
  min-height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: #e8eefd;
  color: #475569;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}
.pills button.on { background: #0f172a; color: #fff; }
.sheet {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.sheet > header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.sheet h3 { margin: 0; font-size: 16px; }
.sheet header small { display: block; color: #64748b; font-size: 12px; }
.sheet header b {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #fee2e2;
  color: var(--color-brand);
  font-size: 14px;
}
.sheet header em {
  margin-left: auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #334155;
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.grid label, .perms label, .quota { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.quota { margin-bottom: 12px; }
.quota span { font-size: 13px; font-weight: 700; }
.quota input {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 0;
  border-radius: 12px;
  background: #f8fafc;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
}
.grid span, .perms > span { color: #64748b; font-size: 12px; font-weight: 700; }
.grid input {
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 0;
  border-radius: 12px;
  background: #f8fafc;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
}
.perms { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding: 12px; border-radius: 12px; background: #f8fafc; }
.perms > span { letter-spacing: 0.04em; text-transform: uppercase; }
.perms label { flex-direction: row; align-items: center; gap: 10px; font-size: 14px; }
.perms input { width: 18px; height: 18px; flex: none; accent-color: var(--color-brand); }
.perms .off { color: #64748b; }
.save, .drop {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 12px;
  font: inherit;
  font-weight: 700;
}
.save { background: var(--color-brand); color: #fff; }
.drop { min-height: 40px; margin-top: 6px; background: transparent; color: #64748b; }
.warn { margin: 8px 0; color: #9f1239; font-size: 13px; }
.hint { color: #64748b; font-size: 13px; }
ul { margin: 0 0 8px; padding-left: 18px; font-size: 13px; }
</style>
