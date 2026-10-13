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
  /** En desktop, ensancha el marco sin afectar el layout móvil de 390px. */
  fluid?: boolean
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
  if (route.name === 'businesses' && (auth.userType === 'EMPRESARIO' || auth.userType === 'ADMIN')) {
    router.push({ name: 'panel' })
    return
  }
  if (window.history.state?.back) router.back()
  else if (auth.userType === 'EMPRESARIO' || auth.userType === 'ADMIN') router.push({ name: 'panel' })
  else router.push({ name: 'home' })
}
const accountTo = computed(() => {
  if (auth.userType === 'EMPRESARIO' || auth.userType === 'ADMIN') return { name: 'panel' }
  return { name: 'account' }
})

const loginTo = computed(() => ({ name: 'login', query: { tipo: 'cliente' } }))

const greetingName = computed(() => {
  const raw = auth.user?.firstName?.trim()
  if (!raw) return ''
  return raw.charAt(0).toLocaleUpperCase('es-PE') + raw.slice(1).toLocaleLowerCase('es-PE')
})

</script>

<template>
  <div class="phone" :class="{ tinted, wide, storefront, fluid }">
    <header class="topbar topbar--brand">
      <button v-if="back" class="back" type="button" aria-label="Volver" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 6.5 8 12l6.5 5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="brand" aria-label="Ventalinks · Red de negocios locales">
        <svg class="brand-pin" viewBox="0 0 92 106" aria-hidden="true">
          <defs>
            <linearGradient id="brandPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#E21221" />
              <stop offset="100%" stop-color="#991B1B" />
            </linearGradient>
          </defs>
          <path
            d="M46 8 C28 8, 14 22, 14 40 C14 62, 42 94, 46 98 C50 94, 78 62, 78 40 C78 22, 64 8, 46 8 Z"
            fill="url(#brandPinGrad)"
          />
          <circle cx="46" cy="40" r="23" fill="#FFFFFF" />
          <path
            d="M28 30 L35.5 49 C36 50.2, 37.5 50.2, 38 49 L45.5 30"
            fill="none"
            stroke="#0F172A"
            stroke-width="4.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M49 28 V49 H60"
            fill="none"
            stroke="#E21221"
            stroke-width="4.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <div class="brand-copy">
          <p class="brand-name">VENTA<span>LINKS</span></p>
          <p class="brand-tag">Red de negocios locales<span class="brand-dot" aria-hidden="true" /></p>
        </div>
      </div>
      <router-link v-if="!storefront && auth.isAuthenticated" :to="accountTo">Cuenta</router-link>
      <router-link v-else-if="!storefront" :to="loginTo">Ingresar</router-link>
    </header>
    <main class="body">
      <p v-if="greetingName" class="hello">Hola {{ greetingName }}</p>
      <h2 v-if="title" class="page-title">{{ title }}</h2>
      <slot />
    </main>
    <nav v-if="bar || !storefront || auth.isAuthenticated" class="tabbar">
      <router-link :to="{ name: 'home' }" @click="goHome">Inicio</router-link>
      <router-link v-if="auth.isAuthenticated" :to="accountTo">Mi cuenta</router-link>
    </nav>
  </div>
</template>
