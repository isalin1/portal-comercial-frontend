<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { Business, Category, PointSale } from '../types'
import { readZone, zoneParams } from '../zone'

const route = useRoute()
const category = ref<Category | null>(null)
const businesses = ref<Business[]>([])
const error = ref('')
const search = ref('')
const marketName = ref('')
const marketId = computed(() => Number(route.params.marketId || 0))
const zoneLabel = computed(() => {
  const zone = readZone()
  if (!zone) return ''
  return `${zone.name}, ${zone.districtName}`
})
const contextLabel = computed(() => marketName.value || zoneLabel.value)

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function addressLine(point: PointSale) {
  const address = point.address
  if (!address) return ''
  return [address.street, address.urbanZone, address.district?.name].filter(Boolean).join(', ')
}

function addressesOf(business: Business) {
  return [...new Set((business.pointSales || []).map(addressLine).filter(Boolean))]
}

function rubroName() {
  return category.value?.rubro?.name || businesses.value[0]?.rubro?.name || ''
}

/** Etiqueta del botón según el rubro. */
const actionLabel = computed(() => {
  const name = normalize(rubroName())
  if (name.includes('comida') && name.includes('antojo')) return 'ver carta'
  if (name.includes('profesional')) return 'ver servicios'
  return 'ver productos'
})

const visibleBusinesses = computed(() => {
  const query = normalize(search.value.trim())
  return businesses.value.filter((business) => {
    if (!(business.pointSales || []).length) return false
    if (!query) return true
    const text = [business.commercialName, business.commercialDescription || ''].join(' ')
    return normalize(text).includes(query)
  })
})

const placeCount = computed(() => {
  const count = visibleBusinesses.value.length
  return count === 1 ? '1 local disponible' : `${count} locales disponibles`
})

async function load() {
  error.value = ''
  const id = Number(route.params.categoryId || route.params.id)
  try {
    if (marketId.value) {
      const { data } = await http.get<{
        name: string
        rubros: { id: number; name: string; categories: { id: number | null; name: string; imageUrl?: string | null; businesses: Business[] }[] }[]
      }>(`/public/markets/${marketId.value}`, { params: zoneParams() })
      marketName.value = data.name
      const match = data.rubros
        .flatMap((rubro) => rubro.categories.map((item) => ({ rubro, item })))
        .find((row) => row.item.id === id)
      if (!match?.item.id) {
        category.value = null
        businesses.value = []
        error.value = 'Esa categoría no está en este mercado.'
        return
      }
      category.value = {
        id: match.item.id,
        name: match.item.name,
        imageUrl: match.item.imageUrl,
        rubroId: match.rubro.id,
        rubro: { id: match.rubro.id, name: match.rubro.name },
      }
      businesses.value = match.item.businesses
      return
    }
    marketName.value = ''
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
watch(() => [route.params.id, route.params.categoryId, route.params.marketId], () => {
  search.value = ''
  load()
})
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="cat-head">
      <p v-if="contextLabel" class="zone-chip">{{ contextLabel }}</p>
      <h2>{{ category?.name || 'Categoría' }}</h2>
      <p class="meta">
        <span v-if="category?.rubro">{{ category.rubro.name }}</span>
        <span v-if="category?.rubro"> · </span>
        <span>{{ placeCount }}</span>
      </p>
      <label class="seek">
        <span>Buscar negocio</span>
        <input v-model="search" type="search" placeholder="Nombre o descripción" />
      </label>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!businesses.length" class="empty">Todavía no hay negocios con puntos de venta que ofrezcan esta categoría.</p>
    <p v-else-if="!visibleBusinesses.length" class="empty">No hay negocios con ese criterio.</p>
    <div class="stack">
      <article v-for="business in visibleBusinesses" :key="business.id" class="shop">
        <div class="media" :class="{ empty: !business.imageUrl }">
          <img v-if="business.imageUrl" :src="business.imageUrl" :alt="business.commercialName" />
          <span v-else>{{ business.commercialName.slice(0, 1) }}</span>
        </div>
        <div class="copy">
          <h3>{{ business.commercialName }}</h3>
          <p v-if="business.commercialDescription" class="blurb">{{ business.commercialDescription }}</p>
          <p v-if="addressesOf(business).length" class="addr">{{ addressesOf(business).join(' · ') }}</p>
          <router-link
            class="go"
            :to="{ name: 'business', params: { id: business.id }, query: { categoria: category?.id } }"
          >
            {{ actionLabel }}
          </router-link>
        </div>
      </article>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.cat-head h2 {
  margin: 8px 0 0;
  font-family: var(--font-ui);
  font-size: 24px;
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-align: left;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.shop {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 100%;
  overflow: hidden;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.media {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: linear-gradient(145deg, #fee2e2, #fecaca);
  overflow: hidden;
}

.media.empty {
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media span {
  color: #fff;
  font-size: 28px;
  font-weight: 800;
  text-transform: uppercase;
}

.copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 8px 8px 10px;
}

.shop h3 {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 18px;
  font-weight: 800;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blurb,
.addr {
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.blurb {
  color: #5c5e65;
  font-size: 12px;
  line-height: 16px;
}

.addr {
  color: var(--color-ink);
  font-size: 9px;
  line-height: 12px;
  font-weight: 600;
}

.go {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  margin-top: auto;
  padding: 8px 6px;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
}

@media (min-width: 1024px) {
  .cat-head {
    display: grid;
    grid-template-columns: 1fr minmax(280px, 420px);
    gap: 8px 24px;
    align-items: end;
    margin-bottom: 8px;
  }

  .zone-chip {
    grid-column: 1;
    width: fit-content;
    font-size: 11px;
    padding: 4px 10px;
  }

  .cat-head h2 {
    grid-column: 1;
    margin: 4px 0 0;
    font-size: 32px;
    line-height: 1.2;
  }

  .meta {
    grid-column: 1;
    margin: 4px 0 0;
    font-size: 14px;
  }

  .seek {
    grid-column: 2;
    grid-row: 1 / span 3;
    align-self: center;
  }

  .seek span {
    font-size: 11px;
  }

  .seek input {
    font-size: 14px;
  }

  .stack {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-top: 20px;
  }

  .copy {
    padding: 16px 18px 18px;
    flex: 1;
  }

  .shop {
    min-height: 100%;
  }

  .shop h3 {
    font-size: 20px;
    line-height: 26px;
  }

  .blurb {
    font-size: 14px;
    line-height: 20px;
    flex: 1;
  }

  .go {
    margin-top: auto;
  }
}
</style>
