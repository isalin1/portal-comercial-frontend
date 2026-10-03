<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import ClientAccess from '../components/ClientAccess.vue'
import { apiError, http } from '../api'
import type { Market, Rubro, Zone } from '../types'
import { clearZone, readZone, saveZone, zoneRevision, type ChosenZone } from '../zone'

const rubros = ref<Rubro[]>([])
const previewRubros = ref<Rubro[]>([])
const groupName = ref('Mercados y Zonas Comerciales')
const markets = ref<Market[]>([])
const zones = ref<Zone[]>([])
const chosen = ref<ChosenZone | null>(readZone())
const districtId = ref(0)
const zoneId = ref(0)
const error = ref('')
const search = ref('')
const tracks = new Map<string, HTMLElement>()
const canSlide = ref<Record<string, boolean>>({})

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
  <ScreenFrame storefront>
    <h2 class="store-hero">
      En la zona donde estés, encuentra lo que necesites... a un <span>click</span> de distancia
    </h2>
    <ClientAccess />
    <template v-if="!chosen">
      <p v-if="error" class="error place-note">{{ error }}</p>
      <p v-else-if="!zones.length" class="muted place-note">Todavía no hay zonas registradas.</p>
      <form v-else class="place-card" @submit.prevent="enterZone">
        <div class="place-heading">
          <span class="pin" aria-hidden="true" />
          <h3>Elige tu ubicación</h3>
        </div>
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
          <article v-for="category in rubro.categories" :key="category.id" class="rail-card">
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
        <span>{{ chosen.districtName }} · {{ chosen.name }}</span>
        <button type="button" @click="changeZone">Cambiar zona</button>
      </div>
      <label class="field store-search">
        <span>Buscar categoría</span>
        <input v-model="search" type="search" placeholder="Ejemplo: postres, pollería, médicos" />
      </label>
      <p v-if="error" class="error place-note">{{ error }}</p>
      <p v-else-if="!rubros.length && !showMarkets" class="muted place-note">Esta zona todavía no tiene negocios publicados.</p>
      <p v-else-if="!visibleRubros.length && !showMarkets" class="muted place-note">No hay categorías con ese nombre.</p>
      <section v-for="rubro in visibleRubros" :key="rubro.id" class="rail">
        <header class="rail-head">
          <h3>{{ rubro.name }}</h3>
          <button v-if="canSlide[`rubro-${rubro.id}`]" class="slide" type="button" @click="slide(`rubro-${rubro.id}`)">Deslizar →</button>
        </header>
        <div class="rail-track" @scroll="updateSlide(`rubro-${rubro.id}`)" :ref="(element) => bindTrack(`rubro-${rubro.id}`, element as Element | null)">
          <router-link
            v-for="category in rubro.categories || []"
            :key="category.id"
            class="rail-card"
            :to="{ name: 'category', params: { id: category.id } }"
          >
            <img v-if="category.imageUrl" :src="category.imageUrl" :alt="category.name" />
            <div v-else class="thumb" />
            <h4>{{ category.name }}</h4>
          </router-link>
        </div>
      </section>
      <section v-if="showMarkets" class="rail">
        <header class="rail-head">
          <h3>{{ groupName }}</h3>
          <button v-if="canSlide.markets" class="slide" type="button" @click="slide('markets')">Deslizar →</button>
        </header>
        <div class="rail-track" @scroll="updateSlide('markets')" :ref="(element) => bindTrack('markets', element as Element | null)">
          <router-link v-for="market in visibleMarkets" :key="market.id" class="rail-card" :to="{ name: 'market', params: { id: market.id } }">
            <img v-if="market.imageUrl" :src="market.imageUrl" :alt="market.name" />
            <div v-else class="thumb" />
            <h4>{{ market.name }}</h4>
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
  text-decoration: underline wavy #fca5a5;
  text-underline-offset: 3px;
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

.zone-bar button {
  border: 0;
  background: none;
  color: #e21221;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.store-search {
  margin-bottom: 16px;
}

.rail {
  margin: 0 -16px 22px;
}

.rail-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 0 16px;
  margin-bottom: 8px;
}

.rail-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
  text-transform: none;
  color: #0f172a;
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

.rail-track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 16px 8px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  touch-action: pan-x pan-y;
}

.rail-track::-webkit-scrollbar {
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
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
}

.rail-card img,
.rail-card .thumb {
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
</style>
