<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { http } from '../api'
import { usePortalAuth } from '../auth'
import type { AccountPlan, AccountUser } from '../types'

const auth = usePortalAuth()
const router = useRouter()
const account = ref<AccountUser | null>(null)
const agendaEnabled = ref(false)
const canOrder = ref(false)
const canSummary = ref(false)
const salesWhatsapp = ref('')
const settingsMessage = ref('')
const pendingAudit = ref(0)

const adminModules = [
  { name: 'audit', label: 'Auditoría de Publicaciones' },
  { name: 'catalog', label: 'Rubros y Categorías' },
  { name: 'empresarios', label: 'Usuarios y Estados' },
  { name: 'plans', label: 'Planes' },
  { name: 'reports', label: 'Reportes' },
  { name: 'zones', label: 'Zonas' },
] as const

async function saveSalesWhatsapp() {
  settingsMessage.value = ''
  try {
    const { data } = await http.patch<{ salesWhatsapp: string }>('/settings/whatsapp-planes', {
      salesWhatsapp: salesWhatsapp.value,
    })
    salesWhatsapp.value = data.salesWhatsapp
    settingsMessage.value = 'Número de WhatsApp guardado'
  } catch {
    settingsMessage.value = 'No se pudo guardar el número'
  }
}

function limaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}

function planPhrase(plan?: AccountPlan | null, legacy?: string | null) {
  if (plan?.name === 'Libre' || (!plan && legacy === 'FREE')) return 'Plan Free'
  if (!plan) return 'plan'
  return plan.commercialName ? `plan ${plan.commercialName} ${plan.name}` : `plan ${plan.name}`
}

function daysUntil(end?: string | null) {
  if (!end) return null
  const today = Date.parse(limaToday())
  const last = Date.parse(end.slice(0, 10))
  return Math.round((last - today) / 86400000)
}

const vigenciaLines = computed(() => {
  const user = account.value
  if (!user) return []
  const name = planPhrase(user.planCatalog, user.plan)
  const left = daysUntil(user.vigenciaEnd)
  const lines: string[] = []
  if (left == null) lines.push('No tienes una vigencia registrada.')
  else if (left < 0) lines.push(`La vigencia de tu ${name} ya terminó.`)
  else if (left === 0) lines.push(`Hoy termina la vigencia de tu ${name}.`)
  else if (left === 1) lines.push(`Te queda 1 día de vigencia de tu ${name}.`)
  else lines.push(`Te quedan ${left} días de vigencia de tu ${name}.`)
  if (user.pendingPlan) {
    const pending = planPhrase(user.pendingPlan)
    const days = user.pendingPlan.days
    lines.push(
      days === 1
        ? `También tienes contratado el ${pending}, con 1 día de vigencia. Empieza cuando termine el plan actual.`
        : `También tienes contratado el ${pending}, con ${days} días de vigencia. Empieza cuando termine el plan actual.`,
    )
  }
  return lines
})

const empresarioLinks = computed(() => {
  const links: { name: string; label: string }[] = [
    { name: 'profile', label: 'Mis datos' },
    { name: 'businesses', label: 'Mi negocio' },
    { name: 'services', label: 'Productos/Servicios' },
    { name: 'availability', label: 'Disponibilidad' },
  ]
  if (canOrder.value) {
    links.push({ name: 'orders', label: 'Pedidos' }, { name: 'clients', label: 'Clientes' })
  }
  if (canSummary.value) links.push({ name: 'day-summary', label: 'Resumen del día' })
  if (agendaEnabled.value) links.push({ name: 'agenda', label: 'Agenda' })
  return links
})

const planTitle = computed(() => {
  const user = account.value
  const plan = user?.planCatalog
  if (plan?.name === 'Libre' || (!plan && user?.plan === 'FREE')) return 'Plan Free'
  if (!plan) return 'Sin plan'
  return plan.commercialName ? `${plan.commercialName} ${plan.name}` : plan.name
})

const vigenciaTone = computed(() => {
  const left = daysUntil(account.value?.vigenciaEnd)
  if (left == null || left < 0) return 'error'
  return 'ok'
})

onMounted(async () => {
  if (auth.userType === 'ADMIN') {
    try {
      const [{ data }, audit] = await Promise.all([
        http.get<{ salesWhatsapp: string }>('/settings'),
        http.get<{ count: number }[]>('/auditoria'),
      ])
      salesWhatsapp.value = data.salesWhatsapp
      pendingAudit.value = audit.data.reduce((total, row) => total + row.count, 0)
    } catch {
      salesWhatsapp.value = salesWhatsapp.value || '940485657'
    }
  }
  if (auth.userType !== 'EMPRESARIO' || !auth.user) return
  try {
    const { data } = await http.get<AccountUser>(`/user/${auth.user.id}`)
    account.value = data
    auth.setUser({
      id: data.id,
      email: data.datUser.email,
      firstName: data.datUser.firstName,
      lastName: data.datUser.lastName,
      phone: data.datUser.phone,
      userType: data.datUser.userType,
      isActive: data.isActive,
      termsAccepted: Boolean(data.termsAcceptedAt),
    })
    const catalog = data.planCatalog
    const orders = catalog ? catalog.operatorOrders : data.plan !== 'FREE'
    const summary = catalog ? catalog.daySummary : data.plan !== 'FREE'
    const agenda = catalog ? catalog.agenda : data.plan !== 'FREE'
    const businesses = data.businesses || []
    canOrder.value = orders && businesses.some((business) => business.rubro?.allowsOrders !== false && !/profesional/i.test(business.rubro?.name || ''))
    canSummary.value = summary && canOrder.value
    agendaEnabled.value = agenda && businesses.some((business) => business.rubro?.allowsAgenda || /profesional/i.test(business.rubro?.name || ''))
      ? (await http.get<{ enabled: boolean }>('/agenda/access/me')).data.enabled
      : false
  } catch {
    // El panel sigue mostrando los datos de la sesión.
  }
})

function logout() {
  auth.logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <ScreenFrame storefront bar>
    <header class="panel-title">
      <h2>Panel de Administración</h2>
      <p v-if="auth.userType === 'EMPRESARIO'">Empresario</p>
    </header>
    <div v-if="auth.userType === 'EMPRESARIO'" class="owner">
      <section class="profile">
        <h3>{{ auth.user?.firstName }} {{ auth.user?.lastName }}</h3>
        <p>{{ auth.user?.email }}</p>
        <p v-if="auth.user?.phone" class="dial">{{ auth.user.phone }}</p>
      </section>
      <section class="plan" :class="vigenciaTone">
        <header>
          <strong>{{ planTitle }}</strong>
          <span>{{ vigenciaTone === 'ok' ? 'Activo' : 'Vencido' }}</span>
        </header>
        <p v-for="(line, index) in vigenciaLines" :key="index">{{ line }}</p>
      </section>
      <nav class="menu">
        <router-link v-for="link in empresarioLinks" :key="link.name" :to="{ name: link.name }">
          {{ link.label }}
        </router-link>
      </nav>
      <router-link class="save" :to="{ name: 'home' }">Ir a tienda</router-link>
      <button class="ghost" type="button" @click="logout">Cerrar sesión</button>
    </div>
    <div v-else class="admin">
      <p class="session"><span></span>Sesión activa con privilegios totales</p>
      <section class="card">
        <label>
          WhatsApp que recibe la compra de planes
          <input v-model="salesWhatsapp" inputmode="numeric" placeholder="940485657" />
        </label>
        <button class="save" type="button" @click="saveSalesWhatsapp">Guardar número</button>
        <p v-if="settingsMessage" class="ok">{{ settingsMessage }}</p>
      </section>
      <section class="card">
        <header>
          <h3>Configuración</h3>
          <span>{{ adminModules.length }} módulos</span>
        </header>
        <router-link v-for="module in adminModules" :key="module.name" :to="{ name: module.name }">
          <span>{{ module.label }}</span>
          <b v-if="module.name === 'audit' && pendingAudit">{{ pendingAudit }} pend.</b>
        </router-link>
      </section>
      <router-link class="ghost" :to="{ name: 'businesses' }">Mi Negocio</router-link>
      <router-link class="ghost" :to="{ name: 'services' }">Productos/Servicios</router-link>
      <router-link class="save" :to="{ name: 'home' }">Ir a Tienda</router-link>
      <button class="ghost" type="button" @click="logout">Cerrar sesión</button>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.panel-title {
  margin-bottom: 12px;
  text-align: center;
  font-family: var(--font-ui);
}

.panel-title h2 {
  margin: 0;
  font-size: 20px;
  line-height: 26px;
  font-weight: 700;
  letter-spacing: -0.015em;
  text-transform: uppercase;
}

.panel-title p {
  margin: 2px 0 0;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.owner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--font-ui);
}

.profile,
.plan,
.menu a {
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.profile {
  padding: 20px 16px;
  text-align: center;
}

.profile h3 {
  margin: 0;
  font-size: 20px;
  line-height: 26px;
}

.profile p {
  margin: 4px 0 0;
  color: #5c5e65;
  font-size: 14px;
}

.dial {
  display: inline-flex;
  margin-top: 8px;
  padding: 4px 12px;
  border-radius: 999px;
  background: #e8eefd;
  color: var(--color-ink);
  font-weight: 600;
}

.plan {
  padding: 14px;
}

.plan header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.plan strong {
  color: #006740;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.plan header span {
  padding: 2px 8px;
  border-radius: 999px;
  background: #008352;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.plan.error {
  background: #fff5f5;
}

.plan.error strong,
.plan.error p {
  color: var(--color-brand);
}

.plan.error header span {
  background: var(--color-brand);
}

.plan p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 16px;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu a {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 16px;
  color: var(--color-ink);
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
}

.menu a::after {
  content: '›';
  margin-left: auto;
  color: #5c5e65;
  font-size: 22px;
  font-weight: 400;
}

.admin {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--font-ui);
}

.session {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
  color: #5c5e65;
  font-size: 12px;
  font-weight: 600;
}

.session span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: var(--radius-card);
  padding: 16px;
  box-shadow: var(--shadow-soft);
}

.card label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.card input {
  height: 44px;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-control);
  background: #f8fafc;
  padding: 0 12px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-ink);
}

.card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.card h3 {
  margin: 0;
  font-size: 16px;
}

.card header span {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
}

.card a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 4px;
  border-top: 1px solid #f1f5f9;
  color: var(--color-brand);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.card a b {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff7ed;
  color: #d97706;
  font-size: 11px;
}

.save,
.ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  font-family: var(--font-ui);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.save {
  background: var(--color-brand);
  color: #fff;
}

.ghost {
  background: #cbd5e1;
  color: #334155;
}
</style>
