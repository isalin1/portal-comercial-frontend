<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

const route = useRoute()
const router = useRouter()
const password = ref('')
const passwordRepeat = ref('')
const showPassword = ref(false)
const showRepeat = ref(false)
const error = ref('')
const message = ref('')
const loading = ref(false)

const token = computed(() => String(route.query.token || '').trim())

async function submit() {
  error.value = ''
  message.value = ''
  if (!token.value) {
    error.value = 'El enlace no es válido. Solicita uno nuevo.'
    return
  }
  if (password.value !== passwordRepeat.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }
  loading.value = true
  try {
    const { data } = await http.post<{ message: string }>('/auth/restablecer-contrasena', {
      token: token.value,
      password: password.value,
    })
    message.value = data.message
    window.setTimeout(() => {
      router.replace({ name: 'login' })
    }, 1600)
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back>
    <div class="wrap">
      <h2>Nueva contraseña</h2>
      <p class="lead">Elige una contraseña de al menos 6 caracteres.</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="message" class="ok">{{ message }}</p>
      <form v-if="!message" @submit.prevent="submit">
        <label class="field">
          <span>Nueva contraseña</span>
          <span class="secret">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="6"
              autocomplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
            <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Ver' }}</button>
          </span>
        </label>
        <label class="field">
          <span>Repetir contraseña</span>
          <span class="secret">
            <input
              v-model="passwordRepeat"
              :type="showRepeat ? 'text' : 'password'"
              required
              minlength="6"
              autocomplete="new-password"
              placeholder="Confirma tu contraseña"
            />
            <button type="button" @click="showRepeat = !showRepeat">{{ showRepeat ? 'Ocultar' : 'Ver' }}</button>
          </span>
        </label>
        <button class="btn go" type="submit" :disabled="loading || !token">
          {{ loading ? 'Guardando…' : 'Guardar contraseña' }}
        </button>
      </form>
      <p class="login-link">
        <router-link :to="{ name: 'login' }">Ir a iniciar sesión</router-link>
      </p>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.wrap {
  font-family: var(--font-ui);
  text-align: center;
}

h2 {
  margin: 8px 0 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
}

.lead {
  margin: 8px auto 16px;
  max-width: 300px;
  color: #5c5e65;
  font-size: 14px;
  line-height: 20px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field > span:first-child {
  font-size: 12px;
  font-weight: 700;
}

.secret {
  position: relative;
  display: flex;
  align-items: center;
}

.secret input {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  background: #f0f3ff;
  padding: 0 72px 0 14px;
  font-size: 14px;
  color: var(--color-ink);
}

.secret input:focus {
  outline: 2px solid var(--color-brand);
  background: #fff;
}

.secret button {
  position: absolute;
  right: 8px;
  height: 32px;
  border: 0;
  background: transparent;
  color: #5c5e65;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn.go {
  height: 48px;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 4px 14px -3px rgba(226, 18, 33, 0.35);
}

.login-link {
  margin: 16px 0 0;
}

.login-link a {
  color: var(--color-brand);
  font-size: 14px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
