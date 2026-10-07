<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

type DayPayment = {
  id: number
  userId: number
  firstName: string
  lastName: string
  days: number
  amount: string | number
  planName: string
  commercialName?: string
  paidOn?: string
}

const date = ref(limaToday())
const rows = ref<DayPayment[]>([])
const loading = ref(false)
const error = ref('')

const dateLabel = computed(() => {
  const [y, m, d] = date.value.split('-').map(Number)
  if (!y || !m || !d) return date.value
  const local = new Date(y, m - 1, d)
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(local)
})

const totalAmount = computed(() =>
  rows.value.reduce((sum, row) => sum + Number(row.amount || 0), 0),
)

function limaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}

function money(value: number | string) {
  return `S/ ${Number(value || 0).toFixed(2)}`
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('es-PE') + word.slice(1).toLocaleLowerCase('es-PE'))
    .join(' ')
}

function fullName(row: DayPayment) {
  const name = [row.firstName, row.lastName]
    .map((part) => titleCase(part || ''))
    .filter(Boolean)
    .join(' ')
  return name || 'Sin nombre'
}

function initials(row: DayPayment) {
  const a = (row.firstName || '').trim().charAt(0)
  const b = (row.lastName || '').trim().charAt(0)
  return `${a}${b}`.toLocaleUpperCase('es-PE') || '?'
}

function planLabel(row: DayPayment) {
  if (row.commercialName && row.planName) return `Plan ${row.planName}`
  if (row.planName) return row.planName.startsWith('Plan ') ? row.planName : `Plan ${row.planName}`
  return 'Plan'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get<DayPayment[]>('/user/pagos', { params: { date: date.value } })
    rows.value = data
  } catch (err) {
    error.value = apiError(err)
    rows.value = []
  } finally {
    loading.value = false
  }
}

function exportCsv() {
  const header = ['Nombre', 'Días', 'Plan', 'Monto', 'Estado']
  const lines = rows.value.map((row) =>
    [
      fullName(row),
      String(row.days),
      planLabel(row),
      Number(row.amount || 0).toFixed(2),
      'Pagado',
    ]
      .map((cell) => `"${cell.replace(/"/g, '""')}"`)
      .join(','),
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `planes-${date.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

watch(date, load)
onMounted(load)
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Reportes y Métricas</h2>
      <p class="chip"><i aria-hidden="true" /> Planes Registrados x Día</p>
    </header>

    <div class="top">
      <section class="picker">
        <div class="picker-top">
          <label for="report-date">Fecha seleccionada</label>
          <span class="online"><i aria-hidden="true" /> En línea</span>
        </div>
        <div class="field">
          <input id="report-date" v-model="date" type="date" />
        </div>
      </section>

      <section class="kpis">
        <article class="kpi">
          <span class="icon check" aria-hidden="true" />
          <span class="label">Registros hoy</span>
          <strong>{{ rows.length }}</strong>
          <p>{{ rows.length }} {{ rows.length === 1 ? 'plan registrado' : 'planes registrados' }}</p>
        </article>
        <article class="kpi brand">
          <span class="icon cash" aria-hidden="true" />
          <span class="label">Total Recaudado</span>
          <strong>{{ money(totalAmount) }}</strong>
          <p>Cobro efectivo total</p>
        </article>
      </section>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="list-head">
      <div>
        <h3>Detalle de Registros</h3>
        <span class="count">{{ rows.length }}</span>
      </div>
      <button type="button" :disabled="!rows.length" @click="exportCsv">
        Exportar
      </button>
    </section>

    <p v-if="loading" class="empty">Cargando…</p>
    <p v-else-if="!rows.length" class="empty">No hay planes registrados el {{ dateLabel }}.</p>

    <section v-else class="list">
      <article v-for="row in rows" :key="row.id" class="row">
        <div class="who">
          <span class="avatar">{{ initials(row) }}</span>
          <div class="info">
            <strong>{{ fullName(row) }}</strong>
            <div class="meta">
              <span class="days">{{ row.days }} días</span>
              <span>{{ planLabel(row) }}</span>
            </div>
          </div>
        </div>
        <div class="pay">
          <strong>{{ money(row.amount) }}</strong>
          <span>Pagado</span>
        </div>
      </article>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 14px;
  text-align: center;
}

.head h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: #e2e8f7;
  color: #5e3f3c;
  font-size: 12px;
  font-weight: 600;
}

.chip i {
  width: 14px;
  height: 14px;
  background: center / contain no-repeat
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e21221'%3E%3Cpath d='M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 18H5V10h14v10z'/%3E%3C/svg%3E");
}

.top {
  display: flex;
  flex-direction: column;
}

.picker {
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  padding: 12px;
  margin-bottom: 14px;
}

.picker-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.picker-top label {
  color: #5e3f3c;
  font-size: 12px;
  font-weight: 600;
}

.online {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #008352;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.online i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #008352;
}

.field input {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  background: #f0f3ff;
  padding: 0 14px;
  font: inherit;
  font-weight: 700;
  color: var(--color-ink);
}

.kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.kpi {
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.kpi.brand {
  background: var(--color-brand);
  color: #fff;
}

.icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  margin-bottom: 4px;
  background: #ffdad6 center / 18px no-repeat;
}

.kpi.brand .icon {
  background-color: rgba(255, 255, 255, 0.2);
}

.icon.check {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e21221'%3E%3Cpath d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/%3E%3C/svg%3E");
}

.icon.cash {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/%3E%3C/svg%3E");
}

.label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #60626a;
}

.kpi.brand .label {
  color: rgba(255, 255, 255, 0.8);
}

.kpi strong {
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.kpi.brand strong {
  font-size: 16px;
  line-height: 22px;
}

.kpi p {
  margin: 0;
  font-size: 12px;
  line-height: 16px;
  color: #5c5e65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi.brand p {
  color: rgba(255, 255, 255, 0.9);
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.list-head > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

h3 {
  margin: 0;
  font-size: 16px;
  line-height: 22px;
  font-weight: 800;
}

.count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #dde2f2;
  color: #5e3f3c;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.list-head button {
  border: 0;
  background: transparent;
  color: var(--color-brand);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.list-head button:disabled {
  opacity: 0.4;
  cursor: default;
}

.empty {
  margin: 12px 0;
  text-align: center;
  color: var(--color-muted);
  font-size: 14px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  padding: 12px;
}

.who {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffdad6;
  color: var(--color-brand);
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}

.info {
  min-width: 0;
  flex: 1;
}

.who strong {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 16px;
  line-height: 20px;
  font-weight: 800;
  word-break: break-word;
}

.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
  color: #5c5e65;
  font-size: 12px;
}

.days {
  padding: 2px 8px;
  border-radius: 999px;
  background: #e2e8f7;
  color: #5e3f3c;
  font-size: 10px;
  font-weight: 800;
}

.pay {
  text-align: right;
  flex-shrink: 0;
}

.pay strong {
  display: block;
  color: var(--color-brand);
  font-size: 16px;
  line-height: 22px;
  font-weight: 800;
}

.pay span {
  display: inline-block;
  margin-top: 2px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(229, 255, 235, 0.5);
  color: #008352;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 20px;
  }

  .head h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .chip {
    margin-top: 12px;
    padding: 8px 14px;
    font-size: 13px;
  }

  .top {
    display: grid;
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    gap: 16px;
    align-items: stretch;
    margin-bottom: 8px;
  }

  .picker {
    margin-bottom: 0;
    padding: 16px 18px;
    height: 100%;
  }

  .picker-top label {
    font-size: 13px;
  }

  .field input {
    min-height: 52px;
    height: 52px;
    font-size: 15px;
  }

  .kpis {
    gap: 14px;
    margin-bottom: 0;
  }

  .kpi {
    padding: 18px 20px;
  }

  .icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background-size: 22px;
  }

  .label {
    font-size: 11px;
  }

  .kpi strong {
    font-size: 32px;
    line-height: 1.1;
  }

  .kpi.brand strong {
    font-size: 24px;
    line-height: 1.2;
  }

  .kpi p {
    font-size: 13px;
  }

  .list-head {
    margin: 20px 0 12px;
  }

  h3 {
    font-size: 18px;
  }

  .list-head button {
    font-size: 13px;
  }

  .list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .row {
    padding: 16px 18px;
  }

  .who strong {
    font-size: 17px;
    line-height: 22px;
  }

  .meta {
    font-size: 13px;
  }

  .pay strong {
    font-size: 18px;
  }

  .empty {
    font-size: 15px;
    margin: 20px 0;
  }
}
</style>
