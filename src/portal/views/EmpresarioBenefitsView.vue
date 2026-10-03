<script setup lang="ts">
import ScreenFrame from '../components/ScreenFrame.vue'

const benefits = [
  'Te encuentran de día y de noche',
  'Todos los días del año',
  'Tu negocio visible',
  'Comunidad de negocios',
]
</script>

<template>
  <ScreenFrame title="Empresario" back>
    <p style="text-align: center; font-weight: 700">
      Tus clientes te encontrarán las 24 horas del día, todos los días del año
    </p>
    <div class="benefit-grid">
      <article v-for="benefit in benefits" :key="benefit" class="benefit-card">
        <strong>{{ benefit }}</strong>
        <span>OK</span>
      </article>
    </div>
    <router-link class="btn" style="display: block; width: fit-content; margin: 8px auto 0; text-align: center; text-decoration: none" :to="{ name: 'empresario-plans' }">
      Continuar
    </router-link>
  </ScreenFrame>
</template>
