<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { Business } from '../types'

type SummaryOrder = {
  id: number
  clientName: string
  date: string
  statusLabel: string
  lines: string[]
  total: number
  paid: number
  balance: number
}
type Summary = {
  date: string
  delivered: number
  deliveredTotal: number
  collected: number
  deliveredOrders: SummaryOrder[]
  pending: SummaryOrder[]
}
type Group = 'entregados' | 'valor' | 'cobrado' | 'pendientes'

const businesses = ref<Business[]>([])
const businessId = ref(0)
const date = ref(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }))
const summary = ref<Summary | null>(null)
const openGroup = ref<Group | null>(null)
const payAmount = ref<Record<number, number>>({})
const error = ref('')
const message = ref('')

function money(value: number) {
  return `S/ ${value.toFixed(2)}`
}

function toggle(group: Group) {
  openGroup.value = openGroup.value === group ? null : group
}

function dayLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-PE')
}

const groupOrders = computed(() => {
  if (!summary.value || !openGroup.value) return []
  if (openGroup.value === 'pendientes') return summary.value.pending
  return summary.value.deliveredOrders
})

const groupTitle = computed(() => {
  if (openGroup.value === 'valor') return 'Pedidos que forman el valor'
  if (openGroup.value === 'cobrado') return 'Pedidos que forman el cobro'
  if (openGroup.value === 'pendientes') return 'Pedidos con saldo'
  return 'Pedidos entregados'
})

async function loadBusinesses() {
  const { data } = await http.get<Business[]>('/businesses')
  businesses.value = data.filter((business) => !/profesional/i.test(business.rubro?.name || ''))
  if (!businessId.value && businesses.value[0]) businessId.value = businesses.value[0].id
}

async function pay(order: Pending) {
  error.value = ''
  message.value = ''
  try {
    await http.post(`/pedidos/${order.id}/pagos`, { amount: payAmount.value[order.id] })
    payAmount.value[order.id] = 0
    message.value = 'Pago registrado'
    await loadSummary()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function loadSummary() {
  if (!businessId.value) return
  const { data } = await http.get<Summary>('/pedidos/resumen', { params: { businessId: businessId.value, date: date.value } })
  summary.value = data
}

onMounted(async () => {
  try {
    await loadBusinesses()
    await loadSummary()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch([businessId, date], async () => {
  try {
    await loadSummary()
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <h2>Resumen del día</h2>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>
    <label class="line">
      <span>Negocio</span>
      <select v-model.number="businessId">
        <option v-for="business in businesses" :key="business.id" :value="business.id">{{ business.commercialName }}</option>
      </select>
    </label>
    <label class="line">
      <span>Día</span>
      <input v-model="date" type="date" />
    </label>
    <section v-if="summary" class="metrics">
      <button type="button" :class="{ open: openGroup === 'entregados' }" @click="toggle('entregados')">
        <span class="mark">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        </span>
        <em>Pedidos entregados:</em>
        <b>{{ summary.delivered }}</b>
      </button>
      <button type="button" :class="{ open: openGroup === 'valor' }" @click="toggle('valor')">
        <span class="mark">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
        </span>
        <em>Valor pedidos:</em>
        <b>{{ money(summary.deliveredTotal) }}</b>
      </button>
      <button type="button" class="cash" :class="{ open: openGroup === 'cobrado' }" @click="toggle('cobrado')">
        <span class="mark">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12m-3-2.8.9.7c1.1.8 3 .8 4.2 0 1.2-.9 1.2-2.3 0-3.2-.6-.4-1.4-.7-2.1-.7-.8 0-1.5-.2-2-.7-1.1-.8-1.1-2.3 0-3.1s2.9-.9 4 0l.4.3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
        </span>
        <em>Valor cobrado:</em>
        <b>{{ money(summary.collected) }}</b>
      </button>
    </section>
    <button class="pending" type="button" :class="{ open: openGroup === 'pendientes' }" @click="toggle('pendientes')">
      Pedidos no pagados en su totalidad
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
    </button>
    <section v-if="openGroup && summary" class="detail">
      <h3>{{ groupTitle }}</h3>
      <p v-if="!groupOrders.length" class="empty">{{ openGroup === 'pendientes' ? 'No hay pedidos con saldo pendiente.' : 'No hay pedidos entregados en este día.' }}</p>
      <article v-for="order in groupOrders" :key="order.id">
        <header>
          <strong>{{ order.clientName }}</strong>
          <span>Pedido {{ order.id }}</span>
        </header>
        <p class="when">{{ dayLabel(order.date) }}</p>
        <p v-for="(line, index) in order.lines" :key="index" class="item">{{ line }}</p>
        <p v-if="!order.lines.length" class="item">Sin productos registrados.</p>
        <p v-if="openGroup === 'entregados'" class="amount">{{ order.statusLabel }} · {{ money(order.total) }}</p>
        <p v-else-if="openGroup === 'valor'" class="amount">Total {{ money(order.total) }}</p>
        <p v-else-if="openGroup === 'cobrado'" class="amount paid">Cobrado {{ money(order.paid) }} · pedido {{ money(order.total) }}</p>
        <template v-else>
          <p class="amount">Pedido {{ money(order.total) }} · pagado {{ money(order.paid) }} · saldo {{ money(order.balance) }}</p>
          <div class="pay">
            <input v-model.number="payAmount[order.id]" type="number" min="0.01" step="0.01" placeholder="0.00" />
            <button type="button" @click="pay(order)">Registrar pago</button>
          </div>
        </template>
      </article>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 16px;
  text-align: center;
}

.head h2 {
  margin: 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.line {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.line span {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.line input,
.line select,
.pay input {
  width: 100%;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-control);
  background: #fff;
  color: var(--color-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
}

.line select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23475569' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 36px;
}

.metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-card);
  background: #f8fafc;
}

.metrics button,
.pending {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  color: #334155;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.metrics button.open,
.pending.open {
  border-color: #fecdd3;
  background: #fff;
}

.mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  flex: none;
}

.mark svg,
.pending svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.metrics em {
  flex: 1;
  font-style: normal;
  font-size: 14px;
  font-weight: 600;
}

.metrics b {
  padding: 2px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: var(--color-ink);
  font-size: 15px;
}

.metrics .cash .mark {
  border-color: #a7f3d0;
  background: #ecfdf5;
  color: #047857;
}

.metrics .cash b {
  border-color: #a7f3d0;
  background: #ecfdf5;
  color: #047857;
}

.pending {
  justify-content: center;
  margin-bottom: 14px;
  background: #e2e8f0;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.pending svg {
  width: 16px;
  height: 16px;
}

.detail h3 {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 800;
}

.empty,
.when,
.item {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 18px;
}

.detail article {
  margin-bottom: 10px;
  padding: 14px;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
}

.detail header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.detail header span,
.amount {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.amount {
  margin: 8px 0 0;
}

.amount.paid {
  color: #047857;
}

.pay {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.pay input {
  width: 110px;
  min-height: 44px;
}

.pay button {
  flex: 1;
  min-height: 44px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
</style>
