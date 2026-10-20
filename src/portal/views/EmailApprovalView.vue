<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

type UserType = 'CLIENTE' | 'EMPRESARIO'
type Filter = 'todos' | UserType

interface PendingEmail {
  id: number
  createdAt: string
  isActive: boolean
  pendingEmpresario: boolean
  plan: string | null
  planName: string | null
  planCommercialName: string | null
  pendingPlanName: string | null
  firstName: string
  lastName: string
  email: string
  phone: string
  userType: UserType
}

const rows = ref<PendingEmail[]>([])
const error = ref('')
const notice = ref('')
const loading = ref(true)
const filter = ref<Filter>('todos')
const search = ref('')
const approving = ref<number | null>(null)

const typeLabel: Record<UserType, string> = {
  CLIENTE: 'Cliente',
  EMPRESARIO: 'Empresario',
}

function when(value: string) {
  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function waitsForActivation(row: PendingEmail) {
  const free = row.plan === 'FREE' || row.planName === 'Libre'
  return row.userType === 'EMPRESARIO' && !free
}

function nextStep(row: PendingEmail) {
  if (waitsForActivation(row)) {
    return 'Al aprobar, el correo queda verificado. La cuenta sigue esperando la activación en Usuarios y Estados.'
  }
  if (row.pendingEmpresario) {
    return 'Al aprobar, el correo queda verificado y ya puede iniciar sesión como cliente. El plan de empresario sigue pendiente de activación.'
  }
  return 'Al aprobar, el correo queda verificado y ya puede iniciar sesión.'
}

const visible = computed(() => {
  const query = normalize(search.value.trim())
  return rows.value.filter((row) => {
    if (filter.value !== 'todos' && row.userType !== filter.value) return false
    if (!query) return true
    const text = [row.firstName, row.lastName, row.email, row.phone, typeLabel[row.userType]].join(' ')
    return normalize(text).includes(query)
  })
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get<PendingEmail[]>('/user/pendientes-correo')
    rows.value = data
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

async function approve(row: PendingEmail) {
  if (approving.value) return
  approving.value = row.id
  error.value = ''
  notice.value = ''
  try {
    const { data } = await http.patch<{ message: string }>(`/user/${row.id}/verificar-correo`)
    rows.value = rows.value.filter((item) => item.id !== row.id)
    notice.value = `${row.firstName} ${row.lastName}: ${data.message}`
  } catch (err) {
    error.value = apiError(err)
  } finally {
    approving.value = null
  }
}

onMounted(load)
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Aprobación de correos</h2>
      <p>Cuentas registradas que aún no confirman el correo. Aprobar aquí equivale a que la persona abra el enlace.</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="notice" class="ok">{{ notice }}</p>
    <p v-if="loading" class="empty">Cargando…</p>
    <template v-else>
      <div class="toolbar">
        <div class="segment">
          <button type="button" :class="{ on: filter === 'todos' }" @click="filter = 'todos'">Todos</button>
          <button type="button" :class="{ on: filter === 'CLIENTE' }" @click="filter = 'CLIENTE'">Clientes</button>
          <button type="button" :class="{ on: filter === 'EMPRESARIO' }" @click="filter = 'EMPRESARIO'">Empresarios</button>
        </div>
        <label class="seek">
          <span>Buscar</span>
          <input v-model="search" type="search" placeholder="Nombre, correo o teléfono" />
        </label>
      </div>
      <p class="count">{{ visible.length }} pendiente{{ visible.length === 1 ? '' : 's' }}</p>
      <p v-if="!visible.length" class="empty">No hay correos pendientes de verificación.</p>
      <div v-else class="list">
        <article v-for="row in visible" :key="row.id" class="card">
          <header>
            <div>
              <p class="kind">{{ typeLabel[row.userType] }}</p>
              <h3>{{ row.firstName }} {{ row.lastName }}</h3>
            </div>
            <span class="badge">Pendiente</span>
          </header>
          <p class="meta">{{ row.email }}</p>
          <p v-if="row.phone" class="meta">{{ row.phone }}</p>
          <p class="when">Registrado el {{ when(row.createdAt) }}</p>
          <p class="next">{{ nextStep(row) }}</p>
          <button class="approve" type="button" :disabled="approving === row.id" @click="approve(row)">
            {{ approving === row.id ? 'Aprobando…' : 'Aprobar correo' }}
          </button>
        </article>
      </div>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 14px; text-align: center; }
.head h2 { margin: 0; font-size: 22px; line-height: 28px; font-weight: 800; letter-spacing: -0.02em; }
.head p { margin: 6px auto 0; max-width: 340px; color: var(--color-muted); font-size: 13px; line-height: 18px; }
.error { margin: 0 0 10px; color: var(--color-brand); font-size: 13px; font-weight: 700; }
.ok { margin: 0 0 10px; color: #006740; font-size: 13px; font-weight: 700; line-height: 18px; }
.toolbar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
.segment {
  display: grid;
  grid-template-columns: 1fr 1fr 1.15fr;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-control);
  background: #e8eef5;
}
.segment button {
  min-height: 36px;
  border: 0;
  border-radius: var(--radius-mark);
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}
.segment button.on { background: var(--color-brand); color: #fff; }
.seek span { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 700; }
.seek input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: #fff;
  font: inherit;
  font-weight: 600;
}
.count { margin: 0 0 10px; color: var(--color-muted); font-size: 12px; font-weight: 700; }
.empty { color: var(--color-muted); font-size: 13px; }
.list { display: flex; flex-direction: column; gap: 10px; }
.card {
  padding: 12px;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.card header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.kind {
  margin: 0 0 2px;
  color: var(--color-brand);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.card h3 { margin: 0; font-size: 16px; line-height: 22px; }
.badge {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fffbeb;
  color: #b45309;
  font-size: 11px;
  font-weight: 700;
}
.meta, .when, .next { margin: 6px 0 0; color: var(--color-muted); font-size: 13px; line-height: 18px; }
.when { color: var(--color-ink); font-weight: 600; }
.next { font-size: 12px; line-height: 16px; }
.approve {
  width: 100%;
  height: 48px;
  margin-top: 10px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.approve:disabled { opacity: 0.7; cursor: default; }

@media (min-width: 1024px) {
  .head h2 { font-size: 28px; }
  .head p { max-width: 520px; font-size: 15px; line-height: 22px; }
  .list { max-width: 720px; margin: 0 auto; }
  .card { padding: 16px 18px; }
  .card h3 { font-size: 18px; }
}
</style>
