<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { safeNext, usePortalAuth } from '../auth'

const auth = usePortalAuth()
const route = useRoute()
const router = useRouter()
const accepted = ref(false)
const error = ref('')
const saving = ref(false)
const pending = computed(() => auth.peekAcceptance())
const canSend = computed(() => auth.isAuthenticated || Boolean(pending.value?.email && pending.value.password))

function decline() {
  auth.clearAcceptance()
  auth.logout()
  return router.replace({ name: 'home' })
}

async function continueFlow() {
  error.value = ''
  if (!accepted.value) {
    return decline()
  }
  if (!canSend.value) {
    error.value = 'Inicia sesión para registrar tu autorización'
    return
  }
  saving.value = true
  try {
    if (auth.isAuthenticated && auth.user) {
      await http.post('/auth/terminos', { accepted: true })
      auth.setUser({ ...auth.user, termsAccepted: true })
    } else if (pending.value) {
      await http.post('/auth/terminos-registro', {
        email: pending.value.email,
        password: pending.value.password,
        accepted: true,
      })
    }
    const whatsappUrl = pending.value?.whatsappUrl
    auth.clearAcceptance()
    if (whatsappUrl) {
      window.location.assign(whatsappUrl)
      return
    }
    const next = safeNext(route.query.next)
    if (auth.isAuthenticated) {
      await router.replace(next || auth.homeFor(auth.userType))
      return
    }
    await router.replace(next ? next : { name: 'home' })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront>
    <header class="head">
      <h2>Términos y condiciones</h2>
      <p>Autorización de uso de tu información</p>
    </header>
    <article class="sheet">
      <header>
        <h3>Uso de tu información</h3>
        <span>Una sola vez</span>
      </header>
      <p>Para usar una cuenta de cliente o empresario debes autorizar el uso de tu información.</p>
      <p>Usamos nombres, correo y celular para identificarte y contactarte. Si eres empresario, también los datos del negocio para publicarlo y atender pedidos o citas. Si eres cliente, para registrar tus pedidos y mostrarte los comercios de tu zona.</p>
      <p class="note">Si no autorizas, vuelves a la información pública. La cuenta queda sin uso hasta que aceptes.</p>
      <label class="check">
        <input v-model="accepted" type="checkbox" />
        <span>Autorizo el uso de mi información de acuerdo con estos términos y condiciones</span>
      </label>
    </article>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!canSend" class="hint">
      Inicia sesión para registrar tu autorización.
      <router-link :to="{ name: 'login' }">Ingresar</router-link>
    </p>
    <button class="go" type="button" :disabled="saving || !canSend" @click="continueFlow">
      {{ saving ? 'Guardando…' : 'Continuar' }}
    </button>
    <button class="leave" type="button" :disabled="saving" @click="decline">No acepto</button>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 14px;
  text-align: center;
  font-family: var(--font-ui);
}

.head h2 {
  margin: 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.head p,
.hint {
  margin: 6px 0 0;
  color: #5c5e65;
  font-size: 13px;
  line-height: 18px;
}

.sheet {
  margin-bottom: 14px;
  padding: 14px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.sheet header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-line);
}

.sheet h3 {
  margin: 0;
  color: var(--color-ink);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sheet header span {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-brand-soft);
  color: var(--color-brand);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sheet p {
  margin: 0 0 10px;
  color: var(--color-ink);
  font-size: 14px;
  line-height: 20px;
}

.note {
  margin-bottom: 0;
  color: #5c5e65;
  font-size: 13px;
  line-height: 18px;
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-line);
  cursor: pointer;
}

.check input {
  appearance: none;
  flex: none;
  width: 18px;
  height: 18px;
  margin: 1px 0 0;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
}

.check input:checked {
  border-color: var(--color-brand);
  background: var(--color-brand);
}

.check input:checked::after {
  content: '';
  display: block;
  width: 4px;
  height: 8px;
  margin: 1px 0 0 5px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.check span {
  color: #334155;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
}

.hint {
  margin-bottom: 12px;
}

.hint a {
  color: var(--color-brand);
  font-weight: 700;
}

.go,
.leave {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.go {
  background: var(--color-brand);
  color: #fff;
}

.leave {
  margin-top: 10px;
  background: #d1d5db;
  color: var(--color-ink);
}

.go:disabled,
.leave:disabled {
  opacity: 0.55;
}
</style>
