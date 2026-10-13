<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

type ConsentKind = 'DATA_USE' | 'SERVICE_CONTRACT'
type ConsentStatus = 'ACCEPTED' | 'REVOKED' | 'PENDING'

interface ConsentRow {
  id: number
  userId: number
  kind: ConsentKind
  documentVersion: string
  documentTitle: string
  summaryText: string
  documentHash: string
  acceptanceMethod: string
  status: ConsentStatus
  accepted: boolean
  acceptedAt: string
  userTypeAtAccept: string
  ipAddress?: string | null
  deviceInfo?: string | null
  firstName: string
  lastName: string
  email: string
  phone: string
  currentUserType: string
}

const rows = ref<ConsentRow[]>([])
const error = ref('')
const filter = ref<'todos' | ConsentKind>('todos')
const search = ref('')
const expanded = ref<number | null>(null)

const kindLabel: Record<ConsentKind, string> = {
  DATA_USE: 'Uso de información',
  SERVICE_CONTRACT: 'Contrato de servicios',
}

const statusLabel: Record<ConsentStatus, string> = {
  ACCEPTED: 'Aceptado',
  REVOKED: 'Revocado',
  PENDING: 'Pendiente',
}

const methodLabel: Record<string, string> = {
  checkbox: 'Checkbox',
  button: 'Botón',
  digital_signature: 'Firma digital',
}

const typeLabel: Record<string, string> = {
  CLIENTE: 'Cliente',
  EMPRESARIO: 'Empresario',
  ADMIN: 'Admin',
}

function when(value: string) {
  const date = new Date(value)
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortHash(hash?: string) {
  if (!hash) return '—'
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const visible = computed(() => {
  const query = normalize(search.value.trim())
  return rows.value.filter((row) => {
    if (filter.value !== 'todos' && row.kind !== filter.value) return false
    if (!query) return true
    const text = [
      row.firstName,
      row.lastName,
      row.email,
      row.phone,
      row.documentTitle,
      row.documentVersion,
      row.documentHash,
      row.acceptanceMethod,
      String(row.userId),
    ].join(' ')
    return normalize(text).includes(query)
  })
})

onMounted(async () => {
  try {
    const { data } = await http.get<ConsentRow[]>('/user/autorizaciones')
    rows.value = data
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Auditoría de autorizaciones</h2>
      <p>Registro de aceptaciones de términos y contratos por parte de los usuarios</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-else class="toolbar">
      <div class="segment">
        <button type="button" :class="{ on: filter === 'todos' }" @click="filter = 'todos'">Todas</button>
        <button type="button" :class="{ on: filter === 'DATA_USE' }" @click="filter = 'DATA_USE'">Uso de información</button>
        <button type="button" :class="{ on: filter === 'SERVICE_CONTRACT' }" @click="filter = 'SERVICE_CONTRACT'">Contrato</button>
      </div>
      <label class="seek">
        <span>Buscar</span>
        <input v-model="search" type="search" placeholder="Nombre, correo, celular o ID" />
      </label>
    </div>
    <p class="count">{{ visible.length === 1 ? '1 registro' : `${visible.length} registros` }}</p>
    <p v-if="!visible.length" class="empty">No hay autorizaciones para este filtro.</p>
    <div v-else class="list">
      <article v-for="row in visible" :key="row.id" class="card">
        <header>
          <div>
            <p class="kind">{{ kindLabel[row.kind] }} · {{ row.documentVersion }}</p>
            <h3>{{ row.firstName }} {{ row.lastName }}</h3>
          </div>
          <div class="tags">
            <span class="badge status" :class="row.status.toLowerCase()">{{ statusLabel[row.status] || row.status }}</span>
            <span class="badge">{{ typeLabel[row.userTypeAtAccept] || row.userTypeAtAccept }}</span>
          </div>
        </header>
        <p class="meta">{{ row.email }} · {{ row.phone || 'Sin celular' }}</p>
        <p class="when">{{ when(row.acceptedAt) }} · {{ methodLabel[row.acceptanceMethod] || row.acceptanceMethod }}</p>
        <p class="hash" :title="row.documentHash">Hash: {{ shortHash(row.documentHash) }}</p>
        <p v-if="row.ipAddress" class="ip">IP: {{ row.ipAddress }}</p>
        <p v-if="row.deviceInfo" class="device" :title="row.deviceInfo">Dispositivo: {{ row.deviceInfo }}</p>
        <button type="button" class="more" @click="expanded = expanded === row.id ? null : row.id">
          {{ expanded === row.id ? 'Ocultar texto' : 'Ver texto aceptado' }}
        </button>
        <p v-if="expanded === row.id" class="summary">{{ row.summaryText }}</p>
      </article>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 16px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.head p { margin: 6px auto 0; max-width: 320px; color: #64748b; font-size: 12px; line-height: 16px; }
.toolbar { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
.segment {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 4px;
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
  font-size: 11px;
  font-weight: 700;
}
.segment button.on { background: var(--color-brand); color: #fff; }
.seek span { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 700; }
.seek input {
  width: 100%;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  font: inherit;
  font-weight: 600;
}
.count { margin: 0 0 10px; color: #64748b; font-size: 12px; font-weight: 700; }
.empty { color: #64748b; font-size: 13px; }
.list { display: flex; flex-direction: column; gap: 12px; }
.card {
  padding: 14px;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.card header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.kind {
  margin: 0 0 4px;
  color: var(--color-brand);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.card h3 { margin: 0; font-size: 16px; line-height: 22px; }
.tags { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.badge {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
}
.badge.status.accepted { background: #dcfce7; color: #166534; }
.badge.status.revoked { background: #fee2e2; color: #991b1b; }
.badge.status.pending { background: #fffbeb; color: #b45309; }
.meta, .when, .ip, .hash, .device { margin: 6px 0 0; color: #64748b; font-size: 12px; line-height: 16px; }
.when { font-weight: 600; color: #334155; }
.hash, .device {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
}
.device { font-family: inherit; white-space: nowrap; }
.more {
  margin-top: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-brand);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
.summary {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  line-height: 18px;
}

@media (min-width: 1024px) {
  .head h2 { font-size: 32px; }
  .head p { max-width: 480px; font-size: 14px; line-height: 20px; }
  .toolbar {
    display: grid;
    grid-template-columns: minmax(320px, 420px) 1fr;
    gap: 16px;
    align-items: end;
  }
  .list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .card { padding: 18px 20px; }
  .card h3 { font-size: 18px; }
}
</style>
