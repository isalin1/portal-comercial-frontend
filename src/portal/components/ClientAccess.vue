<script setup lang="ts">
import { usePortalAuth } from '../auth'

const auth = usePortalAuth()
</script>

<template>
  <div v-if="auth.userType === 'CLIENTE'" class="entry-actions session">
    <router-link class="btn entry" :to="{ name: 'raffles' }">Mis Sorteos</router-link>
    <router-link class="btn entry" :to="{ name: 'promos' }">Mis Promociones</router-link>
    <router-link class="btn entry" :to="{ name: 'profile' }">Mis Datos</router-link>
  </div>
  <div v-else-if="!auth.isAuthenticated" class="entry-actions">
    <router-link class="btn entry" :to="{ name: 'login', query: { tipo: 'cliente' } }">
      Cliente
    </router-link>
    <router-link class="btn entry" :to="{ name: 'login', query: { tipo: 'empresario' } }">
      Empresario
    </router-link>
  </div>
</template>
