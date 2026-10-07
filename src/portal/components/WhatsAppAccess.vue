<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { usePortalAuth } from '../auth'
import { trackWhatsAppClick } from '../track'
import { openWhatsAppChat } from '../whatsapp'

const props = withDefaults(
  defineProps<{
    href: string
    label: string
    businessId?: number
    variant?: 'wa' | 'wa-btn'
  }>(),
  { variant: 'wa' },
)

const auth = usePortalAuth()
const route = useRoute()
const showGate = ref(false)

function openGate() {
  showGate.value = true
}

function openChat(event: Event) {
  event.preventDefault()
  if (!props.href) return
  if (props.businessId) trackWhatsAppClick(props.businessId)
  openWhatsAppChat(props.href)
}
</script>

<template>
  <div class="wa-access">
    <a
      v-if="auth.isAuthenticated && href"
      :class="variant"
      :href="href"
      @click="openChat"
    >
      {{ label }}
    </a>
    <button v-else :class="variant" type="button" @click="openGate">
      {{ label }}
    </button>
    <div v-if="showGate && !auth.isAuthenticated" class="gate">
      <p>Debes registrarte para continuar y comunicarte por WhatsApp.</p>
      <router-link
        class="btn"
        :to="{ name: 'register', params: { tipo: 'cliente' }, query: { redirect: route.fullPath } }"
      >
        Registrarme
      </router-link>
      <router-link
        class="btn secondary"
        :to="{ name: 'login', query: { tipo: 'cliente', redirect: route.fullPath } }"
      >
        Iniciar sesión
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.wa-access {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wa,
.wa-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: 0;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  text-align: center;
  color: #fff;
}

.wa {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: var(--radius-control);
  background: #008352;
  font-size: 14px;
  line-height: 18px;
}

.wa-btn {
  margin-top: 0;
  padding: 8px 12px;
  border-radius: 6px;
  background: #128c7e;
  font-size: 14px;
}

.gate {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius-control);
  background: #fff5f5;
}

.gate p {
  margin: 0;
  color: var(--color-ink);
  font-size: 13px;
  line-height: 1.4;
}

.gate .btn,
.gate .btn.secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  text-decoration: none;
}
</style>
