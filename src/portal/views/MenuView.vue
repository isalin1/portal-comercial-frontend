<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { Business, Item } from '../types'
import { zoneParams } from '../zone'

const route = useRoute()
const business = ref<Business | null>(null)
const error = ref('')

async function load() {
  error.value = ''
  try {
    const { data } = await http.get<Business>(`/public/businesses/${route.params.id}`, { params: zoneParams() })
    business.value = data
  } catch (err) {
    error.value = apiError(err)
  }
}

onMounted(load)
watch(() => route.params.id, load)

const items = computed(() => {
  const list: Item[] = []
  for (const point of business.value?.pointSales || []) {
    for (const item of point.items || []) list.push(item)
  }
  return list
})

function money(price: string | number) {
  return `S/ ${Number(price).toFixed(2)}`
}
</script>

<template>
  <ScreenFrame :title="business ? `Carta · ${business.commercialName}` : 'Carta'" back>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!items.length" class="muted">Este negocio no tiene ítems publicados.</p>
    <article v-for="item in items" :key="item.id" class="card">
      <h3>{{ item.name }}</h3>
      <p class="muted">{{ item.category?.name }}</p>
      <div v-for="line in item.descriptions" :key="line.id || line.description" class="row">
        <span>{{ line.description }}</span>
        <span class="price">{{ line.price == null ? 'Sin precio' : money(line.price) }}</span>
      </div>
    </article>
  </ScreenFrame>
</template>
