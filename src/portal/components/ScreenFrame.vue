<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePortalAuth } from '../auth'
import { clearZone } from '../zone'

defineProps<{
  title?: string
  back?: boolean
  tinted?: boolean
  wide?: boolean
  storefront?: boolean
  bar?: boolean
}>()

const router = useRouter()
const route = useRoute()
const auth = usePortalAuth()

function goHome(event: MouseEvent) {
  if (route.name !== 'home') return
  event.preventDefault()
  clearZone()
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'home' })
}
const accountTo = computed(() => {
  if (!auth.isAuthenticated) return { name: 'welcome' }
  if (auth.userType === 'EMPRESARIO' || auth.userType === 'ADMIN') return { name: 'panel' }
  return { name: 'account' }
})

const greetingName = computed(() => {
  const raw = auth.user?.firstName?.trim()
  if (!raw) return ''
  return raw.charAt(0).toLocaleUpperCase('es-PE') + raw.slice(1).toLocaleLowerCase('es-PE')
})
</script>

<template>
  <div class="phone" :class="{ tinted, wide, storefront }">
    <header class="topbar">
      <button v-if="back" class="back" type="button" aria-label="Volver" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 6.5 8 12l6.5 5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span v-if="storefront" class="brand-mark" aria-hidden="true">V</span>
      <h1>{{ storefront ? 'Red de Negocios' : 'RED DE NEGOCIOS VALDIVIEZO' }}</h1>
      <router-link v-if="!storefront" :to="accountTo">{{ auth.isAuthenticated ? 'Cuenta' : 'Ingresar' }}</router-link>
    </header>
    <main class="body">
      <p v-if="greetingName" class="hello">Hola {{ greetingName }}</p>
      <h2 v-if="title" class="page-title">{{ title }}</h2>
      <slot />
    </main>
    <nav v-if="bar || !storefront || auth.isAuthenticated" class="tabbar">
      <router-link :to="{ name: 'home' }" @click="goHome">Inicio</router-link>
      <router-link :to="accountTo">{{ auth.isAuthenticated ? 'Mi cuenta' : 'Cuenta' }}</router-link>
    </nav>
  </div>
</template>
