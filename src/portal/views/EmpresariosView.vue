<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { AccountUser } from '../types'

type Filter = 'activos' | 'inactivos' | 'todos'

const users = ref<AccountUser[]>([])
const clients = ref<AccountUser[]>([])
const error = ref('')
const filter = ref<Filter>('todos')
const search = ref('')

function day(value?: string | null) {
  return value ? value.slice(0, 10) : 'Sin fecha'
}

function businessName(user: AccountUser) {
  return user.businesses?.[0]?.commercialName || user.businesses?.[0]?.legalName || 'Sin negocio'
}

function rubroName(user: AccountUser) {
  return user.businesses?.[0]?.rubro?.name || 'Sin rubro'
}

function categoryName(user: AccountUser) {
  return user.businesses?.[0]?.category?.name || 'Sin categoría'
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

function matches(user: AccountUser, business = false) {
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

const groups = computed(() => {
  const buckets = new Map<string, AccountUser[]>()
  for (const user of visible.value) {
    const name = planName(user)
    buckets.set(name, [...(buckets.get(name) || []), user])
  }
  return [...buckets.entries()].sort((a, b) => {
    const left = planOrder.indexOf(a[0])
    const right = planOrder.indexOf(b[0])
    return (left === -1 ? 99 : left) - (right === -1 ? 99 : right)
  })
})

onMounted(async () => {
  try {
    const [empresarios, registrados, settings] = await Promise.all([
      http.get<AccountUser[]>('/user/empresarios'),
      http.get<AccountUser[]>('/user/clients'),
      http.get<{ freePlanDays: number }>('/settings'),
    ])
    users.value = empresarios.data
    clients.value = registrados.data
    freePlanDays.value = settings.data.freePlanDays || 30
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
    <p v-if="!visible.length" class="empty">No hay empresarios para este filtro.</p>
    <section v-for="[name, members] in groups" :key="name" class="group">
      <header>
        <h3><i />{{ name }}</h3>
        <span>{{ members.length === 1 ? '1 cuenta' : `${members.length} cuentas` }}</span>
      </header>
      <div class="tiles">
        <article v-for="user in members" :key="user.id">
          <div class="who">
            <h4>{{ user.datUser.firstName }} {{ user.datUser.lastName }}</h4>
            <b :class="{ off: !user.isActive }" :title="user.isActive ? 'Activo' : 'Inactivo'" />
          </div>
          <p class="dial">{{ user.datUser.phone || 'Sin celular' }}</p>
          <p>{{ planName(user) }} · {{ user.isActive ? 'Activo' : 'Inactivo' }} · {{ businessName(user) }}</p>
          <p :class="{ missing: !user.businesses?.[0]?.category }">{{ categoryName(user) }}</p>
          <p class="end">Fin: {{ day(user.vigenciaEnd) }}</p>
          <p v-if="user.pendingEmpresario" class="wait">Solicita plan empresario · sigue como cliente</p>
          <p v-if="user.pendingPlan" class="wait">Luego: {{ pendingName(user) }}</p>
          <router-link :to="{ name: 'vigencia', params: { id: user.id } }">Editar</router-link>
        </article>
      </div>
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
          <p class="live" :class="{ off: !user.isActive }">{{ user.isActive ? 'Activo' : 'Inactivo' }}</p>
          <router-link :to="{ name: 'vigencia', params: { id: user.id } }">Editar</router-link>
        </article>
      </div>
    </section>
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
.rule header, .group header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.rule h3 { margin: 0; font-size: 14px; line-height: 1.3; }
.rule header span, .group header span {
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
.group { margin-bottom: 16px; }
.group header { margin-bottom: 10px; }
.group h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
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
.live { color: #047857; font-weight: 700; }
.live.off { color: #64748b; }
.tiles a {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  margin-top: auto;
  padding-top: 10px;
  border-radius: 10px;
  background: var(--color-brand);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}
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
    max-width: 480px;
    margin: 10px auto 0;
    font-size: 15px;
    line-height: 22px;
  }

  .toolbar {
    display: grid;
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    gap: 16px;
    align-items: end;
    margin-bottom: 8px;
  }

  .segment {
    margin-bottom: 0;
  }

  .segment button {
    min-height: 40px;
    font-size: 13px;
  }

  .seek {
    margin-bottom: 14px;
  }

  .seek span {
    font-size: 13px;
  }

  .rule {
    padding: 18px 20px;
    margin-bottom: 20px;
  }

  .rule h3 {
    font-size: 16px;
  }

  .pills {
    flex-wrap: wrap;
    overflow: visible;
    gap: 10px;
    margin-top: 14px;
  }

  .pills button {
    min-height: 40px;
    padding: 0 16px;
    font-size: 13px;
  }

  .group {
    margin-bottom: 22px;
  }

  .group h3 {
    font-size: 14px;
  }

  .tiles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .tiles article {
    padding: 16px 18px;
  }

  .tiles h4 {
    font-size: 16px;
  }

  .tiles p {
    font-size: 12px;
  }

  .tiles a {
    min-height: 40px;
    font-size: 13px;
  }

  .empty {
    font-size: 14px;
  }
}
</style>
