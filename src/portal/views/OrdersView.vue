<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { isKgUnit, menuOfferIdsOf, type Business, type Item } from '../types'
import { whatsappChatUrl, openWhatsAppChat } from '../whatsapp'

const OPERATOR_ORDER_KEY = 'portal-operator-order'

type Offer = { id: number; name: string; price: string; isActive: boolean }
type Catalog = { carta: Item[]; menu: Item[]; offers: Offer[] }
type Order = {
  id: number
  clientName: string
  status: string
  statusLabel: string
  fulfillment: string
  total: number
  paid: number
  balance: number
  lines: { id: number; kind: string; name: string; quantityRequested: string; quantityServed: string; unitPrice: string; dishes: { name: string; menuPart: string }[] }[]
  clientPhone?: string
  clientAddress?: string | null
  createdAt?: string
  elapsedMinutes: number
  timingClosed: boolean
  stages: { status: string; label: string; startedAt: string; minutes: number }[]
}

type ShopClient = { id: number; name: string; phone: string; address: string | null; purchases: number }

const router = useRouter()
const businesses = ref<Business[]>([])
const businessId = ref(0)
const catalog = ref<Catalog>({ carta: [], menu: [], offers: [] })
const orders = ref<Order[]>([])
const statusGroup = ref('REGISTRADO')
const statusButtons = [
  { key: 'PENDIENTE_APROBACION', label: 'Pendiente de aprobación', next: 'REGISTRADO', nextLabel: 'Pasar a registrado' },
  { key: 'REGISTRADO', label: 'Registrado', next: 'ATENCION', nextLabel: 'Pasar a atención' },
  { key: 'ATENCION', label: 'Atención', next: 'LISTO', nextLabel: 'Pasar a listo' },
  { key: 'LISTO', label: 'Listo', next: 'DESPACHADO', nextLabel: 'Pasar a despachado' },
  { key: 'DESPACHADO', label: 'Despachado', next: 'ENTREGADO', nextLabel: 'Pasar a entregado' },
  { key: 'ENTREGADO', label: 'Entregado', next: '', nextLabel: '' },
  { key: 'ANULADO', label: 'Anulado', next: '', nextLabel: '' },
]
const query = ref('')
const creating = ref(false)
const createError = ref('')
const habitual = ref(false)
const visibleOrders = computed(() => {
  const text = query.value.trim().toLowerCase()
  return orders.value.filter((order) => {
    if (order.status !== statusGroup.value) return false
    if (!text) return true
    return String(order.id).includes(text) || order.clientName.toLowerCase().includes(text)
  })
})
const activeGroup = computed(() => statusButtons.find((item) => item.key === statusGroup.value))
const now = ref(Date.now())
let timer = 0
const error = ref('')
const message = ref('')
const clients = ref<ShopClient[]>([])
const pickedClientId = ref(0)
const clientName = ref('')
const clientPhone = ref('')
const clientAddress = ref('')
const fulfillment = ref<'RECOJO' | 'DELIVERY'>('RECOJO')
const pointId = ref(0)
const points = computed(() => businesses.value.find((item) => item.id === businessId.value)?.pointSales || [])
const selectedPoint = computed(() => points.value.find((point) => point.id === pointId.value) || points.value[0])
const selectedBusiness = computed(() => businesses.value.find((item) => item.id === businessId.value))
watch(points, (list) => {
  if (!list.some((point) => point.id === pointId.value)) pointId.value = list[0]?.id || 0
  if (fulfillment.value === 'DELIVERY' && !selectedPoint.value?.chargesDelivery) fulfillment.value = 'RECOJO'
})
const payAmount = ref<Record<number, number>>({})
const payError = ref<Record<number, string>>({})
const served = ref<Record<number, number>>({})
const parts = [
  { key: 'ENTRADA', label: 'Entrada' },
  { key: 'SEGUNDO', label: 'Segundo' },
  { key: 'REFRESCO', label: 'Refresco' },
]

async function loadBase() {
  const { data } = await http.get<Business[]>('/businesses')
  businesses.value = data.filter((business) => !/profesional/i.test(business.rubro?.name || ''))
  if (!businessId.value && businesses.value[0]) businessId.value = businesses.value[0].id
}

async function loadShop() {
  if (!businessId.value) return
  const [catalogRes, orderRes, clientRes] = await Promise.all([
    http.get<Catalog>('/pedidos/catalogo', { params: { businessId: businessId.value } }),
    http.get<Order[]>('/pedidos', { params: { businessId: businessId.value } }),
    http.get<ShopClient[]>('/pedidos/clientes', { params: { businessId: businessId.value } }),
  ])
  catalog.value = catalogRes.data
  orders.value = orderRes.data
  clients.value = clientRes.data
}

onMounted(async () => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 30000)
  try {
    await loadBase()
    await loadShop()
  } catch (err) {
    error.value = apiError(err)
  }
})

onUnmounted(() => window.clearInterval(timer))

watch(businessId, async () => {
  try {
    await loadShop()
  } catch (err) {
    error.value = apiError(err)
  }
})

function countStatus(key: string) {
  return orders.value.filter((order) => order.status === key).length
}

function newClient() {
  habitual.value = false
  pickedClientId.value = 0
  clientName.value = ''
  clientPhone.value = ''
  clientAddress.value = ''
}

function openCreate() {
  creating.value = true
  error.value = ''
  createError.value = ''
  message.value = ''
}

function cancelCreate() {
  creating.value = false
  createError.value = ''
  newClient()
  fulfillment.value = 'RECOJO'
}

function goToStore() {
  error.value = ''
  createError.value = ''
  message.value = ''
  const point = selectedPoint.value
  if (!businessId.value || !point?.id) {
    createError.value = 'Elige el negocio y el punto de venta.'
    return
  }
  if (!clientName.value.trim()) {
    createError.value = 'Registra el nombre del cliente.'
    return
  }
  if (!clientPhone.value.trim()) {
    createError.value = 'Registra el celular del cliente.'
    return
  }
  if (fulfillment.value === 'DELIVERY' && !clientAddress.value.trim()) {
    createError.value = 'El delivery exige una dirección de entrega.'
    return
  }
  sessionStorage.setItem(
    OPERATOR_ORDER_KEY,
    JSON.stringify({
      businessId: businessId.value,
      pointSaleId: point.id,
      clientName: clientName.value.trim(),
      clientPhone: clientPhone.value.trim(),
      clientAddress: clientAddress.value.trim(),
      fulfillment: fulfillment.value,
      requireOrderPayment: Boolean(selectedBusiness.value?.requireOrderPayment),
    }),
  )
  router.push({
    name: 'business',
    params: { id: businessId.value },
    query: { operador: '1', punto: String(point.id) },
  })
}

function lineText(order: Order) {
  return order.lines
    .map((line) => {
      if (line.kind === 'MENU') return line.dishes.map((dish) => dish.name).join(' + ') || line.name
      const qty = Number(line.quantityRequested)
      const shown = Number.isInteger(qty) ? String(qty) : qty.toFixed(2)
      return `${shown}x ${line.name}`
    })
    .join(', ')
}

function clientWhatsapp(phone?: string) {
  return whatsappChatUrl(phone)
}

function useClient() {
  const client = clients.value.find((item) => item.id === pickedClientId.value)
  if (!client) return
  clientName.value = client.name
  clientPhone.value = client.phone
  clientAddress.value = client.address || ''
}

function matchClient() {
  const client = clients.value.find((item) => item.phone === clientPhone.value.trim())
  if (!client) return
  pickedClientId.value = client.id
  clientName.value = client.name
  if (!clientAddress.value) clientAddress.value = client.address || ''
}

function stageMinutes(order: Order, index: number) {
  const stage = order.stages[index]
  const next = order.stages[index + 1]
  const end = next ? new Date(next.startedAt).getTime() : order.timingClosed ? new Date(stage.startedAt).getTime() : now.value
  return Math.max(0, Math.round((end - new Date(stage.startedAt).getTime()) / 60000))
}

function elapsed(order: Order) {
  const start = order.stages[0] ? new Date(order.stages[0].startedAt).getTime() : now.value
  const end = order.timingClosed && order.stages.at(-1) ? new Date(order.stages.at(-1)!.startedAt).getTime() : now.value
  return Math.max(0, Math.round((end - start) / 60000))
}

function clock(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min`
  return `${hours} h ${rest} min`
}

function hour(value: string) {
  return new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function unitOfSaved(name: string) {
  for (const item of catalog.value.carta) {
    if (item.name !== name) continue
    const line = item.descriptions?.find((entry) => entry.unit?.name)
    if (line?.unit?.name) return line.unit.name
  }
  return ''
}

const menuEdit = ref<Record<number, { offerId: number; parts: Record<string, number | null> }>>({})

function editOf(order: Order, line: Order['lines'][number]) {
  if (!menuEdit.value[line.id]) {
    const parts: Record<string, number | null> = { ENTRADA: null, SEGUNDO: null, REFRESCO: null }
    for (const dish of line.dishes) {
      const item = catalog.value.menu.find((entry) => entry.menuPart === dish.menuPart && entry.name === dish.name)
      parts[dish.menuPart] = item?.id ?? null
    }
    menuEdit.value[line.id] = {
      offerId: catalog.value.offers.find((offer) => offer.name === line.name)?.id || catalog.value.offers[0]?.id || 0,
      parts,
    }
  }
  return menuEdit.value[line.id]
}

async function saveMenu(order: Order, line: Order['lines'][number]) {
  error.value = ''
  const edit = editOf(order, line)
  const picked = parts
    .filter((part) => edit.parts[part.key])
    .map((part) => ({ itemId: edit.parts[part.key], menuPart: part.key }))
  try {
    await http.patch(`/pedidos/lineas/${line.id}/platos`, { menuOfferId: edit.offerId, dishes: picked })
    delete menuEdit.value[line.id]
    message.value = 'Menú actualizado'
    await loadShop()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function removeSaved(lineId: number) {
  error.value = ''
  try {
    await http.delete(`/pedidos/lineas/${lineId}`)
    message.value = 'Producto quitado del pedido'
    await loadShop()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function setStatus(order: Order, status: string) {
  error.value = ''
  try {
    await http.patch(`/pedidos/${order.id}/estado`, { status })
    await loadShop()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function saveServed(lineId: number) {
  error.value = ''
  try {
    await http.patch(`/pedidos/lineas/${lineId}`, { quantityServed: served.value[lineId] })
    await loadShop()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function pay(order: Order) {
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
    await loadShop()
  } catch (err) {
    payError.value[order.id] = apiError(err)
  }
}

</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Registro de Pedidos</h2>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>
    <div class="pair">
      <label class="line">
        <span>Negocio</span>
        <select v-model.number="businessId">
          <option v-for="business in businesses" :key="business.id" :value="business.id">{{ business.commercialName }}</option>
        </select>
      </label>
      <label class="line">
        <span>Punto de venta</span>
        <select v-model.number="pointId">
          <option v-for="point in points" :key="point.id" :value="point.id">{{ point.name }}</option>
        </select>
      </label>
    </div>

    <section class="today">
      <header>
        <h3>Pedidos de hoy</h3>
        <span>{{ orders.length }} total</span>
      </header>
      <label class="line">
        <span>Buscar</span>
        <input v-model="query" placeholder="Buscar # o cliente" />
      </label>
      <div class="chips">
        <button
          v-for="item in statusButtons"
          :key="item.key"
          type="button"
          :class="{ on: statusGroup === item.key }"
          @click="statusGroup = item.key"
        >
          {{ item.label }} <b>{{ countStatus(item.key) }}</b>
        </button>
      </div>
      <p v-if="!visibleOrders.length" class="hint">No hay pedidos en {{ activeGroup?.label }} hoy.</p>
      <article v-for="order in visibleOrders" :key="order.id" class="ticket">
        <header>
          <strong>#{{ order.id }}</strong>
          <span>{{ order.fulfillment === 'DELIVERY' ? 'Delivery' : 'Entrega en local' }}</span>
          <time v-if="order.createdAt">{{ hour(order.createdAt) }}</time>
        </header>
        <p class="who">{{ order.clientName }}</p>
        <p v-if="lineText(order)" class="hint">{{ lineText(order) }}</p>
        <p v-if="order.fulfillment === 'DELIVERY' && order.clientAddress" class="hint">{{ order.clientAddress }}</p>
        <p class="sum">Total S/ {{ order.total.toFixed(2) }}</p>
        <p class="hint">Tiempo acumulado: {{ clock(elapsed(order)) }}{{ order.timingClosed ? '' : ' y sigue' }}</p>
        <p v-for="(stage, index) in order.stages" :key="stage.status" class="hint">
          {{ stage.label }} {{ hour(stage.startedAt) }} · {{ clock(stageMinutes(order, index)) }}
        </p>
        <template v-for="line in order.lines" :key="line.id">
          <div v-if="line.kind === 'CARTA' && order.status !== 'ENTREGADO' && order.status !== 'ANULADO'" class="served-block">
            <p class="served-name">{{ line.name }}</p>
            <div class="tools">
              <span>Atendido</span>
              <input v-model.number="served[line.id]" type="number" :min="isKgUnit(unitOfSaved(line.name)) ? 0.01 : 1" :step="isKgUnit(unitOfSaved(line.name)) ? 0.01 : 1" :placeholder="String(line.quantityServed)" />
              <button type="button" @click="saveServed(line.id)">Guardar</button>
              <button type="button" @click="removeSaved(line.id)">Quitar</button>
            </div>
          </div>
          <div v-else-if="line.kind === 'MENU' && order.status !== 'ENTREGADO' && order.status !== 'ANULADO'" class="menu-edit">
            <p class="served-name">{{ line.name }}{{ line.dishes?.length ? ` · ${line.dishes.map((dish) => dish.name).join(' + ')}` : '' }}</p>
            <label class="line">
              <span>Tipo de menú</span>
              <select v-model.number="editOf(order, line).offerId">
                <option v-for="offer in catalog.offers" :key="offer.id" :value="offer.id">{{ offer.name }} · S/ {{ Number(offer.price).toFixed(2) }}</option>
              </select>
            </label>
            <label v-for="part in parts" :key="part.key + line.id" class="line">
              <span>{{ part.label }}</span>
              <select v-model="editOf(order, line).parts[part.key]">
                <option :value="null">Sin elegir</option>
                <option v-for="item in catalog.menu.filter((entry) => entry.menuPart === part.key && menuOfferIdsOf(entry).includes(editOf(order, line).offerId))" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
            <div class="tools">
              <button type="button" @click="saveMenu(order, line)">Guardar menú</button>
              <button type="button" @click="removeSaved(line.id)">Quitar menú</button>
            </div>
          </div>
        </template>
        <p class="hint">Pagado S/ {{ order.paid.toFixed(2) }} · saldo S/ {{ order.balance.toFixed(2) }}</p>
        <div v-if="order.balance > 0 && order.status !== 'ANULADO'" class="pay-box">
          <div class="tools">
            <input v-model.number="payAmount[order.id]" type="number" min="0.01" step="0.01" />
            <button type="button" @click="pay(order)">Registrar pago</button>
          </div>
          <p v-if="payError[order.id]" class="error pay-msg">{{ payError[order.id] }}</p>
        </div>
        <div class="actions">
          <a v-if="clientWhatsapp(order.clientPhone)" class="wa" :href="clientWhatsapp(order.clientPhone)" @click.prevent="openWhatsAppChat(order.clientPhone)">WhatsApp</a>
          <button v-if="activeGroup?.next" class="save" type="button" @click="setStatus(order, activeGroup.next)">{{ activeGroup.nextLabel }}</button>
          <button v-if="order.status !== 'ENTREGADO' && order.status !== 'ANULADO'" class="ghost" type="button" @click="setStatus(order, 'ANULADO')">Anular</button>
        </div>
      </article>
    </section>

    <section class="sheet create">
      <h3>Crear pedidos</h3>
      <button v-if="!creating" class="save" type="button" @click="openCreate">Crear pedidos</button>
      <template v-else>
        <div class="tabs">
          <button type="button" :class="{ on: !habitual }" @click="newClient">Nuevo cliente</button>
          <button type="button" :class="{ on: habitual }" @click="habitual = true">Cliente habitual</button>
        </div>
        <label v-if="habitual" class="line">
          <span>Cliente habitual</span>
          <select v-model.number="pickedClientId" @change="useClient">
            <option :value="0">Elige un cliente</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.name }} · {{ client.phone }} · {{ client.purchases }} compras
            </option>
          </select>
        </label>
        <div class="pair">
          <label class="line">
            <span>Nombre del cliente</span>
            <input v-model="clientName" />
          </label>
          <label class="line">
            <span>Celular (WhatsApp)</span>
            <input v-model="clientPhone" inputmode="numeric" @change="matchClient" />
          </label>
        </div>
        <span class="caption">Modalidad de entrega</span>
        <div class="modes">
          <button type="button" :class="{ on: fulfillment === 'RECOJO' }" @click="fulfillment = 'RECOJO'">En local</button>
          <button v-if="selectedPoint?.chargesDelivery" type="button" :class="{ on: fulfillment === 'DELIVERY' }" @click="fulfillment = 'DELIVERY'">Delivery</button>
        </div>
        <label v-if="fulfillment === 'DELIVERY'" class="line">
          <span>Dirección de entrega</span>
          <input v-model="clientAddress" placeholder="Dirección donde se entrega el pedido" />
        </label>
        <p v-if="fulfillment === 'DELIVERY'" class="hint">Delivery a domicilio S/ {{ Number(selectedPoint?.deliveryFee || 0).toFixed(2) }}</p>
        <p class="hint">Luego agregarás los ítems desde la tienda virtual del negocio.</p>
        <p v-if="createError" class="error create-msg">{{ createError }}</p>
        <button class="save" type="button" @click="goToStore">Agregar ítems desde la tienda</button>
        <button class="ghost" type="button" @click="cancelCreate">Cancelar</button>
      </template>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 14px;
  text-align: center;
  font-family: var(--font-ui);
}

.head h2 {
  margin: 0;
  font-size: 28px;
  line-height: 34px;
  font-weight: 800;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.sheet,
.ticket,
.today {
  margin-bottom: 12px;
  padding: 16px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.create .ghost {
  width: 100%;
}

.pay-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pay-msg,
.create-msg {
  margin: 0;
  font-size: 13px;
  line-height: 1.35;
}

.sheet,
.ticket,
.today {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sheet h3,
.today h3,
.ticket .who {
  margin: 0;
  font-size: 16px;
}

.today header,
.ticket header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.today header span,
.ticket header span {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f0f3ff;
  color: #5c5e65;
  font-size: 10px;
  font-weight: 700;
}

.ticket header time,
.ticket .sum {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
}

.tabs,
.modes,
.chips,
.actions,
.tools {
  display: flex;
  gap: 8px;
}

.tabs button,
.modes button,
.chips button {
  flex: 1;
  min-height: 40px;
  border: 0;
  border-radius: 12px;
  background: #f0f3ff;
  color: #5c5e65;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.tabs button.on,
.modes button.on,
.chips button.on {
  background: var(--color-brand);
  color: #fff;
}

.chips {
  overflow-x: auto;
}

.chips button {
  flex: none;
}

.chips b {
  margin-left: 4px;
}

.line {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.line span,
.caption {
  font-size: 12px;
  font-weight: 700;
  color: #5c5e65;
}

.line input,
.line select,
.tools input {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 0;
  border-radius: 12px;
  background: #f0f3ff;
  font: inherit;
  font-size: 14px;
}

.qty {
  max-width: 140px;
}

.hint {
  margin: 0;
  color: #5c5e65;
  font-size: 12px;
}

.tools {
  align-items: center;
}

.served-block,
.menu-edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-line);
}

.served-name {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-ink);
}

.tools span {
  flex: none;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-muted);
}

.tools input {
  width: 88px;
  flex: 1;
}

.tools button,
.ghost,
.wa {
  border: 0;
  border-radius: 12px;
  background: #e2e8f7;
  color: var(--color-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.ghost,
.wa,
.save {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 12px;
}

.save {
  width: 100%;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.actions {
  align-items: stretch;
}

.actions .save,
.actions .ghost,
.actions .wa {
  flex: 1;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 20px;
  }

  .head h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .pair {
    max-width: 720px;
    gap: 14px;
    margin-bottom: 16px;
  }

  .today,
  .sheet {
    padding: 22px 24px;
    margin-bottom: 16px;
  }

  .sheet h3,
  .today h3,
  .ticket .who {
    font-size: 18px;
  }

  .chips {
    flex-wrap: wrap;
    overflow: visible;
  }

  .chips button {
    min-height: 44px;
    padding: 0 14px;
    font-size: 14px;
  }

  .today {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
  }

  .today > header,
  .today > .line,
  .today > .chips,
  .today > .hint {
    grid-column: 1 / -1;
  }

  .ticket {
    margin-bottom: 0;
    padding: 18px 20px;
  }

  .ticket .sum {
    font-size: 15px;
  }

  .hint {
    font-size: 13px;
  }

  .actions {
    gap: 10px;
  }

  .create {
    max-width: 720px;
  }

  .create .save,
  .create .ghost {
    max-width: 420px;
  }
}
</style>
