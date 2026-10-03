<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { menuOfferIdsOf, type Business, type Category, type PointSale } from '../types'
import { readZone, zoneParams } from '../zone'

const route = useRoute()
const router = useRouter()
const category = ref<Category | null>(null)
const businesses = ref<Business[]>([])
const error = ref('')
const search = ref('')
const zoneLabel = computed(() => {
  const zone = readZone()
  if (!zone) return ''
  return `${zone.name}, ${zone.districtName}`
})

function canAsk(business: Business) {
  if (business.publicOffer === false) return false
  return business.clientOrders !== false
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const visibleBusinesses = computed(() => {
  const query = normalize(search.value.trim())
  return businesses.value
    .map((business) => ({
      ...business,
      pointSales: (business.pointSales || [])
        .map((point) => ({
          ...point,
          items: (point.items || []).filter((item) => {
            if (!query) return true
            const text = [item.name, ...(item.descriptions || []).map((line) => line.description)].join(' ')
            return normalize(text).includes(query)
          }),
        }))
        .filter((point) => (business.publicOffer === false ? !query : point.items.length > 0)),
    }))
    .filter((business) => (business.pointSales || []).length > 0)
})

const showsMenuLabels = computed(() => category.value?.name === 'Comida Criolla y Menús')

const placeCount = computed(() => {
  const count = visibleBusinesses.value.length
  return count === 1 ? '1 local disponible' : `${count} locales disponibles`
})

async function load() {
  error.value = ''
  const id = Number(route.params.id)
  try {
    const [categoryRes, businessRes] = await Promise.all([
      http.get<Category>(`/categories/${id}`),
      http.get<Business[]>('/public/businesses', { params: { categoryId: id, ...zoneParams() } }),
    ])
    category.value = categoryRes.data
    businesses.value = businessRes.data
  } catch (err) {
    error.value = apiError(err)
  }
}

onMounted(load)
watch(() => route.params.id, () => {
  search.value = ''
  load()
})

function planLevel(business: Business) {
  if (business.publicOffer === false) return 'free'
  if (canAsk(business)) return 'order'
  return 'catalog'
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

function addressLine(point: PointSale) {
  const address = point.address
  if (!address) return ''
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

function pedir(businessId: number, descriptionId?: number) {
  router.push({
    name: 'business',
    params: { id: businessId },
    query: {
      categoria: category.value?.id,
      ...(descriptionId ? { agregar: descriptionId } : {}),
    },
  })
}

function pedirMenu(businessId: number, itemId: number, offerId: number) {
  router.push({
    name: 'business',
    params: { id: businessId },
    query: { categoria: category.value?.id, elige: itemId, tipo: offerId },
  })
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="cat-head">
      <p v-if="zoneLabel" class="zone-chip">{{ zoneLabel }}</p>
      <h2>{{ category?.name || 'Categoría' }}</h2>
      <p class="meta">
        <span v-if="category?.rubro">{{ category.rubro.name }}</span>
        <span v-if="category?.rubro"> · </span>
        <span>{{ placeCount }}</span>
      </p>
      <label class="seek">
        <span>Buscar producto o servicio</span>
        <input v-model="search" type="search" placeholder="Buscar en esta categoría" />
      </label>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!businesses.length" class="empty">Todavía no hay negocios con puntos de venta que ofrezcan esta categoría.</p>
    <p v-else-if="!visibleBusinesses.length" class="empty">No hay negocios con ese criterio.</p>
    <div class="stack">
      <article v-for="business in visibleBusinesses" :key="business.id" class="shop" :class="`tier-${planLevel(business)}`">
        <p v-if="availability(business) === 'open'" class="state open">Abierto</p>
        <p v-else-if="availability(business) === 'closed'" class="state closed">Cerrado</p>
        <p v-else-if="availability(business) === 'listed'" class="state listed">Comercio afiliado</p>
        <router-link class="name" :to="{ name: 'business', params: { id: business.id }, query: { categoria: category?.id } }">
          <h3>{{ business.commercialName }}</h3>
        </router-link>
        <p v-if="business.commercialDescription" class="blurb">{{ business.commercialDescription }}</p>
        <div class="places">
          <article v-for="point in business.pointSales || []" :key="point.id">
            <p v-if="addressLine(point)">{{ addressLine(point) }}</p>
            <p>{{ point.scheduleLabel || 'Horario no registrado' }}</p>
          </article>
        </div>
        <div v-if="(business.pointSales || []).some((point) => point.whatsappUrl)" class="contacts">
          <a
            v-for="point in (business.pointSales || []).filter((point) => point.whatsappUrl)"
            :key="point.id"
            class="wa"
            :href="point.whatsappUrl"
          >
            {{ planLevel(business) === 'order' ? 'Crea tu pedido directamente o por WhatsApp' : 'Pedir directamente por WhatsApp' }}
          </a>
        </div>
        <div v-else-if="planLevel(business) === 'free' && phonesOf(business).length" class="contacts">
          <a v-for="phone in phonesOf(business)" :key="phone" class="call" :href="`tel:${phone}`">Llamar: {{ phone }}</a>
        </div>
        <template v-if="business.publicOffer !== false && (business.hasMenu || usesMenu(business))">
          <h4 v-if="showsMenuLabels">Platos a la carta</h4>
          <div v-if="cartaOf(business).length" class="product-grid">
            <article v-for="item in cartaOf(business)" :key="item.id" class="product-card">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
              <strong>{{ item.name }}</strong>
              <div v-for="line in item.descriptions" :key="line.id || line.description" class="line">
                <span>{{ line.description }}</span>
                <span v-if="line.price != null" class="price">{{ money(line.price) }}</span>
                <button v-if="canAsk(business) && line.id && line.price != null" class="add" type="button" @click="pedir(business.id, line.id)">Agregar</button>
              </div>
            </article>
          </div>
          <h4 v-if="showsMenuLabels && menuTypesOf(business).length">Menú del día</h4>
          <section v-for="offer in menuTypesOf(business)" :key="offer.id" class="menu-block">
            <h4>{{ offer.name }} · S/ {{ Number(offer.price).toFixed(2) }}</h4>
            <section v-for="part in offer.parts.filter((part) => part.items.length)" :key="`${offer.id}-${part.key}`">
              <p class="part">{{ part.label }}</p>
              <div class="product-grid">
                <article v-for="item in part.items" :key="item.id" class="product-card">
                  <button v-if="canAsk(business)" class="add" type="button" @click="pedirMenu(business.id, item.id, offer.id)">Elige opción</button>
                  <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
                  <strong>{{ item.name }}</strong>
                  <p v-for="line in item.descriptions" :key="line.id || line.description">{{ line.description }}</p>
                </article>
              </div>
            </section>
          </section>
        </template>
        <template v-else-if="business.publicOffer !== false">
          <h4 v-if="showsMenuLabels">Platos a la carta</h4>
          <div class="product-grid">
            <article v-for="item in itemsOf(business)" :key="item.id" class="product-card">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
              <strong>{{ item.name }}</strong>
              <div v-for="line in item.descriptions" :key="line.id || line.description" class="line">
                <span>{{ line.description }}</span>
                <span v-if="line.price != null" class="price">{{ money(line.price) }}</span>
                <button v-if="canAsk(business) && line.id && line.price != null" class="add" type="button" @click="pedir(business.id, line.id)">Agregar</button>
              </div>
            </article>
          </div>
        </template>
        <p v-if="planLevel(business) === 'catalog'" class="hint">Haz tu pedido o consulta los platos del día por WhatsApp</p>
      </article>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.cat-head h2 {
  margin: 8px 0 0;
  font-family: var(--font-ui);
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-align: left;
}

.zone-chip {
  display: inline-flex;
  margin: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e2e8f7;
  color: #5c5e65;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.meta {
  margin: 2px 0 12px;
  color: #5c5e65;
  font-size: 12px;
}

.meta span:last-child {
  color: #006740;
  font-weight: 600;
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

.empty {
  color: var(--color-muted);
  font-size: 14px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
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
  text-transform: uppercase;
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
