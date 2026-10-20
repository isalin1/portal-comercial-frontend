<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { isLimaMetroGeo } from '../limaMetro'
import type { AccountUser, Zone } from '../types'

type Filter = 'activos' | 'inactivos' | 'todos'

type PlanBucket = { name: string; members: ListedUser[] }
type ZoneBucket = { key: string; name: string; plans: PlanBucket[]; count: number }
type RegionBucket = { key: string; name: string; zones: ZoneBucket[]; count: number }

type Removal = { canDelete: boolean; canInactivate: boolean; reason: string }
type ListedUser = AccountUser & { removal?: Removal }

const users = ref<ListedUser[]>([])
const clients = ref<ListedUser[]>([])
const error = ref('')
const pendingDelete = ref<ListedUser | null>(null)
const acting = ref(false)
const filter = ref<Filter>('todos')
const search = ref('')

function day(value?: string | null) {
  return value ? value.slice(0, 10) : 'Sin fecha'
}

function businessName(user: AccountUser) {
  return user.businesses?.[0]?.commercialName || user.businesses?.[0]?.legalName || 'Sin negocio'
}

function categoryName(user: AccountUser) {
  return user.businesses?.[0]?.category?.name || 'Sin categoría'
}

function zoneLabel(zone?: Zone | null) {
  if (!zone) return 'Sin zona'
  const district = zone.district?.name
  return district ? `${zone.name} · ${district}` : zone.name
}

function userZone(user: AccountUser): Zone | null {
  return user.businesses?.[0]?.zone || null
}

function clientZoneLabel(user: AccountUser) {
  return zoneLabel(user.referenceZone)
}

const freeDayOptions = [7, 15, 30, 60, 90, 180, 360]
const freePlanDays = ref(30)
const planMessage = ref('')

const planOrder = [
  'Plan Free',
  'Plan mensual',
  'Plan trimestral',
  'Plan semestral',
  'Plan anual',
  'Sin plan',
]

const regionOrder = ['lima', 'otros', 'sin']

function pendingName(user: AccountUser) {
  const plan = user.pendingPlan
  if (!plan) return ''
  if (plan.name === 'Libre') return 'Plan Free'
  return `${plan.commercialName} · ${plan.name}`
}

function planName(user: AccountUser) {
  const name = user.planCatalog?.name
  if (name === 'Libre' || user.plan === 'FREE') return 'Plan Free'
  if (name === 'Mensual' || (!name && user.vigenciaDays === 30)) return 'Plan mensual'
  if (name === 'Trimestral' || (!name && user.vigenciaDays === 90)) return 'Plan trimestral'
  if (name === 'Semestral' || (!name && user.vigenciaDays === 180)) return 'Plan semestral'
  if (name === 'Anual' || (!name && user.vigenciaDays === 360)) return 'Plan anual'
  return 'Sin plan'
}

function matches(user: ListedUser, business = false) {
  if (filter.value === 'activos' && !user.isActive) return false
  if (filter.value === 'inactivos' && user.isActive) return false
  const query = search.value.trim().toLowerCase()
  if (!query) return true
  const text = [
    user.datUser.firstName,
    user.datUser.lastName,
    user.datUser.phone,
    user.datUser.email,
    business ? businessName(user) : '',
    business ? categoryName(user) : '',
    business ? zoneLabel(userZone(user)) : clientZoneLabel(user),
  ]
    .join(' ')
    .toLowerCase()
  return text.includes(query)
}

const visible = computed(() => users.value.filter((user) => matches(user, true)))

const visibleClients = computed(() => clients.value.filter((user) => matches(user)))

async function saveFreePlan(days: number) {
  error.value = ''
  planMessage.value = ''
  try {
    const { data } = await http.patch<{ freePlanDays: number }>('/settings/vigencia-free', { days })
    freePlanDays.value = data.freePlanDays
    planMessage.value = `La vigencia del plan Free quedó en ${data.freePlanDays} días`
  } catch (err) {
    error.value = apiError(err)
  }
}

function sortPlans(plans: PlanBucket[]) {
  return plans.sort((a, b) => {
    const left = planOrder.indexOf(a.name)
    const right = planOrder.indexOf(b.name)
    return (left === -1 ? 99 : left) - (right === -1 ? 99 : right)
  })
}

const regionGroups = computed((): RegionBucket[] => {
  const regions = new Map<string, { name: string; zones: Map<string, { name: string; plans: Map<string, AccountUser[]> }> }>()

  for (const user of visible.value) {
    const zone = userZone(user)
    let regionKey = 'sin'
    let regionName = 'Sin ubicación'
    if (zone) {
      const metro = isLimaMetroGeo(zone)
      regionKey = metro ? 'lima' : 'otros'
      regionName = metro ? 'Lima Metropolitana' : 'Otros departamentos'
    }
    const zoneKey = zone ? `z-${zone.id}` : 'sin-zona'
    const zoneName = zoneLabel(zone)
    const plan = planName(user)

    if (!regions.has(regionKey)) {
      regions.set(regionKey, { name: regionName, zones: new Map() })
    }
    const region = regions.get(regionKey)!
    if (!region.zones.has(zoneKey)) {
      region.zones.set(zoneKey, { name: zoneName, plans: new Map() })
    }
    const zoneBucket = region.zones.get(zoneKey)!
    zoneBucket.plans.set(plan, [...(zoneBucket.plans.get(plan) || []), user])
  }

  return [...regions.entries()]
    .sort((a, b) => regionOrder.indexOf(a[0]) - regionOrder.indexOf(b[0]))
    .map(([key, region]) => {
      const zones = [...region.zones.entries()]
        .sort((a, b) => a[1].name.localeCompare(b[1].name, 'es'))
        .map(([zoneKey, zone]) => {
          const plans = sortPlans(
            [...zone.plans.entries()].map(([name, members]) => ({ name, members })),
          )
          return {
            key: zoneKey,
            name: zone.name,
            plans,
            count: plans.reduce((sum, plan) => sum + plan.members.length, 0),
          }
        })
      return {
        key,
        name: region.name,
        zones,
        count: zones.reduce((sum, zone) => sum + zone.count, 0),
      }
    })
})

async function loadUsers() {
  const [empresarios, registrados] = await Promise.all([
    http.get<ListedUser[]>('/user/empresarios'),
    http.get<ListedUser[]>('/user/clients'),
  ])
  users.value = empresarios.data
  clients.value = registrados.data
}

async function inactivate(user: ListedUser) {
  error.value = ''
  acting.value = true
  try {
    await http.patch(`/user/${user.id}/status`, { isActive: false })
    user.isActive = false
  } catch (err) {
    error.value = apiError(err)
  } finally {
    acting.value = false
  }
}

async function confirmDelete() {
  const user = pendingDelete.value
  if (!user) return
  error.value = ''
  acting.value = true
  try {
    await http.delete(`/user/${user.id}`)
    users.value = users.value.filter((item) => item.id !== user.id)
    clients.value = clients.value.filter((item) => item.id !== user.id)
    pendingDelete.value = null
  } catch (err) {
    error.value = apiError(err)
  } finally {
    acting.value = false
  }
}

onMounted(async () => {
  try {
    const settings = await http.get<{ freePlanDays: number }>('/settings')
    freePlanDays.value = settings.data.freePlanDays || 30
    await loadUsers()
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Usuarios y estados</h2>
      <p>Gestión centralizada de cuentas, vigencias y suscripciones</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="toolbar">
      <div class="segment">
        <button type="button" :class="{ on: filter === 'activos' }" @click="filter = 'activos'">Activos</button>
        <button type="button" :class="{ on: filter === 'inactivos' }" @click="filter = 'inactivos'">Inactivos</button>
        <button type="button" :class="{ on: filter === 'todos' }" @click="filter = 'todos'">Todos</button>
      </div>
      <label class="seek">
        <span>Buscar usuario</span>
        <input v-model="search" type="search" placeholder="Nombre, celular, correo o negocio" />
        <button v-if="search" type="button" aria-label="Limpiar búsqueda" @click="search = ''">×</button>
      </label>
    </div>
    <section class="rule">
      <header>
        <h3>Vigencia del plan Free para nuevos empresarios</h3>
        <span>Regla global</span>
      </header>
      <div class="pills">
        <button
          v-for="option in freeDayOptions"
          :key="option"
          type="button"
          :class="{ on: freePlanDays === option }"
          @click="saveFreePlan(option)"
        >
          {{ option }} días
        </button>
      </div>
    </section>
    <p v-if="planMessage" class="ok">{{ planMessage }}</p>
    <section class="rules">
      <h3>Eliminación de cuentas</h3>
      <ul>
        <li>Cliente o empresario que solo se registró y no confirmó el correo: a las 24 horas del enlace se elimina automáticamente y ese correo queda libre para otro registro.</li>
        <li>Cliente con correo confirmado: no se puede eliminar hasta cumplir 12 meses. Sí se puede inactivar.</li>
        <li>Empresario con correo confirmado y sin plan asignado: pasadas 48 horas, el administrador puede eliminarlo y el correo queda libre.</li>
      </ul>
    </section>
    <p v-if="!visible.length" class="empty">No hay empresarios para este filtro.</p>
    <section v-for="region in regionGroups" :key="region.key" class="region">
      <header class="region-head">
        <h3>{{ region.name }}</h3>
        <span>{{ region.count === 1 ? '1 cuenta' : `${region.count} cuentas` }}</span>
      </header>
      <section v-for="zone in region.zones" :key="`${region.key}-${zone.key}`" class="zone-block">
        <header class="zone-head">
          <h4>{{ zone.name }}</h4>
          <span>{{ zone.count === 1 ? '1 cuenta' : `${zone.count} cuentas` }}</span>
        </header>
        <section v-for="plan in zone.plans" :key="`${region.key}-${zone.key}-${plan.name}`" class="group">
          <header>
            <h3><i />{{ plan.name }}</h3>
            <span>{{ plan.members.length === 1 ? '1 cuenta' : `${plan.members.length} cuentas` }}</span>
          </header>
          <div class="tiles">
            <article v-for="user in plan.members" :key="user.id">
              <div class="who">
                <h4>{{ user.datUser.firstName }} {{ user.datUser.lastName }}</h4>
                <b :class="{ off: !user.isActive }" :title="user.isActive ? 'Activo' : 'Inactivo'" />
              </div>
              <p class="dial">{{ user.datUser.phone || 'Sin celular' }}</p>
              <p>{{ planName(user) }} · {{ user.isActive ? 'Activo' : 'Inactivo' }} · {{ businessName(user) }}</p>
              <p :class="{ missing: !user.businesses?.[0]?.category }">{{ categoryName(user) }}</p>
              <p class="end">Fin: {{ day(user.vigenciaEnd) }}</p>
              <p v-if="!user.emailVerifiedAt" class="wait">Correo sin verificar</p>
              <p v-if="user.pendingEmpresario" class="wait">Solicita plan empresario · sigue como cliente</p>
              <p v-if="user.pendingPlan" class="wait">Luego: {{ pendingName(user) }}</p>
              <p v-if="user.removal" class="rule-line">{{ user.removal.reason }}</p>
              <div class="actions">
                <router-link :to="{ name: 'vigencia', params: { id: user.id } }">Editar</router-link>
                <button
                  v-if="user.removal?.canDelete"
                  type="button"
                  class="danger"
                  :disabled="acting"
                  @click="pendingDelete = user"
                >
                  Eliminar
                </button>
              </div>
            </article>
          </div>
        </section>
      </section>
    </section>
    <section class="group">
      <header>
        <h3><i class="client" />Clientes</h3>
        <span>{{ visibleClients.length === 1 ? '1 registrado' : `${visibleClients.length} registrados` }}</span>
      </header>
      <p v-if="!visibleClients.length" class="empty">No hay clientes para este filtro.</p>
      <div v-else class="tiles">
        <article v-for="user in visibleClients" :key="user.id">
          <div class="who">
            <h4>{{ user.datUser.firstName }} {{ user.datUser.lastName }}</h4>
            <b :class="{ off: !user.isActive }" :title="user.isActive ? 'Activo' : 'Inactivo'" />
          </div>
          <p class="dial">{{ user.datUser.phone || 'Sin celular' }}</p>
          <p class="mail">{{ user.datUser.email }}</p>
          <p class="zone-ref">Zona: {{ clientZoneLabel(user) }}</p>
          <p class="live" :class="{ off: !user.isActive }">{{ user.isActive ? 'Activo' : 'Inactivo' }}</p>
          <p v-if="!user.emailVerifiedAt" class="wait">Correo sin verificar</p>
          <p v-if="user.removal" class="rule-line">{{ user.removal.reason }}</p>
          <div class="actions">
            <router-link :to="{ name: 'vigencia', params: { id: user.id } }">Editar</router-link>
            <button
              v-if="user.removal?.canInactivate && user.isActive"
              type="button"
              :disabled="acting"
              @click="inactivate(user)"
            >
              Inactivar
            </button>
            <button
              v-if="user.removal?.canDelete"
              type="button"
              class="danger"
              :disabled="acting"
              @click="pendingDelete = user"
            >
              Eliminar
            </button>
          </div>
        </article>
      </div>
    </section>
    <div v-if="pendingDelete" class="modal-back" @click.self="pendingDelete = null">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <h3 id="delete-title">Eliminar cuenta</h3>
        <p>
          ¿Eliminar a {{ pendingDelete.datUser.firstName }} {{ pendingDelete.datUser.lastName }}?
          El correo {{ pendingDelete.datUser.email }} quedará disponible para un nuevo registro.
        </p>
        <div class="modal-actions">
          <button type="button" :disabled="acting" @click="pendingDelete = null">Cancelar</button>
          <button type="button" class="danger" :disabled="acting" @click="confirmDelete">
            {{ acting ? 'Eliminando…' : 'Eliminar' }}
          </button>
        </div>
      </section>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 16px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.head p { margin: 6px 0 0; color: #64748b; font-size: 12px; }
.segment {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  margin-bottom: 14px;
  padding: 4px;
  border-radius: 12px;
  background: #e8eef5;
}
.segment button {
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #0f172a;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}
.segment button.on { background: var(--color-brand); color: #fff; }
.seek { display: block; position: relative; margin-bottom: 14px; }
.seek span { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 700; }
.seek input {
  width: 100%;
  min-height: 48px;
  padding: 10px 36px 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  font: inherit;
  font-weight: 600;
}
.seek button {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #e2e8f0;
  color: #334155;
  font: inherit;
  font-size: 16px;
}
.rule {
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.rule header, .group header, .region-head, .zone-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.rule h3 { margin: 0; font-size: 14px; line-height: 1.3; }
.rule header span, .group header span, .region-head span, .zone-head span {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
}
.pills { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; }
.pills button {
  flex: none;
  min-height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: 12px;
  background: #e2e8f0;
  color: #0f172a;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}
.pills button.on { background: var(--color-brand); color: #fff; }
.region { margin-bottom: 20px; }
.region-head { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid var(--color-brand); }
.region-head h3 {
  margin: 0;
  color: var(--color-brand);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.zone-block {
  margin: 0 0 14px;
  padding: 12px;
  border-radius: 16px;
  background: #f8fafc;
}
.zone-head { margin-bottom: 10px; }
.zone-head h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}
.group { margin-bottom: 12px; }
.group:last-child { margin-bottom: 0; }
.group header { margin-bottom: 10px; }
.group h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.group h3 i { width: 8px; height: 8px; border-radius: 50%; background: var(--color-brand); }
.group h3 i.client { background: #64748b; }
.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tiles article {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 12px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.who { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
.tiles h4 {
  margin: 0;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.who b { flex: none; width: 8px; height: 8px; margin-top: 4px; border-radius: 50%; background: #059669; }
.who b.off { background: #94a3b8; }
.tiles p { margin: 4px 0 0; color: #64748b; font-size: 11px; line-height: 1.35; }
.dial { color: #475569; font-weight: 700; }
.missing { font-style: italic; }
.end { font-weight: 600; }
.wait { color: #b45309; }
.mail { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.zone-ref { color: #334155; font-weight: 600; }
.live { color: #047857; font-weight: 700; }
.live.off { color: #64748b; }
.rules {
  margin: 0 0 14px;
  padding: 12px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.rules h3 { margin: 0 0 8px; font-size: 14px; }
.rules ul { margin: 0; padding-left: 18px; }
.rules li { margin: 0 0 6px; color: #334155; font-size: 12px; line-height: 16px; }
.rules li:last-child { margin-bottom: 0; }
.rule-line { color: #334155; font-size: 11px; line-height: 1.35; }
.actions { display: flex; flex-direction: column; gap: 6px; margin-top: auto; padding-top: 10px; }
.actions a, .actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border: 0;
  border-radius: 10px;
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}
.actions button { background: #e2e8f0; color: #0f172a; }
.actions button.danger { background: #fff; color: var(--color-brand); box-shadow: inset 0 0 0 1px var(--color-brand); }
.actions button:disabled { opacity: 0.6; cursor: default; }
.modal-back {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
}
.modal {
  width: min(360px, 100%);
  padding: 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.modal h3 { margin: 0 0 8px; font-size: 18px; }
.modal p { margin: 0; color: #334155; font-size: 14px; line-height: 20px; }
.modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
.modal-actions button {
  height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  background: #e2e8f0;
  color: #0f172a;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.modal-actions button.danger { background: var(--color-brand); color: #fff; }
.modal-actions button:disabled { opacity: 0.7; cursor: default; }
.empty { margin: 0 0 12px; color: #64748b; font-size: 13px; }

.toolbar {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 24px;
  }

  .head h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .head p {
    font-size: 14px;
  }

  .toolbar {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 16px;
    align-items: end;
    margin-bottom: 8px;
  }

  .segment {
    margin-bottom: 0;
    min-width: 280px;
  }

  .seek {
    margin-bottom: 0;
  }

  .tiles {
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .zone-block {
    padding: 16px;
  }
}
</style>
