<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import ClientAccess from '../components/ClientAccess.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import type { DailyOffer, Market, Rubro, Zone } from '../types'
import { clearZone, readZone, saveZone, zoneRevision, type ChosenZone } from '../zone'

const router = useRouter()
const auth = usePortalAuth()
const rubros = ref<Rubro[]>([])
const previewRubros = ref<Rubro[]>([])
const groupName = ref('Mercados y Zonas Comerciales')
const markets = ref<Market[]>([])
const zones = ref<Zone[]>([])
const chosen = ref<ChosenZone | null>(readZone())
const districtId = ref(0)
const zoneId = ref(0)
const error = ref('')
const zoneHint = ref('')
const search = ref('')
const tracks = new Map<string, HTMLElement>()
const canSlide = ref<Record<string, boolean>>({})
const placeCardEl = ref<HTMLElement | null>(null)

function askForZone() {
  zoneHint.value = 'Elige Distrito y Zona para continuar'
  nextTick(() => {
    placeCardEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function updateSlide(key: string) {
  const track = tracks.get(key)
  canSlide.value[key] = !!track && track.scrollWidth - track.clientWidth - track.scrollLeft > 12
}

function bindTrack(key: string, element: Element | null) {
  if (element instanceof HTMLElement) tracks.set(key, element)
  else tracks.delete(key)
  nextTick(() => updateSlide(key))
}

function slide(key: string) {
  const track = tracks.get(key)
  if (!track) return
  track.scrollBy({ left: Math.max(track.clientWidth - 28, 140), behavior: 'smooth' })
}

function refreshSlides() {
  for (const key of tracks.keys()) updateSlide(key)
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function money(price: number | null | undefined) {
  if (price == null || !Number.isFinite(Number(price))) return ''
  return `S/ ${Number(price).toFixed(2)}`
}

function rubroTone(name: string) {
  const key = normalize(name)
  if (/fruta|verdura/.test(key)) return 'green'
  if (/comercio|servicio/.test(key)) return 'blue'
  if (/profesional|tecnico/.test(key)) return 'purple'
  return 'red'
}

function rubroBadge(rubro: Rubro) {
  const count = rubro.businessCount || 0
  if (count > 0) return `${count} Negocio${count === 1 ? '' : 's'}`
  const tone = rubroTone(rubro.name)
  if (tone === 'green') return 'Mercado fresco'
  if (tone === 'blue') return chosen.value?.name || 'En tu zona'
  if (tone === 'purple') return 'Verificados'
  return 'En tu zona'
}

function businessTarget(offer: DailyOffer, addToCart = false) {
  return {
    name: 'business' as const,
    params: { id: offer.businessId },
    query: {
      ...(offer.categoryId ? { categoria: offer.categoryId } : {}),
      ...(offer.itemId ? { oferta: offer.itemId } : {}),
      ...(addToCart && offer.descriptionId ? { agregar: offer.descriptionId } : {}),
    },
  }
}

function discountOf(offer: DailyOffer) {
  if (offer.price == null || offer.compareAtPrice == null) return 0
  const price = Number(offer.price)
  const compare = Number(offer.compareAtPrice)
  if (!(compare > price) || compare <= 0) return 0
  return Math.round(((compare - price) / compare) * 100)
}

function openBusiness(offer: DailyOffer) {
  router.push(businessTarget(offer, false))
}

function orderOffer(offer: DailyOffer, event?: Event) {
  event?.stopPropagation()
  const target = businessTarget(offer, offer.clientOrders)
  if (!auth.isAuthenticated && offer.clientOrders) {
    router.push({ name: 'login', query: { tipo: 'cliente', redirect: router.resolve(target).fullPath } })
    return
  }
  router.push(target)
}

const districts = computed(() => {
  const map = new Map<number, { id: number; name: string; provinceName: string; departmentName: string }>()
  for (const zone of zones.value) {
    const district = zone.district
    if (!district || map.has(district.id)) continue
    map.set(district.id, {
      id: district.id,
      name: district.name,
      provinceName: district.province?.name || '',
      departmentName: district.province?.department?.name || '',
    })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

const zoneOptions = computed(() =>
  zones.value
    .filter((zone) => zone.districtId === districtId.value)
    .sort((a, b) => a.name.localeCompare(b.name, 'es')),
)

watch(districtId, () => {
  if (!zoneOptions.value.some((zone) => zone.id === zoneId.value)) zoneId.value = 0
  zoneHint.value = ''
})

watch(zoneId, () => {
  if (zoneId.value) zoneHint.value = ''
})

const visibleMarkets = computed(() => {
  const query = normalize(search.value.trim())
  if (!query) return markets.value
  return markets.value.filter((market) => normalize(market.name).includes(query) || normalize(groupName.value).includes(query))
})

const showMarkets = computed(() => visibleMarkets.value.length > 0)

const visibleRubros = computed(() => {
  const query = normalize(search.value.trim())
  if (!query) return rubros.value
  return rubros.value
    .map((rubro) => ({
      ...rubro,
      categories: (rubro.categories || []).filter((category) => normalize(category.name).includes(query)),
      dailyOffers: query ? [] : rubro.dailyOffers,
    }))
    .filter((rubro) => (rubro.categories || []).length > 0)
})

async function loadZones() {
  const { data } = await http.get<Zone[]>('/zones')
  zones.value = data
  if (chosen.value && !data.some((zone) => zone.id === chosen.value?.id)) {
    clearZone()
    chosen.value = null
  }
}

async function loadCatalog() {
  if (!chosen.value) return
  const params = { zoneId: chosen.value.id }
  const [rubroRes, marketRes] = await Promise.all([
    http.get<Rubro[]>('/public/rubros', { params }),
    http.get<{ name: string; markets: Market[] }>('/public/markets', { params }),
  ])
  rubros.value = rubroRes.data
  groupName.value = marketRes.data.name
  markets.value = marketRes.data.markets
}

function enterZone() {
  const zone = zones.value.find((item) => item.id === zoneId.value)
  const district = zone?.district
  if (!zone || !district) return
  const next: ChosenZone = {
    id: zone.id,
    name: zone.name,
    districtId: district.id,
    districtName: district.name,
    provinceName: district.province?.name || '',
    departmentName: district.province?.department?.name || '',
  }
  saveZone(next)
  chosen.value = next
  search.value = ''
  error.value = ''
  zoneHint.value = ''
  loadCatalog().catch((err) => {
    error.value = apiError(err)
  })
}

function changeZone() {
  clearZone()
  chosen.value = null
  districtId.value = 0
  zoneId.value = 0
  rubros.value = []
  markets.value = []
  search.value = ''
}

onMounted(async () => {
  window.addEventListener('resize', refreshSlides)
  try {
    const rubroPromise = http.get<Rubro[]>('/public/rubros')
    await loadZones()
    previewRubros.value = (await rubroPromise).data
    if (chosen.value) await loadCatalog()
  } catch (err) {
    error.value = apiError(err)
  }
  await nextTick()
  refreshSlides()
})

onUnmounted(() => window.removeEventListener('resize', refreshSlides))

watch(zoneRevision, () => {
  if (readZone()) return
  chosen.value = null
  districtId.value = 0
  zoneId.value = 0
  rubros.value = []
  markets.value = []
  search.value = ''
  error.value = ''
})

watch([previewRubros, visibleRubros, visibleMarkets], async () => {
  await nextTick()
  refreshSlides()
})
</script>

<template>
  <ScreenFrame storefront fluid>
    <h2 class="store-hero">
      En la zona donde estés, encuentra lo que necesites... a un <span>click</span> de distancia
    </h2>
    <ClientAccess />
    <template v-if="!chosen">
      <p v-if="error" class="error place-note">{{ error }}</p>
      <p v-else-if="!zones.length" class="muted place-note">Todavía no hay zonas registradas.</p>
      <form v-else ref="placeCardEl" class="place-card" @submit.prevent="enterZone">
        <div class="place-heading">
          <span class="pin" aria-hidden="true" />
          <h3>Elige tu ubicación</h3>
        </div>
        <p v-if="zoneHint" class="zone-hint" role="status">{{ zoneHint }}</p>
        <label class="field">
          <span>Distrito</span>
          <select v-model.number="districtId" required>
            <option :value="0">Elige el distrito</option>
            <option v-for="district in districts" :key="district.id" :value="district.id">
              {{ district.name }}<template v-if="district.provinceName"> · {{ district.provinceName }}</template>
            </option>
          </select>
        </label>
        <label class="field">
          <span>Zona</span>
          <select v-model.number="zoneId" required :disabled="!districtId">
            <option :value="0">Elige la zona</option>
            <option v-for="zone in zoneOptions" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
          </select>
        </label>
        <button class="btn accept" type="submit" :disabled="!zoneId">Aceptar</button>
      </form>
      <section v-for="rubro in previewRubros" :key="rubro.id" class="rail">
        <header class="rail-head">
          <h3>{{ rubro.name }}</h3>
          <button v-if="canSlide[`preview-${rubro.id}`]" class="slide" type="button" @click="slide(`preview-${rubro.id}`)">Deslizar →</button>
        </header>
        <div v-if="(rubro.categories || []).length" class="rail-track" @scroll="updateSlide(`preview-${rubro.id}`)" :ref="(element) => bindTrack(`preview-${rubro.id}`, element as Element | null)">
          <article
            v-for="category in rubro.categories"
            :key="category.id"
            class="rail-card"
            role="button"
            tabindex="0"
            @click="askForZone"
            @keydown.enter.prevent="askForZone"
            @keydown.space.prevent="askForZone"
          >
            <img v-if="category.imageUrl" :src="category.imageUrl" :alt="category.name" />
            <div v-else class="thumb" />
            <h4>{{ category.name }}</h4>
          </article>
        </div>
        <p v-else class="muted place-note">Este rubro todavía no tiene categorías.</p>
      </section>
    </template>
    <template v-else>
      <div class="zone-bar">
        <span class="zone-pin">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"/></svg>
          {{ chosen.districtName }} · {{ chosen.name }}
        </span>
        <button type="button" @click="changeZone">Cambiar zona</button>
      </div>
      <label class="field store-search">
        <span>Buscar categoría</span>
        <input v-model="search" type="search" placeholder="Ejemplo: postres, pollería, médicos" />
      </label>
      <p v-if="error" class="error place-note">{{ error }}</p>
      <p v-else-if="!rubros.length && !showMarkets" class="muted place-note">Esta zona todavía no tiene negocios publicados.</p>
      <p v-else-if="!visibleRubros.length && !showMarkets" class="muted place-note">No hay categorías con ese nombre.</p>

      <section v-for="rubro in visibleRubros" :key="rubro.id" class="rubro-block" :data-tone="rubroTone(rubro.name)">
        <header class="rubro-head">
          <h3>{{ rubro.name }}</h3>
          <span class="rubro-badge">{{ rubroBadge(rubro) }}</span>
        </header>

        <div
          v-if="(rubro.dailyOffers || []).length"
          class="deal-track"
          @scroll="updateSlide(`deals-${rubro.id}`)"
          :ref="(element) => bindTrack(`deals-${rubro.id}`, element as Element | null)"
        >
          <article
            v-for="offer in rubro.dailyOffers"
            :key="offer.id"
            class="deal-card"
            role="link"
            tabindex="0"
            @click="openBusiness(offer)"
            @keydown.enter.prevent="openBusiness(offer)"
          >
            <div class="deal-top">
              <span class="deal-tag">Oferta del día</span>
              <span class="deal-shop">{{ offer.businessName }}</span>
            </div>
            <div class="deal-body">
              <img v-if="offer.imageUrl" :src="offer.imageUrl" :alt="offer.title" />
              <div v-else class="deal-thumb" />
              <div class="deal-copy">
                <h4>{{ offer.title }}</h4>
                <p v-if="offer.detail" class="deal-detail">{{ offer.detail }}</p>
                <div v-if="offer.price != null" class="deal-prices">
                  <span class="deal-price">{{ money(offer.price) }}</span>
                  <span v-if="offer.compareAtPrice != null && Number(offer.compareAtPrice) > Number(offer.price)" class="deal-was">{{ money(offer.compareAtPrice) }}</span>
                  <span v-if="discountOf(offer)" class="deal-off">-{{ discountOf(offer) }}%</span>
                </div>
              </div>
            </div>
            <div class="deal-foot">
              <span>{{ offer.footer }}</span>
              <button type="button" @click="orderOffer(offer, $event)">{{ offer.cta }}</button>
            </div>
          </article>
        </div>

        <div class="cat-grid">
          <router-link
            v-for="category in rubro.categories || []"
            :key="category.id"
            class="cat-card"
            :to="{ name: 'category', params: { id: category.id } }"
          >
            <img v-if="category.imageUrl" :src="category.imageUrl" :alt="category.name" />
            <div v-else class="thumb" />
            <p>{{ category.name }}</p>
          </router-link>
        </div>
      </section>

      <section v-if="showMarkets" class="rubro-block" data-tone="blue">
        <header class="rubro-head">
          <h3>{{ groupName }}</h3>
          <span class="rubro-badge">{{ visibleMarkets.length }} mercado{{ visibleMarkets.length === 1 ? '' : 's' }}</span>
        </header>
        <div class="cat-grid">
          <router-link v-for="market in visibleMarkets" :key="market.id" class="cat-card" :to="{ name: 'market', params: { id: market.id } }">
            <img v-if="market.imageUrl" :src="market.imageUrl" :alt="market.name" />
            <div v-else class="thumb" />
            <p>{{ market.name }}</p>
          </router-link>
        </div>
      </section>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.store-hero {
  margin: 4px 0 14px;
  text-align: center;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 800;
  color: #0f172a;
}

.store-hero span {
  color: var(--color-brand);
  text-decoration: underline;
  text-decoration-color: rgba(226, 18, 33, 0.3);
  text-underline-offset: 2px;
}

.place-note {
  margin: 0 0 12px;
}

.place-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 18px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
}

.place-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.place-heading h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1e293b;
}

.zone-hint {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff5f5;
  border: 1px solid #fecaca;
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.zone-hint {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff5f5;
  border: 1px solid #fecaca;
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.pin {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #ffe4e6 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath fill='%23E21221' d='M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z'/%3E%3C/svg%3E") center / 14px no-repeat;
  flex: 0 0 auto;
}

.place-card :deep(.field span),
.store-search :deep(span) {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.place-card :deep(select),
.store-search :deep(input) {
  width: 100%;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #1e293b;
}

.btn.accept {
  border-radius: var(--radius-control);
  background: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  padding: 10px 14px;
  box-shadow: 0 1px 2px rgba(226, 18, 33, 0.2);
}

.zone-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.zone-pin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.zone-pin svg {
  width: 16px;
  height: 16px;
  color: var(--color-brand);
  flex: 0 0 auto;
}

.zone-bar button {
  border: 0;
  background: none;
  color: #e21221;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.store-search {
  margin-bottom: 16px;
}

.rail {
  margin: 0 -16px 22px;
}

.rail-head,
.rubro-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.rail-head {
  padding: 0 16px;
  margin-bottom: 8px;
  align-items: baseline;
}

.rail-head h3,
.rubro-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #0f172a;
}

.rubro-badge {
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fef2f2;
  color: var(--color-brand);
}

.rubro-block[data-tone='green'] .rubro-badge {
  background: #ecfdf5;
  color: #047857;
}

.rubro-block[data-tone='blue'] .rubro-badge {
  background: #eff6ff;
  color: #1d4ed8;
}

.rubro-block[data-tone='purple'] .rubro-badge {
  background: #f5f3ff;
  color: #6d28d9;
}

.slide {
  border: 0;
  background: none;
  color: var(--color-brand);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  padding: 0;
}

.rail-track,
.deal-track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 0 10px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  touch-action: pan-x pan-y;
}

.rail-track {
  padding: 4px 16px 8px;
}

.rail-track::-webkit-scrollbar,
.deal-track::-webkit-scrollbar {
  display: none;
}

.rail-card {
  flex: 0 0 144px;
  scroll-snap-align: start;
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
}

.rail-card img,
.rail-card .thumb,
.cat-card img,
.cat-card .thumb {
  display: block;
  width: 100%;
  height: 96px;
  object-fit: cover;
  background: #f1f5f9;
}

.rail-card h4 {
  margin: 0;
  padding: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rubro-block {
  margin-bottom: 28px;
}

.deal-card {
  flex: 0 0 min(100%, 320px);
  scroll-snap-align: start;
  border-radius: 16px;
  padding: 12px;
  color: #fff;
  background: linear-gradient(90deg, #dc2626, #e11d48);
  box-shadow: 0 10px 24px -12px rgba(226, 18, 33, 0.45);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.rubro-block[data-tone='green'] .deal-card {
  background: linear-gradient(90deg, #059669, #0f766e);
  box-shadow: 0 10px 24px -12px rgba(5, 150, 105, 0.4);
}

.rubro-block[data-tone='blue'] .deal-card {
  background: linear-gradient(90deg, #1d4ed8, #312e81);
  box-shadow: 0 10px 24px -12px rgba(29, 78, 216, 0.4);
}

.rubro-block[data-tone='purple'] .deal-card {
  background: linear-gradient(90deg, #6d28d9, #312e81);
  box-shadow: 0 10px 24px -12px rgba(109, 40, 217, 0.4);
}

.deal-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.deal-tag {
  display: inline-flex;
  align-items: center;
  background: #fff;
  color: var(--color-brand);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 2px 8px;
  border-radius: 999px;
}

.rubro-block[data-tone='green'] .deal-tag {
  background: #fcd34d;
  color: #064e3b;
}

.rubro-block[data-tone='blue'] .deal-tag,
.rubro-block[data-tone='purple'] .deal-tag {
  background: #fcd34d;
  color: #1e1b4b;
}

.deal-shop {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.deal-body {
  display: flex;
  gap: 12px;
  align-items: center;
}

.deal-body img,
.deal-thumb {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
  flex: 0 0 auto;
  border: 2px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.12);
}

.deal-copy {
  min-width: 0;
  flex: 1;
}

.deal-copy h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.deal-detail {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.3;
  color: rgba(255, 255, 255, 0.85);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.deal-prices {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.deal-price {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
}

.deal-was {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: line-through;
}

.deal-off {
  background: #fcd34d;
  color: #78350f;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
}

.deal-foot {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.deal-foot span {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deal-foot button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 8px;
  background: #fff;
  color: #9f1239;
  font-size: 10px;
  font-weight: 700;
  padding: 6px 10px;
  cursor: pointer;
}

.rubro-block[data-tone='green'] .deal-foot button { color: #065f46; }
.rubro-block[data-tone='blue'] .deal-foot button { color: #1e3a8a; }
.rubro-block[data-tone='purple'] .deal-foot button { color: #4c1d95; }

.cat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cat-card {
  display: block;
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 2px 8px -2px rgba(31, 34, 40, 0.04);
}

.cat-card p {
  margin: 0;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.entry-actions) {
  margin-bottom: 14px;
}

:deep(.entry-actions .btn.entry) {
  flex: 1;
  width: auto;
  min-width: 0;
  border-radius: 12px;
  padding: 8px 6px;
  font-size: 12px;
  font-weight: 700;
}

@media (min-width: 1024px) {
  .store-hero {
    margin: 8px auto 20px;
    max-width: 640px;
    font-size: 28px;
    line-height: 1.3;
  }

  .place-card {
    max-width: 520px;
    margin: 0 auto 28px;
    padding: 22px 24px;
  }

  .place-card :deep(select),
  .store-search :deep(input) {
    font-size: 14px;
    padding: 12px 14px;
  }

  .btn.accept {
    font-size: 14px;
    min-height: 48px;
  }

  .zone-bar {
    font-size: 15px;
    margin-bottom: 16px;
  }

  .store-search {
    max-width: 480px;
  }

  .rail {
    margin: 0 -28px 28px;
  }

  .rail-head {
    padding: 0 28px;
  }

  .rail-track {
    padding: 4px 28px 10px;
    gap: 16px;
  }

  .rail-card {
    flex: 0 0 180px;
  }

  .rail-card img,
  .rail-card .thumb,
  .cat-card img,
  .cat-card .thumb {
    height: 120px;
  }

  .rail-card h4,
  .cat-card p {
    font-size: 13px;
    padding: 12px;
  }

  .rail-head h3,
  .rubro-head h3 {
    font-size: 18px;
  }

  .rubro-block {
    margin-bottom: 36px;
  }

  .cat-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .deal-track {
    gap: 16px;
  }

  .deal-card {
    flex: 0 0 min(100%, 380px);
    padding: 16px;
  }

  .deal-copy h4 {
    font-size: 14px;
  }

  .deal-price {
    font-size: 18px;
  }

  .deal-foot button {
    font-size: 12px;
    padding: 8px 14px;
  }

  :deep(.entry-actions) {
    max-width: 420px;
    margin: 0 auto 20px;
  }

  :deep(.entry-actions .btn.entry) {
    min-height: 48px;
    font-size: 14px;
    padding: 10px 12px;
  }
}
</style>
