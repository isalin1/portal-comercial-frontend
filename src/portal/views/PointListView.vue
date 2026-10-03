<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import type { PointSale } from '../types'

const auth = usePortalAuth()
const points = ref<PointSale[]>([])
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await http.get<PointSale[]>('/point-sales')
    points.value = data
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame title="Puntos de venta" back>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!points.length" class="muted">No hay puntos de venta. Primero registra un negocio.</p>
    <div class="stack">
      <router-link
        v-for="point in points"
        :key="point.id"
        class="card"
        :to="{ name: 'point-edit', params: { id: point.id } }"
      >
        <h3>{{ point.name }}</h3>
        <p class="muted">{{ point.business?.commercialName }}</p>
        <p class="muted">{{ point.address?.street }} · {{ point.phone }}</p>
        <p v-if="point.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
        <p v-if="point.rejected" class="error">Rechazado</p>
      </router-link>
    </div>
    <router-link v-if="auth.userType === 'EMPRESARIO'" class="btn" style="display: block; text-align: center; text-decoration: none" :to="{ name: 'point-form' }">
      Registrar punto de venta
    </router-link>
  </ScreenFrame>
</template>
