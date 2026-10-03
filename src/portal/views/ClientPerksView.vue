<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'

const route = useRoute()
const title = computed(() => (route.name === 'raffles' ? 'Mis Sorteos' : 'Mis Promociones'))
const detail = computed(() =>
  route.name === 'raffles'
    ? 'Tus sorteos mensuales aparecerán aquí.'
    : 'Tus promociones y ofertas aparecerán aquí.',
)
</script>

<template>
  <ScreenFrame :title="title" back>
    <p class="muted">{{ detail }}</p>
  </ScreenFrame>
</template>
