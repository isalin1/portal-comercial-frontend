<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import { isKgUnit, quantityError, type Business, type PointSale } from '../types'
import { clientDisplayName, openWhatsAppChat, whatsappChatUrl } from '../whatsapp'

type Dish = { itemId: number; menuPart: string; name: string }
type Draft = {
  kind: 'CARTA' | 'MENU'
  descriptionId: number | null
  quantity: number
  quantityServed: number
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
  clientName: string | null
  clientAddress: string | null
  deliveryFee: string | number
  total: number
  paid?: number
  balance?: number
  pointSaleId: number | null
  whatsappUrl?: string | null
  business: { id: number; commercialName: string; commercialDescription?: string }
  pointSale?: PointSale | null
  lines: {
    kind: 'CARTA' | 'MENU'
    name: string
    unitPrice: string
    quantityRequested: string
    quantityServed: string
    descriptionId: number | null
    unitName: string
    menuOfferId?: number | null
    dishes: Dish[]
  }[]
}

const route = useRoute()
const router = useRouter()
const auth = usePortalAuth()
const order = ref<ClientOrder | null>(null)
const business = ref<Business | null>(null)
const error = ref('')
const message = ref('')
const loading = ref(false)
const confirmCancel = ref(false)
const confirmDiscard = ref(false)
const editing = ref(false)
const cancelled = computed(() => order.value?.status === 'ANULADO')
const pointId = ref(0)
const fulfillment = ref<'RECOJO' | 'DELIVERY'>('RECOJO')
const clientAddress = ref('')
const lines = ref<Draft[]>([])
const addId = ref(0)

const editable = computed(() => order.value?.status === 'PENDIENTE_APROBACION')
const pending = computed(() => order.value?.status === 'PENDIENTE_APROBACION')
const points = computed(() => business.value?.pointSales || (order.value?.pointSale ? [order.value.pointSale] : []))
const selectedPoint = computed(() => points.value.find((point) => point.id === pointId.value) || points.value[0])

const clientName = computed(
  () => order.value?.clientName?.trim() || clientDisplayName(auth.user),
)
const businessName = computed(() => order.value?.business.commercialName || '')
const businessDescription = computed(() => order.value?.business.commercialDescription?.trim() || '')
const createdLabel = computed(() =>
  order.value
    ? new Date(order.value.createdAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })
    : '',
)

const rawAddress = computed(() => order.value?.clientAddress || '')
const orderNotes = computed(() => {
  const match = rawAddress.value.match(/Indicaciones:\s*([\s\S]+)/i)
  return match?.[1]?.trim() || ''
})
const deliveryAddressOnly = computed(() => {
  const part = rawAddress.value.split(/\nIndicaciones:/i)[0]?.trim() || ''
  if (!part || /^Indicaciones:/i.test(part)) return ''
  return part
})
const pointAddress = computed(() => addressLine(order.value?.pointSale || selectedPoint.value))

const orderWhatsAppPhone = computed(
  () =>
    order.value?.whatsappUrl ||
    selectedPoint.value?.whatsappUrl ||
    order.value?.pointSale?.whatsappUrl ||
    selectedPoint.value?.phone ||
    order.value?.pointSale?.phone ||
    '',
)

const orderWhatsAppText = computed(
  () =>
    `Hola, soy ${clientName.value}. Acabo de registrar un pedido. Agradecere me confirmes su atencion`,
)

const paymentUrl = computed(() => {
  if (!order.value) return ''
  return whatsappChatUrl(orderWhatsAppPhone.value, orderWhatsAppText.value)
})

function startWhatsAppChat() {
  openWhatsAppChat(orderWhatsAppPhone.value, orderWhatsAppText.value)
}

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

/** Cantidad que define el cobro: atendida (tras atención) o la pedida en edición. */
function billedQty(line: Draft) {
  if (line.kind === 'MENU') return 1
  if (editing.value) return Number(line.quantity) || 0
  const served = Number(line.quantityServed)
  if (Number.isFinite(served) && served > 0) return served
  return Number(line.quantity) || 0
}

const subtotal = computed(() => lines.value.reduce((sum, line) => sum + lineAmount(line), 0))
const deliveryAmount = computed(() => {
  if (fulfillment.value !== 'DELIVERY') return 0
  return selectedPoint.value?.chargesDelivery ? Number(selectedPoint.value.deliveryFee || 0) : Number(order.value?.deliveryFee || 0)
})
const orderTotal = computed(() => (editing.value ? subtotal.value + deliveryAmount.value : Number(order.value?.total || subtotal.value + deliveryAmount.value)))
const paidAmount = computed(() => Number(order.value?.paid || 0))
const balanceAmount = computed(() => {
  if (order.value?.balance != null) return Math.max(0, Number(order.value.balance))
  return Math.max(0, orderTotal.value - paidAmount.value)
})
const productCount = computed(() => lines.value.length)
const deliveryFeeLabel = computed(() => {
  if (fulfillment.value !== 'DELIVERY') return 'Entrega en local'
  const fee = deliveryAmount.value
  return fee ? money(fee) : 'Gratis (S/ 0.00)'
})

function lineAmount(line: Draft) {
  return line.unitPrice * billedQty(line)
}

function lineTitle(line: Draft) {
  if (line.kind === 'MENU') return line.label.split(' · ')[0] || 'Menú'
  return line.label.split(' · ')[0] || line.label
}

function lineDetail(line: Draft) {
  if (line.kind === 'MENU') {
    const dishes = (line.dishes || []).map((dish) => dish.name).filter(Boolean)
    if (dishes.length) return dishes.join(' + ')
    const parts = line.label.split(' · ')
    return parts.slice(1).join(' · ')
  }
  const parts = line.label.split(' · ')
  return parts.slice(1).join(' · ') || line.unitName
}

function qtyBadge(line: Draft) {
  if (line.kind === 'MENU') return '1x'
  const qty = billedQty(line)
  if (isKgUnit(line.unitName)) return `${qty.toFixed(2)} kg`
  return `${Number.isInteger(qty) ? qty : qty.toFixed(2)}x`
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
  const raw = data.clientAddress || ''
  const addressPart = raw.split(/\nIndicaciones:/i)[0]?.trim() || ''
  clientAddress.value = addressPart && !/^Indicaciones:/i.test(addressPart) ? addressPart : ''
  lines.value = data.lines.map((line) => ({
    kind: line.kind,
    descriptionId: line.descriptionId,
    quantity: Number(line.quantityRequested),
    quantityServed: Number(line.quantityServed ?? line.quantityRequested),
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
      quantityServed: 1,
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
    const notes = orderNotes.value
    const address = fulfillment.value === 'DELIVERY'
      ? [clientAddress.value.trim(), notes ? `Indicaciones: ${notes}` : ''].filter(Boolean).join('\n')
      : notes
        ? `Indicaciones: ${notes}`
        : clientAddress.value
    const { data } = await http.patch<ClientOrder>(`/pedidos/mios/${order.value?.id}`, {
      pointSaleId: selectedPoint.value?.id,
      fulfillment: fulfillment.value,
      clientAddress: address,
      lines: lines.value.map((line) =>
        line.kind === 'MENU'
          ? { kind: 'MENU', menuOfferId: line.menuOfferId, dishes: (line.dishes || []).map((dish) => ({ itemId: dish.itemId, menuPart: dish.menuPart })) }
          : { kind: 'CARTA', descriptionId: line.descriptionId, quantity: Number(line.quantity) },
      ),
    })
    applyOrder(data)
    editing.value = false
    message.value = 'Pedido actualizado'
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

async function cancelOrder() {
  if (!editable.value) {
    error.value = 'Solo se puede anular un pedido pendiente de aprobación.'
    return
  }
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    await http.post<ClientOrder>(`/pedidos/mios/${order.value?.id}/anular`)
    confirmCancel.value = false
    editing.value = false
    await router.replace({ name: 'account', query: { anulados: '1' } })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

async function discardOrder() {
  if (!cancelled.value) {
    error.value = 'Solo se puede descartar un pedido anulado.'
    return
  }
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    await http.delete(`/pedidos/mios/${order.value?.id}`)
    confirmDiscard.value = false
    order.value = null
    await router.replace({ name: 'account', query: { anulados: '1' } })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ScreenFrame title="Detalle del pedido" storefront back bar>
    <p v-if="error && !order" class="error">{{ error }}</p>

    <template v-if="order">
      <section class="hero-card">
        <div class="hero-top">
          <span v-if="pending" class="status pending">
            <i aria-hidden="true" />
            Pendiente de aprobación
          </span>
          <span v-else class="status muted-status">{{ order.statusLabel }}</span>
        </div>
        <div class="merchant">
          <div class="merchant-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 3v7a2 2 0 002 2h1v9h2V3H7v7H6V3H4zm10 0c0 4 2 6 2 9v9h2V12c2 0 3-3 3-9h-7z" />
            </svg>
          </div>
          <div>
            <strong>{{ businessName }}</strong>
            <em v-if="businessDescription">{{ businessDescription }}</em>
            <span>{{ createdLabel }}</span>
          </div>
        </div>
      </section>

      <section v-if="pending && !editing" class="alert">
        <div class="alert-icon" aria-hidden="true">i</div>
        <div>
          <strong>¡Pedido registrado con éxito!</strong>
          <p>
            Quedó <b>pendiente de aprobación</b>. Coordina el pago directamente por WhatsApp con el local para comenzar la preparación.
          </p>
        </div>
      </section>

      <section v-else-if="order.status === 'ANULADO'" class="alert cancelled">
        <div class="alert-icon" aria-hidden="true">i</div>
        <div>
          <strong>Pedido anulado</strong>
          <p>Este pedido ya no está pendiente de aprobación ni aparece en el panel del negocio.</p>
        </div>
      </section>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="message" class="ok">{{ message }}</p>

      <template v-if="!editing">
        <section class="card">
          <header class="card-head">
            <strong>Datos de Atención y Entrega</strong>
          </header>
          <div class="data-row">
            <span class="label">Punto de atención</span>
            <span class="value">{{ pointAddress || '—' }}</span>
          </div>
          <div v-if="order.fulfillment === 'DELIVERY' && deliveryAddressOnly" class="data-row">
            <span class="label">Dirección de entrega</span>
            <span class="value">{{ deliveryAddressOnly }}</span>
          </div>
          <div v-else-if="order.fulfillment === 'RECOJO'" class="data-row">
            <span class="label">Modalidad</span>
            <span class="value">Entrega en local</span>
          </div>
          <div v-if="orderNotes" class="notes-box">
            <span class="label">Indicaciones</span>
            <span class="value italic">“{{ orderNotes }}”</span>
          </div>
        </section>

        <section class="card">
          <header class="card-head">
            <strong>Resumen de productos</strong>
            <span>{{ productCount }} producto{{ productCount === 1 ? '' : 's' }}</span>
          </header>
          <article v-for="(line, index) in lines" :key="index" class="product">
            <span class="qty">{{ qtyBadge(line) }}</span>
            <div class="product-text">
              <strong>{{ lineTitle(line) }}</strong>
              <span v-if="lineDetail(line)">{{ lineDetail(line) }}</span>
            </div>
            <em>{{ money(lineAmount(line)) }}</em>
          </article>
        </section>

        <section class="card totals">
          <p><span>Subtotal</span><span>{{ money(subtotal) }}</span></p>
          <p><span>Entrega / Delivery</span><span>{{ deliveryFeeLabel }}</span></p>
          <p class="total"><span>Total a pagar</span><b>{{ money(orderTotal) }}</b></p>
          <p class="pay-row"><span>Pagos realizados</span><span>{{ money(paidAmount) }}</span></p>
          <p class="pay-row balance" :class="{ settled: balanceAmount <= 0 }">
            <span>Saldo pendiente</span>
            <strong>{{ money(balanceAmount) }}</strong>
          </p>
        </section>

        <button v-if="paymentUrl && pending" class="wa-btn" type="button" @click="startWhatsAppChat">
          Coordinar pago por WhatsApp
        </button>
        <button class="home-btn" type="button" @click="router.push({ name: 'home' })">Volver al inicio</button>
        <button
          v-if="cancelled"
          class="action danger"
          type="button"
          :disabled="loading"
          @click="confirmDiscard = true"
        >
          Descartar
        </button>

        <button v-if="editable" class="link-edit" type="button" @click="editing = true">Modificar pedido</button>

        <div v-if="confirmDiscard" class="confirm-backdrop" @click.self="confirmDiscard = false">
          <div class="confirm-card" role="dialog" aria-modal="true" aria-labelledby="discard-title">
            <strong id="discard-title">¿Descartar este pedido?</strong>
            <p>Se borrará definitivamente de Pedidos anulados y no se podrá recuperar.</p>
            <button class="action danger" type="button" :disabled="loading" @click="discardOrder">
              {{ loading ? 'Descartando…' : 'Sí, descartar' }}
            </button>
            <button class="action secondary" type="button" :disabled="loading" @click="confirmDiscard = false">
              Desistir
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <section class="card edit-card">
          <header class="card-head">
            <strong>Modificar pedido</strong>
          </header>

          <label class="edit-field">
            <span>Punto donde se Atiende el Pedido</span>
            <select v-model.number="pointId">
              <option v-for="point in points" :key="point.id" :value="point.id">{{ addressLine(point) }}</option>
            </select>
          </label>

          <article v-for="(line, index) in lines" :key="index" class="edit-item">
            <div class="edit-item-top">
              <div>
                <strong>{{ line.label }}</strong>
              </div>
              <button class="chip drop" type="button" @click="removeLine(index)">Quitar</button>
            </div>
            <div v-if="line.kind === 'CARTA'" class="edit-item-row">
              <label class="edit-field qty">
                <span>Cantidad{{ line.unitName ? ` · ${line.unitName}` : '' }}</span>
                <input
                  v-model.number="line.quantity"
                  type="number"
                  :min="isKgUnit(line.unitName) ? 0.01 : 1"
                  :step="isKgUnit(line.unitName) ? 0.01 : 1"
                />
              </label>
              <em>{{ money(lineAmount(line)) }}</em>
            </div>
            <div v-else class="edit-item-row">
              <span class="muted-line">Menú</span>
              <em>{{ money(lineAmount(line)) }}</em>
            </div>
          </article>

          <div class="add-row">
            <select v-model.number="addId">
              <option :value="0">Agregar producto</option>
              <option v-for="option in addOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
            <button class="chip edit" type="button" @click="addLine">Agregar</button>
          </div>

          <label class="edit-field">
            <span>Entrega</span>
            <select v-model="fulfillment">
              <option value="RECOJO">Entrega en local</option>
              <option v-if="selectedPoint?.chargesDelivery" value="DELIVERY">
                Delivery a domicilio · {{ money(Number(selectedPoint.deliveryFee || 0)) }}
              </option>
            </select>
          </label>
          <label v-if="fulfillment === 'DELIVERY'" class="edit-field">
            <span>Dirección de entrega</span>
            <input v-model="clientAddress" placeholder="Calle, urbanización, referencia" />
          </label>

          <p class="edit-total"><span>Total</span><b>{{ money(orderTotal) }}</b></p>
        </section>

        <div class="edit-actions">
          <button class="action primary" type="button" :disabled="loading" @click="save">
            {{ loading ? 'Guardando…' : 'Guardar cambios' }}
          </button>
          <button class="action secondary" type="button" :disabled="loading" @click="editing = false">
            Cancelar edición
          </button>
          <button
            v-if="editable"
            class="action danger"
            type="button"
            :disabled="loading"
            @click="confirmCancel = true"
          >
            Anular pedido
          </button>
        </div>

        <div v-if="confirmCancel" class="confirm-backdrop" @click.self="confirmCancel = false">
          <div class="confirm-card" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <strong id="cancel-title">¿Anular este pedido?</strong>
            <p>El pedido dejará de estar pendiente de aprobación y pasará a Pedidos anulados.</p>
            <button class="action danger" type="button" :disabled="loading" @click="cancelOrder">
              {{ loading ? 'Anulando…' : 'Sí, anular pedido' }}
            </button>
            <button class="action secondary" type="button" :disabled="loading" @click="confirmCancel = false">
              Desistir
            </button>
          </div>
        </div>
      </template>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.hero-card,
.card,
.alert {
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--color-line);
  padding: 16px;
  margin-bottom: 12px;
}

.hero-top {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 10px;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.status.pending {
  background: #fffbeb;
  color: #b45309;
}

.status.pending i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
}

.status.muted-status {
  background: #f1f5f9;
  color: #475569;
}

.merchant {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.merchant-mark {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #f1f5f9;
  color: var(--color-brand);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.merchant strong {
  display: block;
  font-size: 14px;
  font-weight: 800;
}

.merchant em {
  display: block;
  margin-top: 2px;
  font-style: normal;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.merchant span {
  display: block;
  margin-top: 4px;
  color: var(--color-muted);
  font-size: 12px;
}

.alert {
  display: flex;
  gap: 12px;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.alert.cancelled {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.alert.cancelled .alert-icon {
  background: #e2e8f0;
  color: #475569;
}

.alert.cancelled strong {
  color: #334155;
}

.alert-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #d1fae5;
  color: #047857;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.alert strong {
  display: block;
  color: #047857;
  font-size: 13px;
}

.alert p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #334155;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-head strong {
  font-size: 14px;
}

.card-head span {
  color: var(--color-muted);
  font-size: 12px;
}

.data-row,
.notes-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
}

.notes-box {
  padding: 10px;
  border-radius: 10px;
  background: #f8fafc;
}

.label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.value {
  font-size: 13px;
  color: var(--color-ink);
}

.value.italic {
  font-style: italic;
}

.product {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.product:last-child {
  margin-bottom: 0;
}

.qty {
  min-width: 36px;
  height: 28px;
  padding: 0 6px;
  border-radius: 999px;
  background: #e2e8f0;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
  white-space: nowrap;
}

.product-text {
  flex: 1;
  min-width: 0;
}

.product-text strong {
  display: block;
  font-size: 13px;
}

.product-text span {
  display: block;
  margin-top: 2px;
  color: var(--color-muted);
  font-size: 12px;
}

.product em {
  font-style: normal;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.totals p {
  display: flex;
  justify-content: space-between;
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--color-muted);
}

.totals .total {
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid var(--color-line);
  color: var(--color-ink);
  font-weight: 800;
}

.totals .total b {
  color: var(--color-brand);
  font-size: 22px;
  font-weight: 900;
}

.totals .pay-row {
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px dashed #cbd5e1;
  color: var(--color-ink);
  font-size: 13px;
  font-weight: 600;
}

.totals .pay-row.balance strong {
  color: #b45309;
  font-size: 16px;
  font-weight: 800;
}

.totals .pay-row.balance.settled strong {
  color: #047857;
}

.wa-btn,
.home-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border-radius: var(--radius-control);
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  border: 0;
  cursor: pointer;
  margin-bottom: 10px;
}

.wa-btn {
  background: #25d366;
  color: #fff;
  box-shadow: 0 8px 16px -10px rgba(37, 211, 102, 0.7);
}

.home-btn {
  background: #f1f5f9;
  color: #475569;
}

.link-edit {
  display: block;
  width: 100%;
  margin: 4px 0 0;
  border: 0;
  background: transparent;
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
}

.ok {
  color: #047857;
  font-size: 13px;
  font-weight: 600;
}

.edit-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
}

.edit-field span {
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
}

.edit-field input,
.edit-field select,
.add-row select {
  width: 100%;
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink);
}

.edit-item {
  padding: 12px 0;
  border-top: 1px solid var(--color-line);
}

.edit-item-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.edit-item-top strong {
  font-size: 13px;
  line-height: 1.35;
}

.edit-item-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.edit-field.qty {
  flex: 1;
}

.edit-field.qty input {
  max-width: 120px;
  min-height: 40px;
}

.edit-item-row em {
  font-style: normal;
  font-size: 15px;
  font-weight: 800;
}

.muted-line {
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
}

.chip {
  border: 0;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.chip.drop {
  background: #fff1f2;
  color: #e11d48;
}

.chip.edit {
  background: #fff1f2;
  color: var(--color-brand);
}

.add-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.add-row select {
  flex: 1;
}

.edit-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 4px 0 0;
  padding-top: 12px;
  border-top: 1px dashed #cbd5e1;
  font-size: 14px;
  font-weight: 800;
}

.edit-total b {
  color: var(--color-brand);
  font-size: 22px;
  font-weight: 900;
}

.edit-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action.primary {
  background: var(--color-brand);
  color: #fff;
  box-shadow: 0 10px 20px -10px rgba(226, 18, 33, 0.55);
}

.action.secondary {
  background: #f1f5f9;
  color: #475569;
}

.action.danger {
  background: #fff1f2;
  color: #be123c;
  border: 1px solid #fecdd3;
}

.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
}

.confirm-card {
  width: min(100%, 360px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 16px;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
}

.confirm-card strong {
  font-size: 16px;
}

.confirm-card p {
  margin: 0 0 6px;
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.4;
}
</style>
