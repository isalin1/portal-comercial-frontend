<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import { isKgUnit, menuOfferIdsOf, quantityError, type Business, type PointSale } from '../types'
import { zoneParams } from '../zone'

const route = useRoute()
const router = useRouter()
const auth = usePortalAuth()
const business = ref<Business | null>(null)
const error = ref('')
const pointId = ref(0)
const pickedOfferId = ref(0)
const cart = ref<{ kind: string; descriptionId?: number; quantity?: number; unitName?: string; unitPrice: number; menuOfferId?: number; dishes?: { itemId: number; menuPart: string }[]; label: string; draft?: boolean }[]>([])
const fulfillment = ref<'RECOJO' | 'DELIVERY'>('RECOJO')
const clientAddress = ref('')

const categoryId = computed(() => {
  const value = route.query.categoria
  return typeof value === 'string' && value ? Number(value) : undefined
})

async function load() {
  error.value = ''
  business.value = null
  const id = Number(route.params.id)
  try {
    if (categoryId.value) {
      const { data } = await http.get<Business[]>('/public/businesses', {
        params: { categoryId: categoryId.value, ...zoneParams() },
      })
      business.value = data.find((item) => item.id === id) ?? null
      if (!business.value) {
        const single = await http.get<Business>(`/public/businesses/${id}`, { params: zoneParams() })
        if (single.data?.marketId) business.value = single.data
      }
      if (!business.value) error.value = 'Este negocio no tiene oferta en esta categoría'
      return
    }
    const { data } = await http.get<Business>(`/public/businesses/${id}`, { params: zoneParams() })
    business.value = data
  } catch (err) {
    error.value = apiError(err)
  }
}

onMounted(load)
watch(() => [route.params.id, route.query.categoria], load)

function addressLine(point: PointSale) {
  const address = point.address
  if (!address) return ''
  return [address.street, address.urbanZone, address.district?.name].filter(Boolean).join(', ')
}

function money(price: string | number) {
  return `S/ ${Number(price).toFixed(2)}`
}

const canBuy = computed(() => auth.userType === 'CLIENTE' || auth.userType === 'EMPRESARIO')
const orderable = computed(() => {
  if (business.value?.publicOffer === false) return false
  if (business.value?.clientOrders === false) return false
  const name = business.value?.rubro?.name || ''
  return /alimento|comercio|servicio|fruta/i.test(name) && !/profesional/i.test(name)
})

const points = computed(() => {
  const list = business.value?.pointSales || []
  if (business.value?.publicOffer === false) return list
  return list.filter((point) => (point.items || []).length > 0)
})

const selectedPoint = computed(() => points.value.find((point) => point.id === pointId.value) || points.value[0])

const items = computed(() => selectedPoint.value?.items || [])
const carta = computed(() => items.value.filter((item) => item.kind !== 'MENU'))
const showsMenuLabels = computed(() => items.value.some((item) => item.category?.name === 'Comida Criolla y Menús'))
const menuGroups = [
  { key: 'ENTRADA', label: 'Entrada' },
  { key: 'SEGUNDO', label: 'Segundo' },
  { key: 'REFRESCO', label: 'Refrescos' },
] as const
const canBuildMenu = computed(() => orderable.value && canBuy.value)
const menuTypes = computed(() =>
  (business.value?.menuOffers || [])
    .map((offer) => ({
      ...offer,
      parts: menuGroups.map((group) => ({
        ...group,
        items: items.value.filter((item) => item.kind === 'MENU' && item.menuPart === group.key && menuOfferIdsOf(item).includes(offer.id)),
      })),
    }))
    .filter((offer) => offer.parts.some((part) => part.items.length)),
)
const picked = ref<Record<string, number | null>>({ ENTRADA: null, SEGUNDO: null, REFRESCO: null })

watch(points, (list) => {
  if (!pointId.value && list[0]) pointId.value = list[0].id
}, { immediate: true })

watch(pointId, (_next, previous) => {
  if (previous) cart.value = []
})

function scrollToOrder() {
  nextTick(() => document.getElementById('pedido')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function takeRequestedProduct() {
  const raw = route.query.agregar
  const descriptionId = typeof raw === 'string' ? Number(raw) : 0
  if (!descriptionId) {
    return
  }
  for (const item of items.value) {
    const line = item.descriptions.find((entry) => entry.id === descriptionId && entry.price != null)
    if (!line?.id) continue
    if (canBuy.value) addProduct(line.id, `${item.name} · ${line.description}`, Number(line.price))
    scrollToOrder()
    return
  }
}

const menuRequestDone = ref(false)

function takeRequestedMenu() {
  if (menuRequestDone.value) return
  const raw = route.query.elige
  const itemId = typeof raw === 'string' ? Number(raw) : 0
  if (!itemId) return
  const item = items.value.find((entry) => entry.id === itemId && entry.kind === 'MENU' && entry.menuPart && menuOfferIdsOf(entry).length)
  if (!item?.menuPart) return
  const requested = typeof route.query.tipo === 'string' ? Number(route.query.tipo) : 0
  const offerId = menuOfferIdsOf(item).includes(requested) ? requested : menuOfferIdsOf(item)[0]
  if (!offerId) return
  menuRequestDone.value = true
  chooseOption(offerId, item.menuPart, item.id)
}

watch(items, () => {
  takeRequestedProduct()
  takeRequestedMenu()
})

function descriptionOf(descriptionId: number) {
  for (const item of items.value) {
    const line = item.descriptions.find((entry) => entry.id === descriptionId)
    if (line) return line
  }
  return null
}

function addProduct(descriptionId: number, label: string, unitPrice?: number) {
  if (!canBuy.value) {
    scrollToOrder()
    return
  }
  const price = unitPrice ?? pricedLine(descriptionId)
  const unitName = descriptionOf(descriptionId)?.unit?.name || ''
  const current = cart.value.find((line) => line.descriptionId === descriptionId)
  if (current) current.quantity = (current.quantity || 1) + 1
  else cart.value.push({ kind: 'CARTA', descriptionId, quantity: 1, unitName, unitPrice: price, label })
  scrollToOrder()
}

function pricedLine(descriptionId: number) {
  for (const item of items.value) {
    const line = item.descriptions.find((entry) => entry.id === descriptionId)
    if (line?.price != null) return Number(line.price)
  }
  return 0
}

function syncMenuOrder() {
  cart.value = cart.value.filter((line) => !line.draft)
  const dishes = menuGroups
    .filter((group) => picked.value[group.key])
    .map((group) => ({ itemId: picked.value[group.key] as number, menuPart: group.key }))
  const offer = (business.value?.menuOffers || []).find((item) => item.id === pickedOfferId.value)
  if (!dishes.length || !offer) return
  cart.value.push({
    kind: 'MENU',
    draft: true,
    menuOfferId: offer.id,
    dishes,
    unitPrice: Number(offer.price),
    label: `${offer.name} · ${pickedItems.value.map((item) => item.name).join(' + ')}`,
  })
}

function chooseOption(offerId: number, part: string, id: number) {
  if (!orderable.value) return
  if (!canBuy.value) {
    error.value = 'Para armar un menú necesitas una cuenta de cliente.'
    scrollToOrder()
    return
  }
  const chosen = Object.values(picked.value).some((value) => value)
  if (chosen && pickedOfferId.value && pickedOfferId.value !== offerId) {
    error.value = 'No se pueden elegir platos de tipos de menú distintos.'
    scrollToOrder()
    return
  }
  pickedOfferId.value = offerId
  picked.value = { ...picked.value, [part]: picked.value[part] === id ? null : id }
  if (!Object.values(picked.value).some((value) => value)) pickedOfferId.value = 0
  error.value = ''
  syncMenuOrder()
  scrollToOrder()
}

function removeLine(index: number) {
  const line = cart.value[index]
  cart.value.splice(index, 1)
  if (line?.draft) {
    picked.value = { ENTRADA: null, SEGUNDO: null, REFRESCO: null }
    pickedOfferId.value = 0
  }
}

async function placeOrder() {
  error.value = ''
  const invalid = cart.value.find((line) => line.kind !== 'MENU' && quantityError(line.unitName, Number(line.quantity)))
  if (invalid) {
    error.value = quantityError(invalid.unitName, Number(invalid.quantity))
    return
  }
  if (selectedPoint.value?.isOpen !== true) {
    error.value = 'El pedido no se registró porque el negocio no está abierto.'
    return
  }
  if (fulfillment.value === 'DELIVERY' && !selectedPoint.value?.chargesDelivery) {
    error.value = 'El pedido no se registró porque este punto de venta no ofrece delivery.'
    return
  }
  if (fulfillment.value === 'DELIVERY' && !clientAddress.value.trim()) {
    error.value = 'El pedido no se registró porque el delivery exige una dirección de entrega.'
    return
  }
  try {
    const { data } = await http.post<{ id: number }>('/pedidos/cliente', {
      businessId: business.value?.id,
      pointSaleId: selectedPoint.value?.id,
      fulfillment: fulfillment.value,
      clientAddress: clientAddress.value,
      lines: cart.value.map((line) => ({
        kind: line.kind,
        descriptionId: line.descriptionId,
        quantity: line.quantity,
        menuOfferId: line.menuOfferId,
        dishes: line.dishes,
      })),
    })
    cart.value = []
    await router.push({ name: 'client-order', params: { id: data.id } })
  } catch (err) {
    error.value = apiError(err)
  }
}

function lineAmount(line: { unitPrice: number; quantity?: number; kind: string }) {
  const qty = line.kind === 'MENU' ? 1 : line.quantity || 1
  return line.unitPrice * qty
}

const subtotal = computed(() => cart.value.reduce((sum, line) => sum + lineAmount(line), 0))
const deliveryAmount = computed(() => {
  if (fulfillment.value !== 'DELIVERY') return 0
  return selectedPoint.value?.chargesDelivery ? Number(selectedPoint.value.deliveryFee || 0) : 0
})

watch(selectedPoint, (point) => {
  if (fulfillment.value === 'DELIVERY' && !point?.chargesDelivery) fulfillment.value = 'RECOJO'
})
const orderTotal = computed(() => subtotal.value + deliveryAmount.value)

const pickedItems = computed(() =>
  items.value.filter((item) => Object.values(picked.value).includes(item.id)),
)
</script>

<template>
  <ScreenFrame :title="business ? `${business.commercialName}${business.commercialDescription ? ' ' + business.commercialDescription : ''}` : 'Oferta'" back>
    <p v-if="error && !business" class="error">{{ error }}</p>
    <template v-if="business">
      <img v-if="business.imageUrl" :src="business.imageUrl" :alt="business.commercialName" class="thumb" style="height: 140px; border-radius: 8px" />
      <p class="muted">{{ business.rubro?.name }}</p>
      <div v-if="points.length" class="card">
        <div class="address-row">
          <article v-for="point in points" :key="point.id" class="address-card">
            <p>{{ addressLine(point) }}</p>
            <p class="muted">{{ point.scheduleLabel || 'Horario no registrado' }}</p>
            <span v-if="point.isOpen === true" class="badge open">Abierto</span>
            <span v-else-if="point.isOpen === false" class="badge off">Cerrado</span>
            <a v-if="point.whatsappUrl" class="wa-btn" :href="point.whatsappUrl">{{ orderable ? 'Crea tu pedido directamente o por WhatsApp' : 'WhatsApp' }}</a>
            <p v-else-if="business.showPhone && point.phone">{{ point.phone }}</p>
          </article>
        </div>
        <template v-if="business.publicOffer !== false">
        <h3 v-if="showsMenuLabels" class="rubro-title">Platos a la carta</h3>
        <div v-if="carta.length" class="product-grid">
          <article v-for="item in carta" :key="item.id" class="product-card">
            <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
            <div v-else class="thumb" style="height: 120px; border-radius: 6px" />
            <strong>{{ item.name }}</strong>
            <div v-for="line in item.descriptions" :key="line.id || line.description" class="row">
              <span>{{ line.description }}</span>
              <span class="price">{{ line.price == null ? '' : money(line.price) }}</span>
              <button v-if="orderable && canBuy && line.id && line.price != null" class="btn small" type="button" @click="addProduct(line.id, `${item.name} · ${line.description}`, Number(line.price))">Agregar</button>
            </div>
          </article>
        </div>
        <template v-if="menuTypes.length">
        <h3 v-if="showsMenuLabels" class="rubro-title">Menú del día</h3>
        <p v-if="orderable" class="muted">Elige una opción en cada grupo del mismo tipo de menú. No se pueden mezclar tipos distintos.</p>
        <section v-for="offer in menuTypes" :key="offer.id">
          <h3>{{ offer.name }} · S/ {{ Number(offer.price).toFixed(2) }}</h3>
          <section v-for="group in offer.parts.filter((group) => group.items.length)" :key="`${offer.id}-${group.key}`">
            <h3>{{ group.label }}</h3>
            <div class="product-grid">
              <article v-for="item in group.items" :key="`${offer.id}-${item.id}`" class="product-card" :style="pickedOfferId === offer.id && picked[group.key] === item.id ? 'outline: 2px solid #e10600' : ''">
                <button v-if="orderable" class="btn small" type="button" style="margin-bottom: 8px" @click="chooseOption(offer.id, group.key, item.id)">
                  {{ pickedOfferId === offer.id && picked[group.key] === item.id ? 'Elegida' : 'Elige opción' }}
                </button>
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                <div v-else class="thumb" style="height: 120px; border-radius: 6px" />
                <strong>{{ item.name }}</strong>
                <p v-for="line in item.descriptions" :key="line.id || line.description" class="muted">{{ line.description }}</p>
              </article>
            </div>
          </section>
        </section>
        <p v-if="canBuildMenu && pickedItems.length" class="ok">Menú: {{ pickedItems.map((item) => item.name).join(' + ') }}</p>
        </template>
        </template>
        <section v-if="orderable" id="pedido" class="card">
          <h3 class="rubro-title">Tu pedido</h3>
          <p v-if="selectedPoint?.isOpen !== true" class="error">Este punto de venta está cerrado. Solo se puede pedir cuando está abierto.</p>
          <p v-if="error && !canBuy" class="error">{{ error }}</p>
          <p v-if="!auth.isAuthenticated" class="muted">Para registrar un pedido necesitas una cuenta de cliente. Usa tus datos registrados.</p>
          <router-link v-if="!auth.isAuthenticated" class="btn" style="display: block; text-align: center; text-decoration: none" :to="{ name: 'register', params: { tipo: 'cliente' } }">Registrarme</router-link>
          <router-link v-if="!auth.isAuthenticated" class="btn secondary" style="display: block; text-align: center; text-decoration: none" :to="{ name: 'login' }">Ingresar</router-link>
          <template v-else-if="canBuy">
            <p class="muted">{{ auth.user?.firstName }} {{ auth.user?.lastName }} · {{ auth.user?.phone }}</p>
            <label class="field">
              <span>Punto donde se Atiende el Pedido</span>
              <select v-model.number="pointId">
                <option v-for="point in points" :key="point.id" :value="point.id">{{ addressLine(point) }}</option>
              </select>
            </label>
            <div v-for="(line, index) in cart" :key="index">
              <p class="row">
                <span>{{ line.label }}</span>
                <button class="btn small secondary" type="button" @click="removeLine(index)">Quitar</button>
              </p>
              <label v-if="line.kind !== 'MENU'" class="field">
                <span>Cantidad{{ line.unitName ? ` · ${line.unitName}` : '' }}</span>
                <input
                  v-model.number="line.quantity"
                  type="number"
                  :min="isKgUnit(line.unitName) ? 0.01 : 1"
                  :step="isKgUnit(line.unitName) ? 0.01 : 1"
                  required
                />
              </label>
              <p v-if="line.kind !== 'MENU'" class="muted">{{ isKgUnit(line.unitName) ? 'Hasta dos decimales: 0.50, 0.25, 0.10' : 'Solo números enteros' }}</p>
              <p class="row"><span></span><strong>S/ {{ lineAmount(line).toFixed(2) }}</strong></p>
            </div>
            <p class="row"><span>Subtotal</span><strong>S/ {{ subtotal.toFixed(2) }}</strong></p>
            <label class="field">
              <span>Entrega</span>
              <select v-model="fulfillment">
                <option value="RECOJO">Entrega en local</option>
                <option v-if="selectedPoint?.chargesDelivery" value="DELIVERY">Delivery a domicilio · S/ {{ Number(selectedPoint.deliveryFee || 0).toFixed(2) }}</option>
              </select>
            </label>
            <label v-if="fulfillment === 'DELIVERY'" class="field">
              <span>Dirección de entrega</span>
              <input v-model="clientAddress" required />
            </label>
            <p v-if="fulfillment === 'DELIVERY'" class="row"><span>Delivery a domicilio</span><strong>S/ {{ deliveryAmount.toFixed(2) }}</strong></p>
            <p class="row"><span>Total</span><strong>S/ {{ orderTotal.toFixed(2) }}</strong></p>
            <p v-if="error" class="error">{{ error }}</p>
            <button class="btn" type="button" :disabled="!cart.length || selectedPoint?.isOpen !== true" @click="placeOrder">Registrar pedido</button>
          </template>
        </section>
      </div>
      <p v-else class="muted">Este negocio no tiene oferta publicada.</p>
    </template>
  </ScreenFrame>
</template>
