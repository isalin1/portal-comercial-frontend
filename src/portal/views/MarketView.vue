<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { Business } from '../types'
import { zoneParams } from '../zone'

type MarketCategory = {
  id: number | null
  name: string
  imageUrl?: string | null
  businesses: Business[]
}

type MarketDetail = {
  id: number
  name: string
  imageUrl?: string | null
  groupName: string
  rubros: { id: number; name: string; categories: MarketCategory[] }[]
}

const route = useRoute()
const market = ref<MarketDetail | null>(null)
const error = ref('')
const search = ref('')

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const visibleRubros = computed(() => {
  const query = normalize(search.value.trim())
  return (market.value?.rubros || [])
    .map((rubro) => ({
      ...rubro,
      categories: rubro.categories.filter((category) => {
        if (!category.id) return false
        if (!query) return true
        return normalize(category.name).includes(query)
      }),
    }))
    .filter((rubro) => rubro.categories.length > 0)
})

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
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="market-head">
      <img v-if="market?.imageUrl" :src="market.imageUrl" :alt="market.name" />
      <h2>{{ market?.name || 'Mercado' }}</h2>
    </header>
    <label class="field seek">
      <span>Buscar categoría</span>
      <input v-model="search" type="search" placeholder="Ejemplo: postres, pollería" />
    </label>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="market && !market.rubros.length" class="empty">Este mercado todavía no tiene negocios.</p>
    <p v-else-if="market && !visibleRubros.length" class="empty">No hay categorías con ese nombre.</p>
    <section v-for="rubro in visibleRubros" :key="rubro.id" class="rubro-block">
      <header class="rubro-head">
        <h3>{{ rubro.name }}</h3>
      </header>
      <div class="cat-grid">
        <router-link
          v-for="category in rubro.categories"
          :key="category.id"
          class="cat-card"
          :to="{ name: 'market-category', params: { marketId: market!.id, categoryId: category.id } }"
        >
          <img v-if="category.imageUrl" :src="category.imageUrl" :alt="category.name" />
          <div v-else class="thumb" />
          <p>{{ category.name }}</p>
        </router-link>
      </div>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.market-head h2 {
  margin: 8px 0 12px;
  font-family: var(--font-ui);
  font-size: 24px;
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: -0.02em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.market-head img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: var(--radius-card);
  margin-bottom: 8px;
}

.seek {
  margin-bottom: 16px;
}

.empty,
.error {
  color: var(--color-muted);
  font-size: 14px;
}

.error {
  color: var(--color-brand);
  font-weight: 700;
}

.rubro-block {
  margin-bottom: 28px;
}

.rubro-head h3 {
  min-width: 0;
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: #0f172a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

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

.cat-card img,
.cat-card .thumb {
  display: block;
  width: 100%;
  height: 96px;
  object-fit: cover;
  background: #f1f5f9;
}

.cat-card p {
  margin: 0;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  color: #1e293b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
