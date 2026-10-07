<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import WhatsAppAccess from '../components/WhatsAppAccess.vue'
import AffiliationBadge from '../components/AffiliationBadge.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import { menuOfferIdsOf, type Business, type PointSale } from '../types'
import { clientDisplayName, professionalAppointmentWhatsApp, whatsappChatUrl } from '../whatsapp'
import { zoneParams } from '../zone'

type MarketDetail = {
  id: number
  name: string
  imageUrl?: string | null
  groupName: string
  rubros: { id: number; name: string; categories: { id: number | null; name: string; businesses: Business[] }[] }[]
}

const route = useRoute()
const router = useRouter()
const auth = usePortalAuth()
const market = ref<MarketDetail | null>(null)
const error = ref('')
const search = ref('')

function isProfessional(business: Business) {
  return /profesional/i.test(business.rubro?.name || '')
}

function canAsk(business: Business) {
  if (business.publicOffer === false) return false
  if (isProfessional(business)) return false
  return business.clientOrders !== false
}

function planLevel(business: Business) {
  if (business.publicOffer === false) return 'free'
  if (canAsk(business)) return 'order'
  return 'catalog'
}

function whatsappLabel(business: Business) {
  if (isProfessional(business)) return 'Consulta y agenda tu cita aqui'
  return planLevel(business) === 'order'
    ? 'Crea tu pedido directamente o por WhatsApp'
    : 'Pedir directamente por WhatsApp'
}

function whatsappHref(business: Business, point: PointSale) {
  if (!point.whatsappUrl) return ''
  if (isProfessional(business)) {
    return professionalAppointmentWhatsApp(point.whatsappUrl, clientDisplayName(auth.user))
  }
  return whatsappChatUrl(point.whatsappUrl)
}

function availability(business: Business) {
  if (planLevel(business) === 'free') return 'listed'
  const points = business.pointSales || []
  if (points.some((point) => point.isOpen === true)) return 'open'
  if (points.some((point) => point.isOpen === false)) return 'closed'
  return ''
}

function phonesOf(business: Business) {
  return [...new Set((business.pointSales || []).map((point) => point.phone).filter(Boolean))]
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function shown(list: Business[]) {
  const query = normalize(search.value.trim())
  if (!query) return list
  return list
    .map((business) => ({
      ...business,
      pointSales: (business.pointSales || [])
        .map((point) => ({
          ...point,
          items: (point.items || []).filter((item) => {
            const text = [item.name, ...(item.descriptions || []).map((line) => line.description)].join(' ')
            return normalize(text).includes(query)
          }),
        }))
        .filter((point) => (business.publicOffer === false ? false : point.items.length > 0)),
    }))
    .filter((business) => (business.pointSales || []).length > 0)
}

async function load() {
  error.value = ''
  market.value = null
  try {
    const { data } = await http.get<MarketDetail>(`/public/markets/${route.params.id}`, { params: zoneParams() })
    market.value = data
  } catch (err) {
    error.value = apiError(err)
  }
}

onMounted(load)
watch(() => route.params.id, () => {
  search.value = ''
  load()
})

function addressLine(point: PointSale) {
  const address = point.address
  if (!address) return point.name || ''
  return [address.street, address.urbanZone, address.district?.name].filter(Boolean).join(', ')
}

function money(price: string | number) {
  return `S/ ${Number(price).toFixed(2)}`
}

function itemsOf(business: Business) {
  return (business.pointSales || []).flatMap((point) => point.items || [])
}

const menuParts = [
  { key: 'ENTRADA', label: 'Entrada' },
  { key: 'SEGUNDO', label: 'Segundo' },
  { key: 'REFRESCO', label: 'Refrescos' },
] as const

function cartaOf(business: Business) {
  return itemsOf(business).filter((item) => item.kind !== 'MENU')
}

function menuTypesOf(business: Business) {
  return (business.menuOffers || [])
    .map((offer) => ({
      ...offer,
      parts: menuParts.map((part) => ({
        ...part,
        items: itemsOf(business).filter((item) => item.kind === 'MENU' && item.menuPart === part.key && menuOfferIdsOf(item).includes(offer.id)),
      })),
    }))
    .filter((offer) => offer.parts.some((part) => part.items.length))
}

function usesMenu(business: Business) {
  return itemsOf(business).some((item) => item.kind === 'MENU')
}

function pedir(business: Business, descriptionId?: number) {
  const target = {
    name: 'business' as const,
    params: { id: business.id },
    query: {
      ...(business.categoryId ? { categoria: business.categoryId } : {}),
      ...(descriptionId ? { agregar: descriptionId } : {}),
    },
  }
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { tipo: 'cliente', redirect: router.resolve(target).fullPath } })
    return
  }
  router.push(target)
}

function pedirMenu(business: Business, itemId: number, offerId: number) {
  const target = {
    name: 'business' as const,
    params: { id: business.id },
    query: {
      ...(business.categoryId ? { categoria: business.categoryId } : {}),
      elige: itemId,
      tipo: offerId,
    },
  }
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { tipo: 'cliente', redirect: router.resolve(target).fullPath } })
    return
  }
  router.push(target)
}

</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="market-head">
      <img v-if="market?.imageUrl" :src="market.imageUrl" :alt="market.name" />
      <p v-if="market" class="group">{{ market.groupName }}</p>
      <h2>{{ market?.name || 'Mercado' }}</h2>
      <label class="seek">
        <span>Buscar producto o servicio</span>
        <input v-model="search" type="search" placeholder="Buscar en este mercado" />
      </label>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="market && !market.rubros.length" class="empty">Este mercado todavía no tiene negocios.</p>
    <section v-for="rubro in market?.rubros || []" :key="rubro.id" class="rubro">
      <h3>{{ rubro.name }}</h3>
      <section v-for="category in rubro.categories" :key="category.id ?? category.name">
        <h4>{{ category.name }}</h4>
        <p v-if="search.trim() && !shown(category.businesses).length" class="empty">No hay productos con ese nombre.</p>
        <div class="stack">
          <article v-for="business in shown(category.businesses)" :key="business.id" class="shop">
            <p v-if="availability(business) === 'open'" class="state open">Abierto</p>
            <p v-else-if="availability(business) === 'closed'" class="state closed">Cerrado</p>
            <p v-else-if="availability(business) === 'listed'" class="state listed">Comercio afiliado</p>
            <router-link class="name" :to="{ name: 'business', params: { id: business.id }, query: business.categoryId ? { categoria: business.categoryId } : {} }">
              <h3>{{ business.commercialName }}</h3>
            </router-link>
            <AffiliationBadge class="affil" :label="business.affiliationLabel" :tone="business.affiliationTone" />
            <p v-if="business.commercialDescription" class="blurb">{{ business.commercialDescription }}</p>
            <div v-if="business.pointSales?.length" class="places">
              <article v-for="point in business.pointSales" :key="point.id">
                <p v-if="addressLine(point)">{{ addressLine(point) }}</p>
                <p>{{ point.scheduleLabel || 'Horario no registrado' }}</p>
              </article>
            </div>
            <p v-else class="empty">Este negocio todavía no tiene punto de venta.</p>
            <div v-if="(business.pointSales || []).some((point) => point.whatsappUrl)" class="contacts">
              <WhatsAppAccess
                v-for="point in (business.pointSales || []).filter((point) => point.whatsappUrl)"
                :key="point.id"
                :business-id="business.id"
                :href="whatsappHref(business, point)"
                :label="whatsappLabel(business)"
              />
            </div>
            <div v-else-if="planLevel(business) === 'free' && phonesOf(business).length" class="contacts">
              <a v-for="phone in phonesOf(business)" :key="phone" class="call" :href="`tel:${phone}`">Llamar: {{ phone }}</a>
            </div>
            <template v-if="business.publicOffer !== false && (business.hasMenu || usesMenu(business))">
              <h4 v-if="category.name === 'Comida Criolla y Menús'">Platos a la carta</h4>
              <div v-if="cartaOf(business).length" class="product-grid">
                <article v-for="item in cartaOf(business)" :key="item.id" class="product-card">
                  <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                  <strong>{{ item.name }}</strong>
                  <div v-for="line in item.descriptions" :key="line.id || line.description" class="line">
                    <span>{{ line.description }}</span>
                    <span v-if="line.price != null && !isProfessional(business)" class="price">{{ money(line.price) }}</span>
                    <button v-if="canAsk(business) && line.id && line.price != null" class="add" type="button" @click="pedir(business, line.id)">Agregar</button>
                  </div>
                </article>
              </div>
              <h4 v-if="category.name === 'Comida Criolla y Menús' && menuTypesOf(business).length">Menú del día</h4>
              <section v-for="offer in menuTypesOf(business)" :key="offer.id">
                <h4>{{ offer.name }} · S/ {{ Number(offer.price).toFixed(2) }}</h4>
                <section v-for="part in offer.parts.filter((part) => part.items.length)" :key="`${offer.id}-${part.key}`">
                  <p class="part">{{ part.label }}</p>
                  <div class="product-grid">
                    <article v-for="item in part.items" :key="item.id" class="product-card">
                      <button v-if="canAsk(business)" class="add" type="button" @click="pedirMenu(business, item.id, offer.id)">Elige opción</button>
                      <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                      <strong>{{ item.name }}</strong>
                      <p v-for="line in item.descriptions" :key="line.id || line.description">{{ line.description }}</p>
                    </article>
                  </div>
                </section>
              </section>
            </template>
            <template v-else-if="business.publicOffer !== false && itemsOf(business).length">
              <h4 v-if="category.name === 'Comida Criolla y Menús'">Platos a la carta</h4>
              <div class="product-grid">
                <article v-for="item in itemsOf(business)" :key="item.id" class="product-card">
                  <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                  <strong>{{ item.name }}</strong>
                  <div v-for="line in item.descriptions" :key="line.id || line.description" class="line">
                    <span>{{ line.description }}</span>
                    <span v-if="line.price != null && !isProfessional(business)" class="price">{{ money(line.price) }}</span>
                    <button v-if="canAsk(business) && line.id && line.price != null" class="add" type="button" @click="pedir(business, line.id)">Agregar</button>
                  </div>
                </article>
              </div>
            </template>
            <p v-if="planLevel(business) === 'catalog' && !isProfessional(business) && (business.pointSales || []).some((point) => point.whatsappUrl)" class="hint">Haz tu pedido o consulta los platos del día por WhatsApp</p>
          </article>
        </div>
      </section>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.market-head h2 {
  margin: 8px 0 12px;
  font-family: var(--font-ui);
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.market-head img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: var(--radius-card);
}

.group {
  margin: 10px 0 0;
  color: #5c5e65;
  font-size: 12px;
}

.seek {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.seek span {
  color: #5c5e65;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.seek input {
  height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  background: #fff;
  box-shadow: var(--shadow-soft);
  padding: 0 14px;
  font: inherit;
}

.rubro > h3 {
  margin: 18px 0 4px;
  font-family: var(--font-ui);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.rubro h4 {
  margin: 8px 0 0;
  font-family: var(--font-ui);
  font-size: 18px;
  line-height: 24px;
}

.empty {
  color: var(--color-muted);
  font-size: 14px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 10px;
}

.shop {
  background: #fff;
  border-radius: var(--radius-card);
  padding: 16px;
  box-shadow: 0 8px 24px -12px rgba(22, 28, 39, 0.35);
}

.state {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
}

.state::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.state.open { color: #006740; }
.state.closed,
.state.listed { color: #5c5e65; }

.name {
  text-decoration: none;
  color: inherit;
}

.affil {
  margin: 8px 0 0;
}

.shop h3,
.shop h4 {
  margin: 0;
  font-family: var(--font-ui);
}

.shop h3 {
  font-size: 20px;
  line-height: 26px;
}

.blurb {
  margin: 2px 0 0;
  color: #5c5e65;
  font-size: 12px;
  line-height: 16px;
}

.places {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f0f3ff;
}

.places p {
  margin: 0;
  color: #5e3f3c;
  font-size: 12px;
  line-height: 16px;
}

.places article + article {
  margin-top: 8px;
}

.contacts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.wa,
.call,
.add {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  text-decoration: none;
  font-weight: 700;
}

.wa,
.call {
  min-height: 44px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 18px;
  text-align: center;
}

.wa {
  background: #008352;
  color: #fff;
}

.call {
  background: #e8eefd;
  color: var(--color-ink);
}

.shop h4 {
  margin-top: 14px;
  font-size: 16px;
  line-height: 22px;
}

.shop .product-grid {
  width: 100%;
  gap: 8px;
}

.shop .product-card {
  min-width: 0;
  background: #f0f3ff;
  border: 0;
  border-radius: 12px;
}

.shop .product-card strong {
  overflow-wrap: anywhere;
}

.shop .product-card img {
  height: 96px;
  border-radius: 8px;
}

.line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
}

.price {
  color: var(--color-brand);
  font-weight: 700;
}

.add {
  height: 28px;
  padding: 0 10px;
  background: var(--color-brand);
  color: #fff;
  font-size: 12px;
}

.part {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 700;
}

.hint {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f0f3ff;
  color: #5c5e65;
  font-size: 12px;
  text-align: center;
}
</style>
