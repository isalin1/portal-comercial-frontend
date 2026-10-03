<script setup lang="ts">
import ScreenFrame from '../components/ScreenFrame.vue'
</script>

<template>
  <ScreenFrame title="Registro" back>
    <p class="muted" style="text-align: center">Elige una opción para continuar con el registro</p>
    <div class="choice">
      <router-link :to="{ name: 'register', params: { tipo: 'cliente' } }">
        <div class="thumb" />
        <strong>Cliente</strong>
      </router-link>
      <router-link :to="{ name: 'register', params: { tipo: 'empresario' } }">
        <div class="thumb" />
        <strong>Empresario</strong>
      </router-link>
    </div>
  </ScreenFrame>
</template>
