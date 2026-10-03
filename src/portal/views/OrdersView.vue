<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { isKgUnit, menuOfferIdsOf, quantityError, type Business, type Item } from '../types'

type Offer = { id: number; name: string; price: string; isActive: boolean }
type Catalog = { carta: Item[]; menu: Item[]; offers: Offer[] }
type Dish = { itemId: number; menuPart: string }
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
const habitual = ref(false)
const dishMode = ref<'carta' | 'menu'>('carta')
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
watch(points, (list) => {
  if (!list.some((point) => point.id === pointId.value)) pointId.value = list[0]?.id || 0
  if (fulfillment.value === 'DELIVERY' && !selectedPoint.value?.chargesDelivery) fulfillment.value = 'RECOJO'
})
const cartaPick = ref<{ descriptionId: number; quantity: number }>({ descriptionId: 0, quantity: 1 })
const cartaLines = ref<{ descriptionId: number; quantity: number; unitName: string; label: string; price: number }[]>([])
const orderPayment = ref(0)
const menuPick = ref<Record<string, number | null>>({ ENTRADA: null, SEGUNDO: null, REFRESCO: null })
const menuOfferId = ref(0)
const payAmount = ref<Record<number, number>>({})
const served = ref<Record<number, number>>({})
const parts = [
  { key: 'ENTRADA', label: 'Entrada' },
  { key: 'SEGUNDO', label: 'Segundo' },
  { key: 'REFRESCO', label: 'Refresco' },
]

const cartaOptions = computed(() =>
  catalog.value.carta.flatMap((item) =>
    (item.descriptions || [])
      .filter((line) => line.id && line.price != null)
      .map((line) => ({
        id: line.id as number,
        price: Number(line.price),
        unitName: line.unit?.name || '',
        label: `${item.name} · ${line.description} · S/ ${Number(line.price).toFixed(2)}`,
      })),
  ),
)

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
  if (!menuOfferId.value && catalog.value.offers[0]) menuOfferId.value = catalog.value.offers[0].id
  if (!cartaPick.value.descriptionId && cartaOptions.value[0]) cartaPick.value.descriptionId = cartaOptions.value[0].id
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
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 9) digits = `51${digits}`
  if (!digits) return ''
  return `https://web.whatsapp.com/send?phone=${digits}`
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

const pickedUnit = computed(() => cartaOptions.value.find((item) => item.id === cartaPick.value.descriptionId)?.unitName || '')

function unitOfSaved(name: string) {
  const option = cartaOptions.value.find((item) => item.label.startsWith(`${name} ·`))
  return option?.unitName || ''
}

function addCarta() {
  const option = cartaOptions.value.find((item) => item.id === cartaPick.value.descriptionId)
  if (!option) return
  const quantity = Number(cartaPick.value.quantity)
  const invalid = quantityError(option.unitName, quantity)
  if (invalid) {
    error.value = invalid
    return
  }
  error.value = ''
  const current = cartaLines.value.find((line) => line.descriptionId === option.id)
  if (current) {
    const sum = Number(current.quantity) + quantity
    current.quantity = isKgUnit(option.unitName) ? Math.round(sum * 100) / 100 : sum
  }
  else cartaLines.value.push({ descriptionId: option.id, quantity, unitName: option.unitName, label: option.label, price: option.price })
}

function removeCarta(index: number) {
  cartaLines.value.splice(index, 1)
}

const menuEdit = ref<Record<number, { offerId: number; parts: Record<string, number | null> }>>({})

function editOf(order: Order, line: Order['lines'][number]) {
  if (!menuEdit.value[line.id]) {
    const parts: Record<string, number | null> = { ENTRADA: null, SEGUNDO: null, REFRESCO: null }
    for (const dish of line.dishes) {
      const item = catalog.value.menu.find((entry) => entry.menuPart === dish.menuPart && entry.name === dish.name)
      parts[dish.menuPart] = item?.id ?? null
    }
    menuEdit.value[line.id] = { offerId: catalog.value.offers.find((offer) => offer.name === line.name)?.id || menuOfferId.value, parts }
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

function dishes(): Dish[] {
  return parts
    .filter((part) => menuPick.value[part.key])
    .map((part) => ({ itemId: menuPick.value[part.key] as number, menuPart: part.key }))
}

const requiresPayment = computed(() => businesses.value.find((business) => business.id === businessId.value)?.requireOrderPayment)
const orderTotal = computed(() => {
  const carta = cartaLines.value.reduce((sum, line) => sum + line.price * Number(line.quantity), 0)
  const offer = catalog.value.offers.find((item) => item.id === menuOfferId.value)
  const menu = dishes().length && offer ? Number(offer.price) : 0
  const delivery = fulfillment.value === 'DELIVERY' && selectedPoint.value?.chargesDelivery ? Number(selectedPoint.value.deliveryFee || 0) : 0
  return carta + menu + delivery
})

async function createOrder(waivePayment = false) {
  error.value = ''
  message.value = ''
  const invalid = cartaLines.value.find((line) => quantityError(line.unitName, Number(line.quantity)))
  if (invalid) {
    error.value = quantityError(invalid.unitName, Number(invalid.quantity))
    return
  }
  const lines: Record<string, unknown>[] = cartaLines.value.map((line) => ({
    kind: 'CARTA',
    descriptionId: line.descriptionId,
    quantity: line.quantity,
  }))
  const menuDishes = dishes()
  if (menuDishes.length) lines.push({ kind: 'MENU', menuOfferId: menuOfferId.value, dishes: menuDishes })
  if (fulfillment.value === 'DELIVERY' && !clientAddress.value.trim()) {
    error.value = 'El pedido no se registró porque el delivery exige una dirección de entrega.'
    return
  }
  if (requiresPayment.value && !waivePayment && Math.round(Number(orderPayment.value) * 100) < Math.round(orderTotal.value * 100)) {
    error.value = `El pedido no se registró porque no se cumplió la condición de pago. El total es S/ ${orderTotal.value.toFixed(2)}.`
    return
  }
  try {
    await http.post('/pedidos', {
      businessId: businessId.value,
      clientName: clientName.value,
      clientPhone: clientPhone.value,
      clientAddress: clientAddress.value,
      fulfillment: fulfillment.value,
      pointSaleId: selectedPoint.value?.id,
      lines,
      payment: orderPayment.value,
      waivePayment,
    })
    clientName.value = ''
    clientPhone.value = ''
    clientAddress.value = ''
    pickedClientId.value = 0
    cartaLines.value = []
    menuPick.value = { ENTRADA: null, SEGUNDO: null, REFRESCO: null }
    message.value = 'Pedido registrado'
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
  try {
    await http.post(`/pedidos/${order.id}/pagos`, { amount: payAmount.value[order.id] })
    payAmount.value[order.id] = 0
    message.value = 'Pago registrado'
    await loadShop()
  } catch (err) {
    error.value = apiError(err)
  }
}

function menuItems(part: string) {
  return catalog.value.menu.filter((item) => item.menuPart === part && menuOfferIdsOf(item).includes(menuOfferId.value))
}

watch(menuOfferId, (_next, previous) => {
  if (previous) menuPick.value = { ENTRADA: null, SEGUNDO: null, REFRESCO: null }
})
</script>

<template>
  <ScreenFrame storefront back bar>
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

    <section class="sheet">
      <h3>Nuevo pedido</h3>
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

      <div class="tabs">
        <button type="button" :class="{ on: dishMode === 'carta' }" @click="dishMode = 'carta'">A la carta</button>
        <button type="button" :class="{ on: dishMode === 'menu' }" @click="dishMode = 'menu'">Menú del día</button>
      </div>
      <template v-if="dishMode === 'carta'">
        <label class="line">
          <span>Producto</span>
          <select v-model.number="cartaPick.descriptionId">
            <option v-for="option in cartaOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
          </select>
        </label>
        <label class="line qty">
          <span>Cantidad</span>
          <input v-model.number="cartaPick.quantity" type="number" :min="isKgUnit(pickedUnit) ? 0.01 : 1" :step="isKgUnit(pickedUnit) ? 0.01 : 1" />
        </label>
        <p class="hint">{{ isKgUnit(pickedUnit) ? 'Kg: hasta dos decimales (0.50, 0.25, 0.10)' : 'Unidad: solo números enteros' }}</p>
        <button class="ghost" type="button" @click="addCarta">Agregar</button>
        <div v-for="(line, index) in cartaLines" :key="index" class="tools">
          <span>{{ line.label }}</span>
          <input v-model.number="line.quantity" type="number" :min="isKgUnit(line.unitName) ? 0.01 : 1" :step="isKgUnit(line.unitName) ? 0.01 : 1" />
          <button type="button" @click="removeCarta(index)">Quitar</button>
        </div>
      </template>
      <template v-else>
        <label class="line">
          <span>Tipo de menú</span>
          <select v-model.number="menuOfferId">
            <option v-for="offer in catalog.offers" :key="offer.id" :value="offer.id">{{ offer.name }} · S/ {{ Number(offer.price).toFixed(2) }}</option>
          </select>
        </label>
        <label v-for="part in parts" :key="part.key" class="line">
          <span>{{ part.label }}</span>
          <select v-model="menuPick[part.key]">
            <option :value="null">Sin elegir</option>
            <option v-for="item in menuItems(part.key)" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <p class="hint">Solo se pueden elegir platos del tipo de menú seleccionado.</p>
      </template>
      <p v-if="requiresPayment" class="hint">Este negocio exige el pago para registrar el pedido.</p>
      <label v-if="requiresPayment" class="line">
        <span>Pago</span>
        <input v-model.number="orderPayment" type="number" min="0.01" step="0.01" />
      </label>
      <button class="save" type="button" @click="createOrder(false)">Registrar pedido · S/ {{ orderTotal.toFixed(2) }}</button>
      <button v-if="requiresPayment" class="ghost" type="button" @click="createOrder(true)">Registrar este pedido sin pago</button>
    </section>

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
          <div v-if="line.kind === 'CARTA' && order.status !== 'ENTREGADO' && order.status !== 'ANULADO'" class="tools">
            <span>Atendido</span>
            <input v-model.number="served[line.id]" type="number" :min="isKgUnit(unitOfSaved(line.name)) ? 0.01 : 1" :step="isKgUnit(unitOfSaved(line.name)) ? 0.01 : 1" :placeholder="String(line.quantityServed)" />
            <button type="button" @click="saveServed(line.id)">Guardar</button>
            <button type="button" @click="removeSaved(line.id)">Quitar</button>
          </div>
          <div v-else-if="line.kind === 'MENU' && order.status !== 'ENTREGADO' && order.status !== 'ANULADO'" class="menu-edit">
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
        <div v-if="order.balance > 0 && order.status !== 'ANULADO'" class="tools">
          <input v-model.number="payAmount[order.id]" type="number" min="0.01" step="0.01" />
          <button type="button" @click="pay(order)">Registrar pago</button>
        </div>
        <div class="actions">
          <a v-if="clientWhatsapp(order.clientPhone)" class="wa" :href="clientWhatsapp(order.clientPhone)" target="_blank" rel="noopener">WhatsApp</a>
          <button v-if="activeGroup?.next" class="save" type="button" @click="setStatus(order, activeGroup.next)">{{ activeGroup.nextLabel }}</button>
          <button v-if="order.status !== 'ENTREGADO' && order.status !== 'ANULADO'" class="ghost" type="button" @click="setStatus(order, 'ANULADO')">Anular</button>
        </div>
      </article>
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
.ticket {
  margin-bottom: 12px;
  padding: 16px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
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

.tools span {
  flex: 1;
  min-width: 0;
  font-size: 12px;
}

.tools input {
  width: 88px;
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

.menu-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
