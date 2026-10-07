<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { Zone } from '../types'

type BizMetrics = {
  id: number
  commercialName: string
  commercialDescription: string
  businessClicks: number
  whatsappClicks: number
  orders: number
}

type CatMetrics = {
  id: number
  name: string
  businessCount: number
  businessClicks: number
  whatsappClicks: number
  orders: number
  businesses: BizMetrics[]
}

type RubroMetrics = {
  id: number
  name: string
  businessCount: number
  businessClicks: number
  whatsappClicks: number
  orders: number
  categories: CatMetrics[]
}

type ReportPayload = {
  date: string
  zone: {
    id: number
    name: string
    label: string
  }
  totals: {
    businessClicks: number
    whatsappClicks: number
    orders: number
    totalBusinesses: number
    activeBusinesses: number
  }
  rubros: RubroMetrics[]
}

function limaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}

const date = ref(limaToday())
const zoneId = ref(0)
const zones = ref<Zone[]>([])
const report = ref<ReportPayload | null>(null)
const selectedRubroId = ref(0)
const selectedCategoryId = ref(0)
const loading = ref(false)
const error = ref('')

const syncedLabel = computed(() => {
  const now = new Date()
  const time = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now)
  return `Datos actualizados hoy, ${time}`
})

const zoneOptions = computed(() =>
  [...zones.value].sort((a, b) => zoneLabel(a).localeCompare(zoneLabel(b), 'es')),
)

const selectedRubro = computed(
  () => report.value?.rubros.find((row) => row.id === selectedRubroId.value) || null,
)

const selectedCategory = computed(
  () => selectedRubro.value?.categories.find((row) => row.id === selectedCategoryId.value) || null,
)

function zoneLabel(zone: Zone) {
  const department = zone.district?.province?.department?.name || ''
  const district = zone.district?.name || ''
  return [department, district, zone.name].filter(Boolean).join(' / ')
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('es-PE')
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toLocaleUpperCase('es-PE')
}

function selectRubro(id: number) {
  selectedRubroId.value = id
  const first = report.value?.rubros.find((row) => row.id === id)?.categories[0]
  selectedCategoryId.value = first?.id ?? 0
}

function selectCategory(id: number) {
  selectedCategoryId.value = id
}

async function loadZones() {
  const { data } = await http.get<Zone[]>('/zones')
  zones.value = data
  if (!zoneId.value && data.length) zoneId.value = data[0].id
}

async function loadReport() {
  if (!zoneId.value) {
    report.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get<ReportPayload>('/metrics/whatsapp-day', {
      params: { date: date.value, zoneId: zoneId.value },
    })
    report.value = data
    const keepRubro = data.rubros.some((row) => row.id === selectedRubroId.value)
    if (!keepRubro) selectedRubroId.value = data.rubros[0]?.id || 0
    const rubro = data.rubros.find((row) => row.id === selectedRubroId.value)
    const keepCat = rubro?.categories.some((row) => row.id === selectedCategoryId.value)
    if (!keepCat) selectedCategoryId.value = rubro?.categories[0]?.id || 0
  } catch (err) {
    error.value = apiError(err)
    report.value = null
  } finally {
    loading.value = false
  }
}

watch([date, zoneId], loadReport)
onMounted(async () => {
  try {
    await loadZones()
    await loadReport()
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>WhatsApp + Pedido x Día</h2>
      <p>Métricas de conversión y pedidos por comercio</p>
      <p class="sync"><i aria-hidden="true" /> {{ syncedLabel }}</p>
    </header>

    <section class="filters">
      <label>
        <span>Filtro día</span>
        <input v-model="date" type="date" />
      </label>
      <label>
        <span>Filtro zona</span>
        <select v-model.number="zoneId">
          <option disabled :value="0">Selecciona zona</option>
          <option v-for="zone in zoneOptions" :key="zone.id" :value="zone.id">
            {{ zoneLabel(zone) }}
          </option>
        </select>
      </label>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="empty">Cargando…</p>

    <template v-else-if="report">
      <section class="kpis">
        <article class="kpi">
          <span class="label">Clics negocios</span>
          <strong>{{ report.totals.businessClicks }}</strong>
        </article>
        <article class="kpi">
          <span class="label">Clics WhatsApp</span>
          <strong>{{ report.totals.whatsappClicks }}</strong>
        </article>
        <article class="kpi brand">
          <span class="label">Pedidos</span>
          <strong>{{ report.totals.orders }}</strong>
        </article>
        <article class="kpi">
          <span class="label">Negocios activos</span>
          <strong>{{ report.totals.activeBusinesses }}</strong>
          <p>de {{ report.totals.totalBusinesses }} totales</p>
        </article>
      </section>

      <section class="block">
        <header>
          <div>
            <h3><span>1</span> Métricas por rubro</h3>
            <p>Toca un rubro para ver sus categorías</p>
          </div>
          <em>{{ report.rubros.length }} rubros</em>
        </header>
        <p v-if="!report.rubros.length" class="empty">No hay negocios en esta zona.</p>
        <div v-else class="rows">
          <button
            v-for="rubro in report.rubros"
            :key="rubro.id"
            type="button"
            class="row"
            :class="{ on: rubro.id === selectedRubroId }"
            @click="selectRubro(rubro.id)"
          >
            <div class="who">
              <strong>{{ rubro.name }}</strong>
              <span>{{ rubro.businessCount }} {{ rubro.businessCount === 1 ? 'negocio' : 'negocios' }}</span>
            </div>
            <div class="stats">
              <span>{{ rubro.businessClicks }} clics</span>
              <span>{{ rubro.whatsappClicks }} WA</span>
              <span>{{ rubro.orders }} ped.</span>
            </div>
          </button>
        </div>
      </section>

      <template v-if="selectedRubro">
        <p class="bridge">Categorías de {{ selectedRubro.name }}</p>
        <section class="block">
          <header>
            <div>
              <h3><span>2</span> Métricas por categoría</h3>
              <p>Rubro: {{ selectedRubro.name }}</p>
            </div>
            <em>{{ selectedRubro.categories.length }} categorías</em>
          </header>
          <div class="rows">
            <button
              v-for="category in selectedRubro.categories"
              :key="category.id"
              type="button"
              class="row"
              :class="{ on: category.id === selectedCategoryId }"
              @click="selectCategory(category.id)"
            >
              <div class="who">
                <strong>{{ category.name }}</strong>
                <span>{{ category.businessCount }} {{ category.businessCount === 1 ? 'negocio' : 'negocios' }}</span>
              </div>
              <div class="stats">
                <span>{{ category.businessClicks }} clics</span>
                <span>{{ category.whatsappClicks }} WA</span>
                <span>{{ category.orders }} ped.</span>
              </div>
            </button>
          </div>
        </section>
      </template>

      <template v-if="selectedCategory">
        <p class="bridge">Locales en {{ selectedCategory.name }}</p>
        <section class="block">
          <header>
            <div>
              <h3><span>3</span> Métricas por negocio</h3>
              <p>Categoría: {{ selectedCategory.name }}</p>
            </div>
            <em>{{ selectedCategory.businesses.length }} locales</em>
          </header>
          <div class="biz-list">
            <article v-for="biz in selectedCategory.businesses" :key="biz.id" class="biz">
              <div class="biz-top">
                <span class="avatar">{{ initials(biz.commercialName) }}</span>
                <div class="info">
                  <strong>{{ biz.commercialName }}</strong>
                  <span v-if="biz.commercialDescription">{{ biz.commercialDescription }}</span>
                </div>
                <em>{{ biz.orders }} {{ biz.orders === 1 ? 'pedido' : 'pedidos' }}</em>
              </div>
              <div class="biz-metrics">
                <div>
                  <span>Clics negocio</span>
                  <b>{{ biz.businessClicks }}</b>
                </div>
                <div>
                  <span>Clics WhatsApp</span>
                  <b>{{ biz.whatsappClicks }}</b>
                </div>
                <div>
                  <span>Pedidos</span>
                  <b>{{ biz.orders }}</b>
                </div>
              </div>
            </article>
          </div>
        </section>
      </template>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 14px;
  text-align: center;
}

.head h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
}

.sync {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: #e8eefd;
  color: #5c5e65;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sync i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #008352;
}

.filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
}

.filters label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.filters span {
  color: #5c5e65;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.filters input,
.filters select {
  width: 100%;
  height: 44px;
  border: 1px solid #dde2f2;
  border-radius: var(--radius-control);
  background: #f0f3ff;
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-ink);
}

.kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.kpi {
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  padding: 12px;
  min-width: 0;
}

.kpi.brand {
  background: var(--color-brand);
  color: #fff;
}

.label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #60626a;
}

.kpi.brand .label {
  color: rgba(255, 255, 255, 0.85);
}

.kpi strong {
  display: block;
  margin-top: 4px;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.kpi p {
  margin: 2px 0 0;
  color: #5c5e65;
  font-size: 12px;
}

.block {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
}

.block > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eefd;
}

.block h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
}

.block h3 span {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-brand);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 11px;
}

.block header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.block header em {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  background: #e8eefd;
  color: #5c5e65;
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  margin: 0 0 8px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: #f0f3ff;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.row:last-child {
  margin-bottom: 0;
}

.row.on {
  background: #fff5f5;
  border-color: var(--color-brand);
}

.who {
  min-width: 0;
  flex: 1;
}

.who strong {
  display: block;
  font-size: 14px;
  font-weight: 800;
  word-break: break-word;
}

.who span {
  color: #64748b;
  font-size: 12px;
}

.stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  color: #5c5e65;
  font-size: 11px;
  font-weight: 700;
}

.bridge {
  margin: 0 0 10px;
  text-align: center;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 800;
}

.biz {
  margin: 0 0 10px;
  padding: 12px;
  border-radius: 12px;
  background: #f0f3ff;
}

.biz:last-child {
  margin-bottom: 0;
}

.biz-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-brand);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.info {
  min-width: 0;
  flex: 1;
}

.info strong {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 14px;
  font-weight: 800;
  word-break: break-word;
}

.info span {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.biz-top em {
  flex-shrink: 0;
  color: #008352;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.biz-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-top: 10px;
  padding: 8px;
  border-radius: 10px;
  background: #fff;
  text-align: center;
}

.biz-metrics span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.biz-metrics b {
  display: block;
  margin-top: 2px;
  font-size: 16px;
  font-weight: 800;
}

.empty {
  margin: 8px 0;
  text-align: center;
  color: var(--color-muted);
  font-size: 14px;
}

.rows,
.biz-list {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 20px;
  }

  .head h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .head > p:first-of-type {
    max-width: 480px;
    margin: 10px auto 0;
    font-size: 15px;
    line-height: 22px;
  }

  .sync {
    margin-top: 14px;
    padding: 8px 16px;
    font-size: 11px;
  }

  .filters {
    max-width: 720px;
    gap: 14px;
    margin-bottom: 18px;
    padding: 16px 18px;
  }

  .filters span {
    font-size: 11px;
  }

  .filters input,
  .filters select {
    height: 48px;
    font-size: 14px;
  }

  .kpis {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .kpi {
    padding: 18px 20px;
  }

  .label {
    font-size: 11px;
  }

  .kpi strong {
    font-size: 28px;
    line-height: 1.15;
  }

  .kpi p {
    font-size: 13px;
  }

  .block {
    padding: 20px 22px;
    margin-bottom: 18px;
  }

  .block h3 {
    font-size: 18px;
  }

  .rows {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .row {
    margin: 0;
    padding: 14px 16px;
    height: 100%;
  }

  .who strong {
    font-size: 15px;
  }

  .stats {
    font-size: 12px;
  }

  .bridge {
    font-size: 13px;
    margin-bottom: 12px;
  }

  .biz-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .biz {
    margin: 0;
    padding: 16px;
    height: 100%;
  }

  .info strong {
    font-size: 15px;
  }

  .biz-metrics b {
    font-size: 18px;
  }

  .empty {
    font-size: 15px;
  }
}
</style>
