<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import { isKgUnit, quantityError, type Business, type PointSale } from '../types'

type Dish = { itemId: number; menuPart: string; name: string }
type Draft = {
  kind: 'CARTA' | 'MENU'
  descriptionId: number | null
  quantity: number
  unitName: string
  unitPrice: number
  label: string
  menuOfferId?: number | null
  dishes?: Dish[]
}
type ClientOrder = {
  id: number
  status: string
  statusLabel: string
  createdAt: string
  fulfillment: 'RECOJO' | 'DELIVERY'
  clientAddress: string | null
  deliveryFee: string | number
  total: number
  pointSaleId: number | null
  business: { id: number; commercialName: string; commercialDescription?: string }
  pointSale?: PointSale | null
  lines: {
    kind: 'CARTA' | 'MENU'
    name: string
    unitPrice: string
    quantityRequested: string
    descriptionId: number | null
    unitName: string
    menuOfferId?: number | null
    dishes: Dish[]
  }[]
}

const route = useRoute()
const auth = usePortalAuth()
const order = ref<ClientOrder | null>(null)
const business = ref<Business | null>(null)
const error = ref('')
const message = ref('')
const loading = ref(false)
const confirmCancel = ref(false)
const pointId = ref(0)
const fulfillment = ref<'RECOJO' | 'DELIVERY'>('RECOJO')
const clientAddress = ref('')
const lines = ref<Draft[]>([])
const addId = ref(0)

const editable = computed(() => order.value?.status === 'PENDIENTE_APROBACION')
const pendingNotice = 'Pedido registrado. Quedó pendiente de aprobación. Coordina el pago por WhatsApp con el local.'
const points = computed(() => business.value?.pointSales || (order.value?.pointSale ? [order.value.pointSale] : []))
const selectedPoint = computed(() => points.value.find((point) => point.id === pointId.value) || points.value[0])
const paymentUrl = computed(() => {
  const phone = selectedPoint.value?.phone || order.value?.pointSale?.phone || ''
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 9) digits = `51${digits}`
  if (!digits) return ''
  const name = `${auth.user?.firstName || ''} ${auth.user?.lastName || ''}`.trim() || 'cliente'
  const text = `Hola, soy ${name} y te acabo de enviar mi pedido. Enviame la informacion para realizar el pago. Gracias!`
  return `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`
})

const addOptions = computed(() =>
  (selectedPoint.value?.items || [])
    .filter((item) => item.kind !== 'MENU')
    .flatMap((item) =>
      (item.descriptions || [])
        .filter((line) => line.id && line.price != null)
        .map((line) => ({
          id: line.id as number,
          price: Number(line.price),
          unitName: line.unit?.name || '',
          label: `${item.name} · ${line.description}`,
        })),
    ),
)

const subtotal = computed(() => lines.value.reduce((sum, line) => sum + lineAmount(line), 0))
const deliveryAmount = computed(() => {
  if (fulfillment.value !== 'DELIVERY') return 0
  return selectedPoint.value?.chargesDelivery ? Number(selectedPoint.value.deliveryFee || 0) : Number(order.value?.deliveryFee || 0)
})
const orderTotal = computed(() => subtotal.value + deliveryAmount.value)

function lineAmount(line: Draft) {
  const qty = line.kind === 'MENU' ? 1 : Number(line.quantity) || 0
  return line.unitPrice * qty
}

function addressLine(point?: PointSale | null) {
  const address = point?.address
  if (!address) return point?.name || ''
  return [address.street, address.urbanZone, address.district?.name].filter(Boolean).join(', ')
}

function money(value: number) {
  return `S/ ${value.toFixed(2)}`
}

function applyOrder(data: ClientOrder) {
  order.value = data
  pointId.value = data.pointSaleId || data.pointSale?.id || 0
  fulfillment.value = data.fulfillment
  clientAddress.value = data.clientAddress || ''
  lines.value = data.lines.map((line) => ({
    kind: line.kind,
    descriptionId: line.descriptionId,
    quantity: Number(line.quantityRequested),
    unitName: line.unitName || '',
    unitPrice: Number(line.unitPrice),
    label: line.kind === 'MENU' && line.dishes.length ? `${line.name} · ${line.dishes.map((dish) => dish.name).join(' + ')}` : line.name,
    menuOfferId: line.menuOfferId,
    dishes: line.dishes,
  }))
}

async function load() {
  error.value = ''
  const id = Number(route.params.id)
  const { data } = await http.get<ClientOrder>(`/pedidos/mios/${id}`)
  applyOrder(data)
  if (data.status !== 'PENDIENTE_APROBACION') return
  try {
    business.value = (await http.get<Business>(`/public/businesses/${data.business.id}`)).data
  } catch {
    business.value = null
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch(selectedPoint, (point) => {
  if (fulfillment.value === 'DELIVERY' && point && !point.chargesDelivery) fulfillment.value = 'RECOJO'
})

function addLine() {
  const option = addOptions.value.find((item) => item.id === addId.value)
  if (!option) return
  const current = lines.value.find((line) => line.descriptionId === option.id)
  if (current) {
    const sum = Number(current.quantity) + 1
    current.quantity = isKgUnit(option.unitName) ? Math.round(sum * 100) / 100 : sum
  } else {
    lines.value.push({
      kind: 'CARTA',
      descriptionId: option.id,
      quantity: 1,
      unitName: option.unitName,
      unitPrice: option.price,
      label: option.label,
    })
  }
  addId.value = 0
}

function removeLine(index: number) {
  lines.value.splice(index, 1)
}

async function save() {
  error.value = ''
  message.value = ''
  confirmCancel.value = false
  if (!lines.value.length) {
    error.value = 'El pedido debe conservar al menos un producto'
    return
  }
  const missing = lines.value.find((line) => line.kind === 'CARTA' && !line.descriptionId)
  if (missing) {
    error.value = 'Hay un producto que ya no está en la carta. Quítalo para guardar.'
    return
  }
  const invalid = lines.value.find((line) => line.kind === 'CARTA' && quantityError(line.unitName, Number(line.quantity)))
  if (invalid) {
    error.value = quantityError(invalid.unitName, Number(invalid.quantity))
    return
  }
  if (fulfillment.value === 'DELIVERY' && !clientAddress.value.trim()) {
    error.value = 'El delivery exige una dirección de entrega.'
    return
  }
  loading.value = true
  try {
    const { data } = await http.patch<ClientOrder>(`/pedidos/mios/${order.value?.id}`, {
      pointSaleId: selectedPoint.value?.id,
      fulfillment: fulfillment.value,
      clientAddress: clientAddress.value,
      lines: lines.value.map((line) =>
        line.kind === 'MENU'
          ? { kind: 'MENU', menuOfferId: line.menuOfferId, dishes: (line.dishes || []).map((dish) => ({ itemId: dish.itemId, menuPart: dish.menuPart })) }
          : { kind: 'CARTA', descriptionId: line.descriptionId, quantity: Number(line.quantity) },
      ),
    })
    applyOrder(data)
    message.value = 'Pedido actualizado'
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

async function cancelOrder() {
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    const { data } = await http.post<ClientOrder>(`/pedidos/mios/${order.value?.id}/anular`)
    applyOrder(data)
    confirmCancel.value = false
    message.value = 'Pedido anulado'
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ScreenFrame title="Detalle del pedido" back>
    <p v-if="error && !order" class="error">{{ error }}</p>
    <template v-if="order">
      <h3>{{ order.business.commercialName }}</h3>
      <p class="muted">{{ order.statusLabel }}</p>
      <p class="muted">{{ new Date(order.createdAt).toLocaleString('es-PE', { timeZone: 'America/Lima' }) }}</p>
      <p v-if="editable" class="ok">{{ pendingNotice }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="message" class="ok">{{ message }}</p>

      <template v-if="editable">
        <label class="field">
          <span>Punto donde se Atiende el Pedido</span>
          <select v-model.number="pointId">
            <option v-for="point in points" :key="point.id" :value="point.id">{{ addressLine(point) }}</option>
          </select>
        </label>
        <div v-for="(line, index) in lines" :key="index">
          <p class="row">
            <span>{{ line.label }}</span>
            <button class="btn small secondary" type="button" @click="removeLine(index)">Quitar</button>
          </p>
          <label v-if="line.kind === 'CARTA'" class="field">
            <span>Cantidad{{ line.unitName ? ` · ${line.unitName}` : '' }}</span>
            <input v-model.number="line.quantity" type="number" :min="isKgUnit(line.unitName) ? 0.01 : 1" :step="isKgUnit(line.unitName) ? 0.01 : 1" />
          </label>
          <p v-if="line.kind === 'CARTA'" class="muted">{{ isKgUnit(line.unitName) ? 'Hasta dos decimales: 0.50, 0.25, 0.10' : 'Solo números enteros' }}</p>
          <p class="row"><span></span><strong>{{ money(lineAmount(line)) }}</strong></p>
        </div>
        <div class="row">
          <select v-model.number="addId">
            <option :value="0">Agregar producto</option>
            <option v-for="option in addOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
          </select>
          <button class="btn small" type="button" @click="addLine">Agregar</button>
        </div>
        <p class="row"><span>Subtotal</span><strong>{{ money(subtotal) }}</strong></p>
        <label class="field">
          <span>Entrega</span>
          <select v-model="fulfillment">
            <option value="RECOJO">Entrega en local</option>
            <option v-if="selectedPoint?.chargesDelivery" value="DELIVERY">Delivery a domicilio · {{ money(Number(selectedPoint.deliveryFee || 0)) }}</option>
          </select>
        </label>
        <label v-if="fulfillment === 'DELIVERY'" class="field">
          <span>Dirección de entrega</span>
          <input v-model="clientAddress" />
        </label>
        <p v-if="fulfillment === 'DELIVERY'" class="row"><span>Delivery a domicilio</span><strong>{{ money(deliveryAmount) }}</strong></p>
        <p class="row"><span>Total</span><strong>{{ money(orderTotal) }}</strong></p>
        <a v-if="paymentUrl" class="wa-btn" :href="paymentUrl" target="_blank" rel="noopener">Coordinar pago por WhatsApp</a>
        <button class="btn" type="button" :disabled="loading" @click="save">{{ loading ? 'Guardando…' : 'Guardar cambios' }}</button>
        <button class="btn secondary" type="button" @click="confirmCancel = true">Anular pedido</button>
        <div v-if="confirmCancel" class="card">
          <p>¿Anular este pedido?</p>
          <button class="btn" type="button" :disabled="loading" @click="cancelOrder">Confirmar anulación</button>
          <button class="btn secondary" type="button" @click="confirmCancel = false">Desistir</button>
        </div>
      </template>

      <template v-else>
        <p v-for="(line, index) in lines" :key="index" class="row">
          <span>{{ line.label }}<template v-if="line.kind === 'CARTA'"> · {{ isKgUnit(line.unitName) ? Number(line.quantity).toFixed(2) : line.quantity }} {{ line.unitName }}</template></span>
          <strong>{{ money(lineAmount(line)) }}</strong>
        </p>
        <p class="muted">{{ addressLine(order.pointSale) }}</p>
        <p class="muted">{{ order.fulfillment === 'DELIVERY' ? `Delivery a domicilio${order.clientAddress ? ' · ' + order.clientAddress : ''}` : 'Entrega en local' }}</p>
        <p v-if="order.fulfillment === 'DELIVERY'" class="row"><span>Delivery</span><strong>{{ money(Number(order.deliveryFee || 0)) }}</strong></p>
        <p class="row"><span>Total</span><strong>{{ money(order.total) }}</strong></p>
      </template>
    </template>
  </ScreenFrame>
</template>
