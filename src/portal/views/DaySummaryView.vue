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
  orderCount: number
  orderTotal: number
  collected: number
  dayOrders: SummaryOrder[]
  pending: SummaryOrder[]
  delivered: number
  deliveredOrders: SummaryOrder[]
  deliveredTotal?: number
}
type Group = 'cobranza' | 'pendientes' | 'entregados'

const businesses = ref<Business[]>([])
const businessId = ref(0)
const date = ref(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }))
const summary = ref<Summary | null>(null)
const openGroup = ref<Group | null>(null)
const payAmount = ref<Record<number, number>>({})
const payError = ref<Record<number, string>>({})
const error = ref('')
const message = ref('')

function money(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`
}

function toggle(group: Group) {
  openGroup.value = openGroup.value === group ? null : group
}

function dayLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-PE')
}

const dayOrders = computed(() => summary.value?.dayOrders || [])
const pendingOrders = computed(() => summary.value?.pending || [])
const deliveredOrders = computed(() => summary.value?.deliveredOrders || [])

const groupOrders = computed(() => {
  if (!openGroup.value) return []
  if (openGroup.value === 'pendientes') return pendingOrders.value
  if (openGroup.value === 'entregados') return deliveredOrders.value
  return dayOrders.value
})

const groupTitle = computed(() => {
  if (openGroup.value === 'pendientes') return 'Pedidos con saldo pendiente'
  if (openGroup.value === 'entregados') return 'Pedidos entregados'
  return 'Pedidos y cobranza del día'
})

const emptyMessage = computed(() => {
  if (openGroup.value === 'pendientes') return 'No hay pedidos con saldo pendiente en este día.'
  if (openGroup.value === 'entregados') return 'No hay pedidos entregados en este día.'
  return 'No hay pedidos aprobados en este día.'
})

async function loadBusinesses() {
  const { data } = await http.get<Business[]>('/businesses')
  businesses.value = data.filter((business) => !/profesional/i.test(business.rubro?.name || ''))
  if (!businessId.value && businesses.value[0]) businessId.value = businesses.value[0].id
}

async function pay(order: SummaryOrder) {
  error.value = ''
  message.value = ''
  payError.value[order.id] = ''
  const amount = Number(payAmount.value[order.id])
  const balance = Number(order.balance)
  if (!amount || amount <= 0) {
    payError.value[order.id] = 'El pago debe ser mayor a cero'
    return
  }
  if (Math.round(amount * 100) > Math.round(balance * 100)) {
    payError.value[order.id] = 'No es posible registrar un pago mayor al saldo actual del pedido'
    return
  }
  try {
    await http.post(`/pedidos/${order.id}/pagos`, { amount })
    payAmount.value[order.id] = 0
    payError.value[order.id] = ''
    message.value = 'Pago registrado'
    await loadSummary()
  } catch (err) {
    payError.value[order.id] = apiError(err)
  }
}

async function loadSummary() {
  if (!businessId.value) return
  const { data } = await http.get<Summary>('/pedidos/resumen', {
    params: { businessId: businessId.value, date: date.value },
  })
  summary.value = {
    ...data,
    dayOrders: data.dayOrders || [],
    pending: data.pending || [],
    deliveredOrders: data.deliveredOrders || [],
    orderCount: data.orderCount ?? data.dayOrders?.length ?? 0,
    orderTotal: data.orderTotal ?? data.deliveredTotal ?? 0,
    collected: data.collected ?? 0,
    delivered: data.delivered ?? data.deliveredOrders?.length ?? 0,
  }
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
  openGroup.value = null
  try {
    await loadSummary()
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Resumen del día</h2>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>

    <div class="filters">
      <label class="line">
        <span>Fecha</span>
        <input v-model="date" type="date" />
      </label>
      <label class="line">
        <span>Negocio</span>
        <select v-model.number="businessId">
          <option v-for="business in businesses" :key="business.id" :value="business.id">
            {{ business.commercialName }}
          </option>
        </select>
      </label>
    </div>

    <nav v-if="summary" class="actions">
      <button type="button" :class="{ open: openGroup === 'cobranza' }" @click="toggle('cobranza')">
        Pedidos y cobranza del día
        <b>{{ summary.orderCount }}</b>
      </button>
      <button type="button" :class="{ open: openGroup === 'pendientes' }" @click="toggle('pendientes')">
        Pedidos con saldo pendiente
        <b>{{ pendingOrders.length }}</b>
      </button>
      <button type="button" :class="{ open: openGroup === 'entregados' }" @click="toggle('entregados')">
        Pedidos entregados
        <b>{{ summary.delivered }}</b>
      </button>
    </nav>

    <section v-if="openGroup === 'cobranza' && summary" class="totals">
      <div>
        <span>Valor pedidos</span>
        <strong>{{ money(summary.orderTotal) }}</strong>
      </div>
      <div>
        <span>Valor cobrado</span>
        <strong class="cash">{{ money(summary.collected) }}</strong>
      </div>
      <div>
        <span>Saldo del día</span>
        <strong>{{ money(summary.orderTotal - summary.collected) }}</strong>
      </div>
    </section>

    <section v-if="openGroup && summary" class="detail">
      <h3>{{ groupTitle }}</h3>
      <p v-if="!groupOrders.length" class="empty">{{ emptyMessage }}</p>
      <article v-for="order in groupOrders" :key="order.id">
        <header>
          <strong>{{ order.clientName }}</strong>
          <span>Pedido {{ order.id }}</span>
        </header>
        <p class="when">{{ dayLabel(order.date) }} · {{ order.statusLabel }}</p>
        <p v-for="(line, index) in order.lines" :key="index" class="item">{{ line }}</p>
        <p v-if="!order.lines.length" class="item">Sin productos registrados.</p>
        <p class="amount">
          Total {{ money(order.total) }} · pagado {{ money(order.paid) }} · saldo {{ money(order.balance) }}
        </p>
        <template v-if="openGroup !== 'entregados' && order.balance > 0">
          <div class="pay">
            <input
              v-model.number="payAmount[order.id]"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
            />
            <button type="button" @click="pay(order)">Registrar pago</button>
          </div>
          <p v-if="payError[order.id]" class="error">{{ payError[order.id] }}</p>
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

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.actions button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-control);
  background: #fff;
  box-shadow: var(--shadow-soft);
  color: var(--color-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.actions button.open {
  border-color: #fecdd3;
  background: #fff5f5;
}

.actions b {
  flex: none;
  min-width: 28px;
  padding: 2px 8px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #334155;
  font-size: 14px;
  text-align: center;
}

.totals {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 14px;
  padding: 14px;
  border-radius: var(--radius-card);
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.totals div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.totals span {
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.totals strong {
  font-size: 15px;
  font-weight: 800;
}

.totals .cash {
  color: #047857;
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

.error {
  margin: 8px 0 0;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 600;
}

.ok {
  margin: 0 0 12px;
  color: #047857;
  font-size: 13px;
  font-weight: 600;
}

.filters {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 20px;
  }

  .head h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .filters {
    display: grid;
    grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
    gap: 14px;
    margin-bottom: 8px;
    max-width: 720px;
  }

  .filters .line {
    margin-bottom: 0;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .actions button {
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    min-height: 96px;
    padding: 16px 18px;
    font-size: 15px;
  }

  .actions b {
    align-self: flex-end;
    min-width: 36px;
    padding: 4px 10px;
    font-size: 18px;
  }

  .totals {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    max-width: 720px;
    margin-bottom: 16px;
    padding: 18px 20px;
  }

  .totals div {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .totals span {
    font-size: 13px;
  }

  .totals strong {
    font-size: 20px;
  }

  .detail h3 {
    font-size: 18px;
    margin-bottom: 14px;
  }

  .detail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    align-items: start;
  }

  .detail h3,
  .detail .empty {
    grid-column: 1 / -1;
  }

  .detail article {
    margin-bottom: 0;
    padding: 18px 20px;
  }

  .detail header strong {
    font-size: 16px;
  }

  .when,
  .item,
  .amount {
    font-size: 14px;
    line-height: 20px;
  }

  .pay {
    margin-top: 12px;
  }

  .pay input {
    width: 140px;
    min-height: 48px;
  }

  .pay button {
    min-height: 48px;
    font-size: 14px;
  }
}
</style>
