<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import WhatsAppAccess from '../components/WhatsAppAccess.vue'
import AffiliationBadge from '../components/AffiliationBadge.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import { isKgUnit, menuOfferIdsOf, quantityError, type Business, type PointSale } from '../types'
import { clientDisplayName, professionalAppointmentWhatsApp, whatsappChatUrl } from '../whatsapp'
import { trackBusinessOpen } from '../track'
import { zoneParams } from '../zone'

const OPERATOR_ORDER_KEY = 'portal-operator-order'

type OperatorDraft = {
  businessId: number
  pointSaleId: number
  clientName: string
  clientPhone: string
  clientAddress: string
  fulfillment: 'RECOJO' | 'DELIVERY'
  requireOrderPayment?: boolean
}

const route = useRoute()
const router = useRouter()
const auth = usePortalAuth()
const business = ref<Business | null>(null)
const error = ref('')
const menuPickError = ref('')
const pointId = ref(0)
const pickedOfferId = ref(0)
const cart = ref<{ kind: string; descriptionId?: number; quantity?: number; unitName?: string; unitPrice: number; menuOfferId?: number; dishes?: { itemId: number; menuPart: string }[]; label: string; draft?: boolean }[]>([])
const fulfillment = ref<'RECOJO' | 'DELIVERY'>('RECOJO')
const clientAddress = ref('')
const orderNotes = ref('')
const checkoutStep = ref<'cart' | 'preorder'>('cart')
const placing = ref(false)
const trackedOpenId = ref(0)
const operatorDraft = ref<OperatorDraft | null>(null)
const orderPayment = ref(0)
const isOperatorOrder = computed(() => route.query.operador === '1' && Boolean(operatorDraft.value))

function readOperatorDraft() {
  if (route.query.operador !== '1') {
    operatorDraft.value = null
    return
  }
  try {
    const raw = sessionStorage.getItem(OPERATOR_ORDER_KEY)
    if (!raw) {
      operatorDraft.value = null
      error.value = 'El registro del cliente expiró. Vuelve a Pedidos y crea el pedido de nuevo.'
      return
    }
    const draft = JSON.parse(raw) as OperatorDraft
    if (Number(draft.businessId) !== Number(route.params.id)) {
      operatorDraft.value = null
      error.value = 'El pedido no corresponde a este negocio.'
      return
    }
    operatorDraft.value = draft
    pointId.value = draft.pointSaleId || Number(route.query.punto) || 0
    fulfillment.value = draft.fulfillment || 'RECOJO'
    clientAddress.value = draft.clientAddress || ''
  } catch {
    operatorDraft.value = null
    error.value = 'No se pudo recuperar el cliente del pedido.'
  }
}

const categoryId = computed(() => {
  const value = route.query.categoria
  return typeof value === 'string' && value ? Number(value) : undefined
})

async function load() {
  error.value = ''
  business.value = null
  const id = Number(route.params.id)
  try {
    const { data } = await http.get<Business>(`/public/businesses/${id}`, { params: zoneParams() })
    business.value = data
    if (trackedOpenId.value !== id) {
      trackedOpenId.value = id
      trackBusinessOpen(id)
    }
  } catch (err) {
    error.value = apiError(err)
  }
}

onMounted(() => {
  readOperatorDraft()
  load()
})
watch(() => [route.params.id, route.query.categoria, route.query.operador], () => {
  readOperatorDraft()
  load()
})

function addressLine(point: PointSale) {
  const address = point.address
  if (!address) return ''
  return [address.street, address.urbanZone, address.district?.name].filter(Boolean).join(', ')
}

function money(price: string | number) {
  return `S/ ${Number(price).toFixed(2)}`
}

const canBuy = computed(() => auth.userType === 'CLIENTE' || auth.userType === 'EMPRESARIO')
const isProfessional = computed(() => /profesional/i.test(business.value?.rubro?.name || ''))
const orderable = computed(() => {
  if (isOperatorOrder.value) return !isProfessional.value
  if (business.value?.publicOffer === false) return false
  if (business.value?.clientOrders === false) return false
  if (isProfessional.value) return false
  return true
})
const requiresOperatorPayment = computed(() => Boolean(operatorDraft.value?.requireOrderPayment || business.value?.requireOrderPayment))
const whatsappLabel = computed(() => {
  if (isProfessional.value) return 'Consulta y agenda tu cita aqui'
  return orderable.value ? 'Crea tu pedido directamente o por WhatsApp' : 'WhatsApp'
})
const authRedirect = computed(() => ({
  name: 'login' as const,
  query: { tipo: 'cliente', redirect: route.fullPath },
}))
const registerRedirect = computed(() => ({
  name: 'register' as const,
  params: { tipo: 'cliente' },
  query: { redirect: route.fullPath },
}))

function whatsappHref(point: PointSale) {
  if (!point.whatsappUrl) return ''
  if (isProfessional.value) {
    return professionalAppointmentWhatsApp(point.whatsappUrl, clientDisplayName(auth.user))
  }
  return whatsappChatUrl(point.whatsappUrl)
}

const points = computed(() => {
  const list = business.value?.pointSales || []
  if (business.value?.publicOffer === false) return list
  return list.filter((point) => (point.items || []).length > 0)
})

const selectedPoint = computed(() => points.value.find((point) => point.id === pointId.value) || points.value[0])

const items = computed(() => selectedPoint.value?.items || [])
const dailyOffers = computed(() => items.value.filter((item) => item.kind === 'OFERTA_DIA'))
const carta = computed(() => items.value.filter((item) => item.kind !== 'MENU' && item.kind !== 'OFERTA_DIA'))
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
const partLabel: Record<string, string> = {
  ENTRADA: 'entrada',
  SEGUNDO: 'segundo',
  REFRESCO: 'refresco',
}

watch(points, (list) => {
  if (!pointId.value && list[0]) pointId.value = list[0].id
}, { immediate: true })

watch(pointId, (_next, previous) => {
  if (previous) {
    cart.value = []
    resetMenuDraft()
  }
})

function scrollToOrder() {
  nextTick(() => document.getElementById('pedido')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const productRequestDone = ref(false)

function takeRequestedProduct() {
  if (productRequestDone.value) return
  const raw = route.query.agregar
  const descriptionId = typeof raw === 'string' ? Number(raw) : 0
  if (!descriptionId || !orderable.value) return
  for (const item of items.value) {
    const line = item.descriptions.find((entry) => entry.id === descriptionId && entry.price != null)
    if (!line?.id) continue
    productRequestDone.value = true
    if (canBuy.value) addProduct(line.id, `${item.name} · ${line.description}`, Number(line.price))
    else {
      error.value = 'Para agregar al pedido necesitas una cuenta de cliente.'
      scrollToOrder()
    }
    return
  }
}

function focusRequestedOffer() {
  const raw = route.query.oferta
  const itemId = typeof raw === 'string' ? Number(raw) : 0
  if (!itemId) return
  nextTick(() => {
    const el = document.getElementById(`oferta-item-${itemId}`) || document.getElementById('oferta-dia')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function keepShopping() {
  checkoutStep.value = 'cart'
  nextTick(() => document.getElementById('oferta')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function goToPreorder() {
  error.value = ''
  if (openMenuNeedsConfirm.value || cart.value.some((line) => line.kind === 'MENU' && line.draft)) {
    error.value = 'Confirma si ya no agregarás más ítems del menú antes de continuar.'
    scrollToOrder()
    return
  }
  const invalid = cart.value.find((line) => line.kind !== 'MENU' && quantityError(line.unitName, Number(line.quantity)))
  if (invalid) {
    error.value = quantityError(invalid.unitName, Number(invalid.quantity))
    return
  }
  if (!isOperatorOrder.value && selectedPoint.value?.isOpen !== true) {
    error.value = 'El pedido no se puede continuar porque el negocio no está abierto.'
    return
  }
  if (fulfillment.value === 'DELIVERY' && !selectedPoint.value?.chargesDelivery) {
    error.value = 'Este punto de venta no ofrece delivery.'
    return
  }
  if (fulfillment.value === 'DELIVERY' && !clientAddress.value.trim()) {
    error.value = 'El delivery exige una dirección de entrega.'
    return
  }
  if (!cart.value.length) {
    error.value = 'Agrega al menos un ítem para continuar.'
    return
  }
  checkoutStep.value = 'preorder'
  scrollToOrder()
}

function backToCart() {
  checkoutStep.value = 'cart'
  scrollToOrder()
}

const editingMenu = ref(false)
const changingPart = ref<'' | 'ENTRADA' | 'SEGUNDO' | 'REFRESCO'>('')

function openMenuEditor() {
  if (!draftMenu.value) return
  editingMenu.value = true
  changingPart.value = ''
  menuPickError.value = ''
}

function closeMenuEditor() {
  editingMenu.value = false
  changingPart.value = ''
}

function scrollToMenuPart(part: string) {
  const offerId = pickedOfferId.value || draftMenu.value?.menuOfferId || 0
  nextTick(() => {
    const target =
      document.getElementById(`menu-part-${offerId}-${part}`) ||
      document.getElementById('menu-dia')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function completeMenuItems() {
  closeMenuEditor()
  scrollToMenuPart(
    availablePartsForOffer(pickedOfferId.value || draftMenu.value?.menuOfferId || 0).find(
      (part) => !picked.value[part.key],
    )?.key || 'ENTRADA',
  )
}

function menuSlots() {
  const offerId = draftMenu.value?.menuOfferId || pickedOfferId.value
  if (!offerId) return [] as { key: string; label: string; itemId: number | null; name: string }[]
  return availablePartsForOffer(offerId).map((part) => {
    const itemId = picked.value[part.key]
    const item = itemId ? items.value.find((entry) => entry.id === itemId) : null
    return {
      key: part.key,
      label: part.label,
      itemId,
      name: item?.name || 'Sin elegir',
    }
  })
}

function removeMenuPart(part: string) {
  picked.value = { ...picked.value, [part]: null }
  changingPart.value = ''
  menuPickError.value = ''
  if (!Object.values(picked.value).some(Boolean)) {
    cart.value = cart.value.filter((line) => !line.draft)
    resetMenuDraft()
    closeMenuEditor()
    return
  }
  syncMenuOrder()
}

function changeMenuPart(part: 'ENTRADA' | 'SEGUNDO' | 'REFRESCO') {
  changingPart.value = part
  editingMenu.value = false
  menuPickError.value = `Elige el nuevo ${partLabel[part]}.`
  scrollToMenuPart(part)
}

function bumpQty(index: number, delta: number) {
  const line = cart.value[index]
  if (!line || line.kind === 'MENU') return
  const kg = isKgUnit(line.unitName)
  const step = kg ? 0.25 : 1
  const min = kg ? 0.01 : 1
  const next = Number((Number(line.quantity || min) + delta * step).toFixed(kg ? 2 : 0))
  line.quantity = next < min ? min : next
}

function lineTitle(line: { kind: string; label: string; draft?: boolean }) {
  if (line.kind === 'MENU') return 'Menú'
  return line.label.split(' · ')[0] || line.label
}

function lineDetail(line: { kind: string; label: string; draft?: boolean; dishes?: { itemId: number; menuPart: string }[] }) {
  if (line.kind === 'MENU') {
    if (line.draft) {
      const live = items.value
        .filter((item) => Object.values(picked.value).includes(item.id))
        .map((item) => item.name)
      if (live.length) return live.join(' + ')
    }
    if (line.dishes?.length) {
      return line.dishes
        .map((dish) => items.value.find((item) => item.id === dish.itemId)?.name || '')
        .filter(Boolean)
        .join(' + ')
    }
    return line.label.split(' · ').slice(1).join(' · ')
  }
  return line.label.split(' · ').slice(1).join(' · ')
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

watch([items, orderable, () => auth.isAuthenticated], () => {
  takeRequestedProduct()
  takeRequestedMenu()
  focusRequestedOffer()
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

const draftMenu = computed(() => cart.value.find((line) => line.kind === 'MENU' && line.draft) || null)

function menuItemsForOffer(offerId: number) {
  return items.value.filter((item) => item.kind === 'MENU' && menuOfferIdsOf(item).includes(offerId))
}

function menuChoiceCount(offerId: number) {
  return menuItemsForOffer(offerId).length
}

function menuPartCount(offerId: number) {
  return new Set(menuItemsForOffer(offerId).map((item) => item.menuPart).filter(Boolean)).size
}

/** Menús con más de un plato u más de un tipo (entrada/segundo/refresco) exigen confirmación explícita. */
function menuRequiresConfirm(offerId: number) {
  return menuChoiceCount(offerId) > 1 || menuPartCount(offerId) > 1
}

function availablePartsForOffer(offerId: number) {
  return menuGroups.filter((group) =>
    items.value.some(
      (item) => item.kind === 'MENU' && item.menuPart === group.key && menuOfferIdsOf(item).includes(offerId),
    ),
  )
}

const openMenuNeedsConfirm = computed(() => Boolean(draftMenu.value))

const menuIncomplete = computed(() => {
  const draft = draftMenu.value
  if (!draft?.menuOfferId) return false
  return availablePartsForOffer(draft.menuOfferId).some((part) => !picked.value[part.key])
})

const menuComplete = computed(() => Boolean(draftMenu.value?.menuOfferId) && !menuIncomplete.value)

function resetMenuDraft() {
  picked.value = { ENTRADA: null, SEGUNDO: null, REFRESCO: null }
  pickedOfferId.value = 0
  changingPart.value = ''
  editingMenu.value = false
}

function syncMenuOrder() {
  cart.value = cart.value.filter((line) => !line.draft)
  const dishes = menuGroups
    .filter((group) => picked.value[group.key])
    .map((group) => ({ itemId: picked.value[group.key] as number, menuPart: group.key }))
  const offer = (business.value?.menuOffers || []).find((item) => item.id === pickedOfferId.value)
  if (!dishes.length || !offer) return
  const needsConfirm = menuRequiresConfirm(offer.id)
  cart.value.push({
    kind: 'MENU',
    draft: needsConfirm,
    menuOfferId: offer.id,
    dishes,
    unitPrice: Number(offer.price),
    label: `${offer.name} · ${pickedItems.value.map((item) => item.name).join(' + ')}`,
  })
  if (!needsConfirm) resetMenuDraft()
}

function confirmMenu() {
  const draft = draftMenu.value
  if (!draft) return
  draft.draft = false
  error.value = ''
  menuPickError.value = ''
  resetMenuDraft()
  scrollToOrder()
}

function remainingPartLabels(offerId: number) {
  return availablePartsForOffer(offerId)
    .filter((part) => !picked.value[part.key])
    .map((part) => part.label.toLowerCase())
}

function chooseOption(offerId: number, part: string, id: number) {
  if (!orderable.value) return
  if (!canBuy.value) {
    error.value = 'Para armar un menú necesitas una cuenta de cliente.'
    menuPickError.value = ''
    scrollToOrder()
    return
  }
  if (draftMenu.value && pickedOfferId.value && pickedOfferId.value !== offerId) {
    menuPickError.value = 'Cierra el menú actual antes de iniciar otro.'
    error.value = menuPickError.value
    return
  }
  const chosen = Object.values(picked.value).some((value) => value)
  if (chosen && pickedOfferId.value && pickedOfferId.value !== offerId) {
    menuPickError.value = 'No se pueden elegir platos de tipos de menú distintos.'
    error.value = menuPickError.value
    return
  }
  const current = picked.value[part]
  const replacing = changingPart.value === part
  if (current && !replacing) {
    const tipo = partLabel[part] || 'opción'
    const remaining = remainingPartLabels(offerId || pickedOfferId.value)
    menuPickError.value = remaining.length
      ? `Ya elegiste una ${tipo}. Elige otro tipo: ${remaining.join(', ')}.`
      : `Ya elegiste una ${tipo}. Si no agregarás más ítems, cierra el menú en tu pedido.`
    error.value = menuPickError.value
    nextTick(() => document.getElementById('menu-dia')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    return
  }
  pickedOfferId.value = offerId
  picked.value = { ...picked.value, [part]: id }
  changingPart.value = ''
  menuPickError.value = ''
  error.value = ''
  syncMenuOrder()
  scrollToOrder()
}

function removeLine(index: number) {
  const line = cart.value[index]
  cart.value.splice(index, 1)
  if (line?.draft) resetMenuDraft()
  if (!cart.value.length) checkoutStep.value = 'cart'
}

async function placeOrder() {
  error.value = ''
  if (checkoutStep.value !== 'preorder') {
    goToPreorder()
    return
  }
  if (openMenuNeedsConfirm.value || cart.value.some((line) => line.kind === 'MENU' && line.draft)) {
    error.value = 'Confirma si ya no agregarás más ítems del menú antes de finalizar el pedido.'
    checkoutStep.value = 'cart'
    scrollToOrder()
    return
  }
  const invalid = cart.value.find((line) => line.kind !== 'MENU' && quantityError(line.unitName, Number(line.quantity)))
  if (invalid) {
    error.value = quantityError(invalid.unitName, Number(invalid.quantity))
    return
  }
  if (!isOperatorOrder.value && selectedPoint.value?.isOpen !== true) {
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
  const lines = cart.value.filter((line) => !(line.kind === 'MENU' && line.draft))
  if (!lines.length) {
    error.value = 'Agrega al menos un ítem para finalizar el pedido.'
    return
  }
  if (
    isOperatorOrder.value
    && requiresOperatorPayment.value
    && Math.round(Number(orderPayment.value) * 100) < Math.round(orderTotal.value * 100)
  ) {
    error.value = `El pedido no se registró porque no se cumplió la condición de pago. El total es S/ ${orderTotal.value.toFixed(2)}.`
    return
  }
  placing.value = true
  try {
    const notes = orderNotes.value.trim()
    const address = fulfillment.value === 'DELIVERY'
      ? [clientAddress.value.trim(), notes ? `Indicaciones: ${notes}` : ''].filter(Boolean).join('\n')
      : notes
        ? `Indicaciones: ${notes}`
        : clientAddress.value
    const payloadLines = lines.map((line) => ({
      kind: line.kind,
      descriptionId: line.descriptionId,
      quantity: line.quantity,
      menuOfferId: line.menuOfferId,
      dishes: line.dishes,
    }))
    if (isOperatorOrder.value && operatorDraft.value) {
      await http.post('/pedidos', {
        businessId: business.value?.id,
        pointSaleId: selectedPoint.value?.id,
        clientName: operatorDraft.value.clientName,
        clientPhone: operatorDraft.value.clientPhone,
        clientAddress: address,
        fulfillment: fulfillment.value,
        lines: payloadLines,
        payment: orderPayment.value,
        waivePayment: false,
      })
      sessionStorage.removeItem(OPERATOR_ORDER_KEY)
      cart.value = []
      orderNotes.value = ''
      clientAddress.value = ''
      orderPayment.value = 0
      checkoutStep.value = 'cart'
      resetMenuDraft()
      await router.push({ name: 'orders' })
      return
    }
    const { data } = await http.post<{ id: number }>('/pedidos/cliente', {
      businessId: business.value?.id,
      pointSaleId: selectedPoint.value?.id,
      fulfillment: fulfillment.value,
      clientAddress: address,
      lines: payloadLines,
    })
    cart.value = []
    orderNotes.value = ''
    clientAddress.value = ''
    checkoutStep.value = 'cart'
    resetMenuDraft()
    await router.push({ name: 'client-order', params: { id: data.id } })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    placing.value = false
  }
}

async function placeOperatorOrderWithoutPayment() {
  if (!isOperatorOrder.value) return
  error.value = ''
  if (openMenuNeedsConfirm.value || cart.value.some((line) => line.kind === 'MENU' && line.draft)) {
    error.value = 'Confirma si ya no agregarás más ítems del menú antes de finalizar el pedido.'
    checkoutStep.value = 'cart'
    scrollToOrder()
    return
  }
  const lines = cart.value.filter((line) => !(line.kind === 'MENU' && line.draft))
  if (!lines.length) {
    error.value = 'Agrega al menos un ítem para finalizar el pedido.'
    return
  }
  placing.value = true
  try {
    const notes = orderNotes.value.trim()
    const address = fulfillment.value === 'DELIVERY'
      ? [clientAddress.value.trim(), notes ? `Indicaciones: ${notes}` : ''].filter(Boolean).join('\n')
      : notes
        ? `Indicaciones: ${notes}`
        : clientAddress.value
    await http.post('/pedidos', {
      businessId: business.value?.id,
      pointSaleId: selectedPoint.value?.id,
      clientName: operatorDraft.value?.clientName,
      clientPhone: operatorDraft.value?.clientPhone,
      clientAddress: address,
      fulfillment: fulfillment.value,
      lines: lines.map((line) => ({
        kind: line.kind,
        descriptionId: line.descriptionId,
        quantity: line.quantity,
        menuOfferId: line.menuOfferId,
        dishes: line.dishes,
      })),
      payment: 0,
      waivePayment: true,
    })
    sessionStorage.removeItem(OPERATOR_ORDER_KEY)
    cart.value = []
    orderNotes.value = ''
    clientAddress.value = ''
    orderPayment.value = 0
    checkoutStep.value = 'cart'
    resetMenuDraft()
    await router.push({ name: 'orders' })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    placing.value = false
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
const deliveryLabel = computed(() => {
  if (fulfillment.value !== 'DELIVERY') return 'Entrega en local'
  const fee = deliveryAmount.value
  if (!fee) return 'Gratis (S/ 0.00)'
  return `S/ ${fee.toFixed(2)}`
})

const pickedItems = computed(() =>
  items.value.filter((item) => Object.values(picked.value).includes(item.id)),
)
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <p v-if="error && !business" class="error">{{ error }}</p>
    <template v-if="business">
      <header class="shop-head">
        <h2>{{ business.commercialName }}{{ business.commercialDescription ? ` ${business.commercialDescription}` : '' }}</h2>
        <AffiliationBadge class="affil" :label="business.affiliationLabel" :tone="business.affiliationTone" />
        <p>{{ business.rubro?.name }}</p>
        <p v-if="isOperatorOrder && operatorDraft" class="operator-banner">
          Pedido operador · {{ operatorDraft.clientName }} · {{ operatorDraft.clientPhone }}
        </p>
      </header>
      <div v-if="points.length" id="oferta" class="offer-block">
        <div class="address-row">
          <article v-for="point in points" :key="point.id" class="address-card">
            <p>{{ addressLine(point) }}</p>
            <p class="muted">{{ point.scheduleLabel || 'Horario no registrado' }}</p>
            <span v-if="point.isOpen === true" class="badge open">Abierto</span>
            <span v-else-if="point.isOpen === false" class="badge off">Cerrado</span>
            <WhatsAppAccess
              v-if="point.whatsappUrl"
              variant="wa-btn"
              :business-id="business.id"
              :href="whatsappHref(point)"
              :label="whatsappLabel"
            />
            <p v-else-if="business.showPhone && point.phone">{{ point.phone }}</p>
          </article>
        </div>
        <template v-if="business.publicOffer !== false">
          <section v-if="dailyOffers.length" id="oferta-dia" class="daily-block">
            <h3 class="rubro-title">Oferta del día</h3>
            <div class="daily-grid">
              <article
                v-for="item in dailyOffers"
                :id="`oferta-item-${item.id}`"
                :key="item.id"
                class="product-card daily"
              >
                <span class="deal-pill">Oferta del día</span>
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                <div v-else class="thumb" style="height: 120px; border-radius: 6px" />
                <strong>{{ item.name }}</strong>
                <p v-if="item.compareAtPrice != null" class="compare">Antes {{ money(item.compareAtPrice) }}</p>
                <div v-for="line in item.descriptions" :key="line.id || line.description" class="offer-line">
                  <span class="offer-desc">{{ line.description }}</span>
                  <div class="offer-actions">
                    <span v-if="line.price != null && !isProfessional" class="price">{{ money(line.price) }}</span>
                    <button
                      v-if="orderable && line.id && line.price != null"
                      class="btn small add-btn"
                      type="button"
                      @click="addProduct(line.id, `${item.name} · ${line.description}`, Number(line.price))"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
          <h3 v-if="showsMenuLabels && carta.length" class="rubro-title">Platos a la carta</h3>
          <h3 v-else-if="carta.length && !showsMenuLabels" class="rubro-title">Productos y servicios</h3>
          <div v-if="carta.length" class="product-grid">
            <article v-for="item in carta" :key="item.id" class="product-card">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
              <div v-else class="thumb" style="height: 120px; border-radius: 6px" />
              <strong>{{ item.name }}</strong>
              <div v-for="line in item.descriptions" :key="line.id || line.description" class="offer-line">
                <span class="offer-desc">{{ line.description }}</span>
                <div class="offer-actions">
                  <span v-if="line.price != null && !isProfessional" class="price">{{ money(line.price) }}</span>
                  <button
                    v-if="orderable && line.id && line.price != null"
                    class="btn small add-btn"
                    type="button"
                    @click="addProduct(line.id, `${item.name} · ${line.description}`, Number(line.price))"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </article>
          </div>
          <template v-if="menuTypes.length">
            <h3 id="menu-dia" v-if="showsMenuLabels" class="rubro-title">Menú del día</h3>
            <p v-if="orderable" class="muted">Elige una opción por tipo (entrada, segundo o refresco). Si un tipo ya está elegido, completa otro tipo o cierra el menú.</p>
            <p v-if="menuPickError" class="error menu-pick-error">{{ menuPickError }}</p>
            <section v-for="offer in menuTypes" :key="offer.id">
              <h3>{{ offer.name }} · S/ {{ Number(offer.price).toFixed(2) }}</h3>
              <section
                v-for="group in offer.parts.filter((group) => group.items.length)"
                :id="`menu-part-${offer.id}-${group.key}`"
                :key="`${offer.id}-${group.key}`"
              >
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

        <section v-if="orderable" id="pedido" class="order-sheet">
          <header class="order-head">
            <div>
              <span class="eyebrow">Resumen</span>
              <h3>Tu pedido</h3>
            </div>
            <div v-if="canBuy" class="client-chip">
              <template v-if="isOperatorOrder && operatorDraft">
                <strong>{{ operatorDraft.clientName }}</strong>
                <span>{{ operatorDraft.clientPhone }}</span>
              </template>
              <template v-else>
                <strong>{{ auth.user?.firstName }} {{ auth.user?.lastName }}</strong>
                <span>{{ auth.user?.phone }}</span>
              </template>
            </div>
          </header>

          <p v-if="!isOperatorOrder && selectedPoint?.isOpen !== true" class="error">Este punto de venta está cerrado. Solo se puede pedir cuando está abierto.</p>
          <p v-if="error && !canBuy" class="error">{{ error }}</p>

          <template v-if="!auth.isAuthenticated">
            <p class="hint">Para agregar productos y registrar un pedido necesitas una cuenta de cliente.</p>
            <router-link class="btn go" :to="registerRedirect">Registrarme</router-link>
            <router-link class="btn ghost" :to="authRedirect">Iniciar sesión</router-link>
          </template>

          <template v-else-if="canBuy">
            <template v-if="checkoutStep === 'preorder'">
              <div class="point-box">
                <label for="point-address">
                  <span class="pin" aria-hidden="true" />
                  Dirección de punto de atención
                </label>
                <input
                  id="point-address"
                  type="text"
                  readonly
                  :value="selectedPoint ? addressLine(selectedPoint) : ''"
                />
              </div>

              <article v-for="(line, index) in cart" :key="`pre-${index}`" class="cart-line">
                <div class="cart-top">
                  <div>
                    <h4>{{ lineTitle(line) }}</h4>
                    <p v-if="lineDetail(line)" class="detail">{{ lineDetail(line) }}</p>
                  </div>
                  <button class="chip drop" type="button" @click="removeLine(index)">Quitar</button>
                </div>
                <div v-if="line.kind !== 'MENU'" class="qty-row">
                  <div>
                    <span class="qty-label">Cantidad{{ line.unitName ? ` · ${line.unitName}` : '' }}</span>
                    <div class="stepper">
                      <button type="button" @click="bumpQty(index, -1)">−</button>
                      <input
                        v-model.number="line.quantity"
                        type="number"
                        :min="isKgUnit(line.unitName) ? 0.01 : 1"
                        :step="isKgUnit(line.unitName) ? 0.01 : 1"
                      />
                      <button type="button" @click="bumpQty(index, 1)">+</button>
                    </div>
                  </div>
                  <div class="price-box">
                    <span>Precio</span>
                    <strong>{{ money(lineAmount(line)) }}</strong>
                  </div>
                </div>
                <div v-else class="menu-sub">
                  <span>Subtotal del menú</span>
                  <strong>{{ money(lineAmount(line)) }}</strong>
                </div>
              </article>

              <label class="notes">
                <span class="notes-head">
                  <em>Indicaciones generales</em>
                  <small>Opcional</small>
                </span>
                <textarea v-model="orderNotes" rows="2" placeholder="Ej. sin cebolla en el lomo, cubiertos descartables, ají extra..." />
              </label>

              <div v-if="fulfillment === 'DELIVERY'" class="delivery-chip">
                <span>Dirección de entrega</span>
                <strong>{{ clientAddress }}</strong>
              </div>

              <div class="totals">
                <p><span>Subtotal</span><strong>{{ money(subtotal) }}</strong></p>
                <p>
                  <span>Entrega / Delivery</span>
                  <em :class="{ free: fulfillment === 'DELIVERY' && !deliveryAmount }">{{ deliveryLabel }}</em>
                </p>
                <p class="total"><span>Total a pagar</span><b>{{ money(orderTotal) }}</b></p>
              </div>

              <p v-if="isOperatorOrder && requiresOperatorPayment" class="hint">Este negocio exige el pago para registrar el pedido.</p>
              <label v-if="isOperatorOrder && requiresOperatorPayment" class="notes">
                <span class="notes-head"><em>Pago recibido</em></span>
                <input v-model.number="orderPayment" type="number" min="0.01" step="0.01" />
              </label>

              <p v-if="error" class="error">{{ error }}</p>
              <button class="btn ghost" type="button" @click="backToCart">Volver al pedido</button>
              <button class="btn go continue" type="button" :disabled="placing || !cart.length" @click="placeOrder">
                {{ placing ? 'Confirmando…' : (isOperatorOrder ? 'Registrar pedido' : 'Confirmar pedido') }}
                <span aria-hidden="true">›</span>
              </button>
              <button
                v-if="isOperatorOrder && requiresOperatorPayment"
                class="btn ghost"
                type="button"
                :disabled="placing || !cart.length"
                @click="placeOperatorOrderWithoutPayment"
              >
                Registrar este pedido sin pago
              </button>
            </template>

            <template v-else>
              <div class="pickup">
                <label for="pickup-point">
                  <span class="pin" aria-hidden="true" />
                  Punto donde se Atiende el Pedido
                </label>
                <select id="pickup-point" v-model.number="pointId">
                  <option v-for="point in points" :key="point.id" :value="point.id">{{ addressLine(point) }}</option>
                </select>
              </div>

              <p v-if="!cart.length" class="hint">Aún no hay ítems en tu pedido. Usa Agregar en un plato.</p>

              <article v-for="(line, index) in cart" :key="index" class="cart-line" :class="{ draft: line.draft }">
                <div class="cart-top">
                  <div>
                    <div class="title-row">
                      <h4>{{ lineTitle(line) }}</h4>
                      <span
                        v-if="line.draft"
                        :class="menuComplete ? 'badge-complete' : 'badge-armado'"
                      >
                        {{ menuComplete ? 'items completos' : 'En armado' }}
                      </span>
                    </div>
                    <p v-if="lineDetail(line)" class="detail">{{ lineDetail(line) }}</p>
                  </div>
                  <div class="line-actions">
                    <button v-if="line.draft" class="chip edit" type="button" @click="openMenuEditor">Editar</button>
                    <button class="chip drop" type="button" @click="removeLine(index)">Quitar</button>
                  </div>
                </div>

                <div v-if="line.kind !== 'MENU'" class="qty-row">
                  <div>
                    <span class="qty-label">Cantidad{{ line.unitName ? ` · ${line.unitName}` : '' }}</span>
                    <div class="stepper">
                      <button type="button" @click="bumpQty(index, -1)">−</button>
                      <input
                        v-model.number="line.quantity"
                        type="number"
                        :min="isKgUnit(line.unitName) ? 0.01 : 1"
                        :step="isKgUnit(line.unitName) ? 0.01 : 1"
                        required
                      />
                      <button type="button" @click="bumpQty(index, 1)">+</button>
                    </div>
                  </div>
                  <div class="price-box">
                    <span>Precio</span>
                    <strong>{{ money(lineAmount(line)) }}</strong>
                  </div>
                </div>
                <div v-else class="menu-sub">
                  <span>Subtotal del menú</span>
                  <strong>{{ money(lineAmount(line)) }}</strong>
                </div>

                <div v-if="line.draft" class="menu-confirm">
                  <p>Tienes un menú en armado. ¿Ya no agregarás más ítems a este menú?</p>
                  <button v-if="menuIncomplete" class="btn ghost" type="button" @click="completeMenuItems">
                    Completar items del menú
                  </button>
                  <button class="btn go" type="button" @click="confirmMenu">Cerrar menú</button>
                </div>
              </article>

              <div v-if="editingMenu && draftMenu" class="menu-editor">
                <header class="menu-editor-head">
                  <div>
                    <span class="eyebrow">Menú</span>
                    <h4>Editar ítems</h4>
                  </div>
                  <button class="chip drop" type="button" @click="closeMenuEditor">Cerrar</button>
                </header>
                <article v-for="slot in menuSlots()" :key="slot.key" class="menu-slot">
                  <div>
                    <strong>{{ slot.label }}</strong>
                    <p>{{ slot.name }}</p>
                  </div>
                  <div class="line-actions">
                    <button
                      class="chip edit"
                      type="button"
                      :disabled="!slot.itemId"
                      @click="changeMenuPart(slot.key as 'ENTRADA' | 'SEGUNDO' | 'REFRESCO')"
                    >
                      Cambiar
                    </button>
                    <button
                      class="chip drop"
                      type="button"
                      :disabled="!slot.itemId"
                      @click="removeMenuPart(slot.key)"
                    >
                      Quitar
                    </button>
                  </div>
                </article>
              </div>

              <template v-if="cart.length">
                <label class="notes">
                  <span class="notes-head">
                    <em>Indicaciones para el pedido</em>
                    <small>Opcional</small>
                  </span>
                  <textarea v-model="orderNotes" rows="2" placeholder="Ej. sin cebolla en el lomo, cubiertos descartables, ají extra..." />
                </label>

                <div class="service">
                  <p class="service-title">Servicio de entrega</p>
                  <div class="service-grid">
                    <button type="button" class="service-card" :class="{ on: fulfillment === 'RECOJO' }" @click="fulfillment = 'RECOJO'">
                      <strong>Entrega en local</strong>
                      <span>Recojo en el punto elegido</span>
                    </button>
                    <button
                      v-if="selectedPoint?.chargesDelivery"
                      type="button"
                      class="service-card"
                      :class="{ on: fulfillment === 'DELIVERY' }"
                      @click="fulfillment = 'DELIVERY'"
                    >
                      <strong>Delivery</strong>
                      <span>{{ Number(selectedPoint.deliveryFee || 0) ? money(Number(selectedPoint.deliveryFee)) : 'Gratis' }}</span>
                    </button>
                  </div>
                  <label v-if="fulfillment === 'DELIVERY'" class="address-field">
                    <span>Dirección de entrega</span>
                    <input v-model="clientAddress" required placeholder="Calle, urbanización, referencia" />
                  </label>
                </div>

                <div class="totals">
                  <p><span>Subtotal</span><strong>{{ money(subtotal) }}</strong></p>
                  <p>
                    <span>Entrega / Delivery</span>
                    <em :class="{ free: fulfillment === 'DELIVERY' && !deliveryAmount }">{{ deliveryLabel }}</em>
                  </p>
                  <p class="total"><span>Total a pagar</span><b>{{ money(orderTotal) }}</b></p>
                </div>

                <p v-if="error" class="error">{{ error }}</p>
                <button class="btn ghost" type="button" @click="keepShopping">Seguir agregando</button>
                <button
                  class="btn go continue"
                  type="button"
                  :disabled="selectedPoint?.isOpen !== true || openMenuNeedsConfirm"
                  @click="goToPreorder"
                >
                  Cerrar pedido
                  <span aria-hidden="true">›</span>
                </button>
              </template>
            </template>
          </template>
        </section>
      </div>
      <p v-else class="muted">Este negocio no tiene oferta publicada.</p>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.menu-pick-error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  font-size: 13px;
}

.shop-head {
  margin-bottom: 12px;
}

.shop-head h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
  font-weight: 800;
}

.shop-head .affil {
  margin-top: 8px;
}

.shop-head p {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 13px;
}

.operator-banner {
  margin-top: 10px !important;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff5f5;
  color: var(--color-brand) !important;
  font-size: 13px !important;
  font-weight: 700;
}

.offer-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.daily-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.daily-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.product-card.daily {
  outline: 2px solid rgba(226, 18, 33, 0.28);
  background: #fff7f7;
}

.deal-pill {
  display: inline-flex;
  align-self: flex-start;
  margin-bottom: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-brand);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.compare {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 12px;
  text-decoration: line-through;
}

.offer-line {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  min-width: 0;
}

.offer-desc {
  font-size: 12px;
  line-height: 1.35;
  color: #475569;
  overflow-wrap: anywhere;
}

.offer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.offer-actions .price {
  font-weight: 800;
  color: var(--color-brand);
  white-space: nowrap;
}

.add-btn {
  flex: 0 0 auto;
  width: auto !important;
  white-space: nowrap;
  min-height: 36px;
  margin-top: 0 !important;
  padding: 6px 12px !important;
}

.order-sheet {
  margin-top: 8px;
  padding: 18px 16px 16px;
  border-radius: var(--radius-card);
  background: #fff;
  border: 1px solid #f1f5f9;
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.order-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.eyebrow {
  display: block;
  color: var(--color-brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.order-head h3 {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

.client-chip {
  text-align: right;
}

.client-chip strong {
  display: block;
  font-size: 12px;
}

.client-chip span {
  color: var(--color-muted);
  font-size: 11px;
}

.pickup {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.pickup label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
}

.pin {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-brand);
}

.pickup select,
.address-field input,
.notes textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  padding: 10px 12px;
  font-size: 12px;
}

.hint {
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
}

.cart-line {
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cart-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.cart-line h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.detail {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 12px;
}

.badge-armado,
.badge-complete {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.badge-armado {
  background: #fef3c7;
  color: #92400e;
}

.badge-complete {
  background: #dcfce7;
  color: #166534;
}

.menu-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: var(--shadow-soft);
}

.menu-editor-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.menu-editor-head h4 {
  margin: 2px 0 0;
  font-size: 16px;
  font-weight: 800;
}

.menu-slot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.menu-slot strong {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.menu-slot p {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 600;
}

.chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.line-actions {
  display: flex;
  gap: 6px;
}

.chip {
  border: 0;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.chip.drop {
  background: #fff1f2;
  color: #e11d48;
}

.chip.edit {
  background: #fff1f2;
  color: var(--color-brand);
}

.qty-row,
.menu-sub {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
}

.qty-label {
  display: block;
  margin-bottom: 4px;
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 600;
}

.stepper {
  display: flex;
  align-items: center;
  width: 112px;
  padding: 2px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.stepper button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.stepper input {
  width: 40px;
  border: 0;
  background: transparent;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}

.price-box,
.menu-sub {
  text-align: right;
}

.price-box span,
.menu-sub span {
  display: block;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.price-box strong,
.menu-sub strong {
  font-size: 16px;
  font-weight: 800;
}

.menu-confirm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  text-align: center;
}

.menu-confirm p {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 500;
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notes-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notes-head em {
  font-style: normal;
  font-size: 12px;
  font-weight: 700;
}

.notes-head small {
  color: #94a3b8;
  font-size: 11px;
}

.notes textarea {
  resize: none;
  background: #f8fafc;
}

.service-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
}

.service-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.service-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.service-card.on {
  border-color: var(--color-brand);
  background: #fff1f2;
  box-shadow: 0 0 0 1px var(--color-brand);
}

.service-card strong {
  font-size: 13px;
}

.service-card span {
  color: var(--color-muted);
  font-size: 11px;
}

.service-grid:has(> :only-child) {
  grid-template-columns: 1fr;
}

.address-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  font-size: 12px;
  font-weight: 700;
}

.totals {
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}

.totals p {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 8px;
  font-size: 12px;
  color: #475569;
}

.totals em {
  font-style: normal;
  font-weight: 700;
  color: #0f172a;
}

.totals em.free {
  color: #059669;
  background: #ecfdf5;
  padding: 2px 8px;
  border-radius: 6px;
}

.totals .total {
  margin: 0;
  padding-top: 10px;
  border-top: 1px dashed #cbd5e1;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.totals .total b {
  color: var(--color-brand);
  font-size: 20px;
  font-weight: 900;
}

.btn.go,
.btn.ghost,
.btn.continue {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.btn.go {
  background: var(--color-brand);
  color: #fff;
  box-shadow: 0 10px 20px -10px rgba(226, 18, 33, 0.55);
}

.btn.go:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.ghost {
  background: #f1f5f9;
  color: #334155;
  text-transform: none;
  letter-spacing: 0;
}

.btn.continue span {
  font-size: 18px;
  line-height: 1;
}

.point-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.point-box label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f172a;
}

.point-box input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #1e293b;
}

.delivery-chip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.delivery-chip span {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.delivery-chip strong {
  font-size: 13px;
  font-weight: 600;
}

@media (min-width: 1024px) {
  .shop-head {
    margin-bottom: 20px;
  }

  .shop-head h2 {
    font-size: 32px;
    line-height: 1.2;
    max-width: 900px;
  }

  .shop-head p {
    font-size: 15px;
  }

  .operator-banner {
    max-width: 720px;
    font-size: 14px !important;
  }

  .offer-block {
    gap: 18px;
  }

  .address-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
  }

  .daily-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .product-card.daily {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: 12px 16px;
    align-items: start;
    padding: 16px;
  }

  .product-card.daily .deal-pill {
    grid-column: 1 / -1;
  }

  .product-card.daily img,
  .product-card.daily .thumb {
    width: 100%;
    height: 160px !important;
    object-fit: cover;
    border-radius: 10px;
  }

  .offer-line {
    font-size: 14px;
  }

  .offer-desc {
    font-size: 13px;
  }

  :deep(.product-grid) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .order-sheet {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
    gap: 20px;
    padding: 24px;
    align-items: start;
  }

  .order-head {
    grid-column: 1 / -1;
  }
}
</style>
