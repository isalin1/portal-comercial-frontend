<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

const router = useRouter()
const email = ref('')
const error = ref('')
const message = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    const { data } = await http.post<{ message: string }>('/auth/recuperar-contrasena', {
      email: email.value.trim(),
    })
    message.value = data.message
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
      <h2>Recuperar contraseña</h2>
      <p class="lead">Te enviaremos un enlace a tu correo para crear una nueva contraseña.</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="message" class="ok">{{ message }}</p>
      <form v-if="!message" @submit.prevent="submit">
        <label class="field">
          <span>Correo electrónico</span>
          <input v-model="email" type="email" required autocomplete="email" placeholder="ejemplo@correo.com" />
        </label>
        <button class="btn go" type="submit" :disabled="loading">
          {{ loading ? 'Enviando…' : 'Enviar enlace' }}
        </button>
      </form>
      <p class="login-link">
        <button type="button" @click="router.push({ name: 'login' })">Volver al inicio de sesión</button>
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

.field > span {
  font-size: 12px;
  font-weight: 700;
}

.field input {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  background: #f0f3ff;
  padding: 0 14px;
  font-size: 14px;
  color: var(--color-ink);
}

.field input:focus {
  outline: 2px solid var(--color-brand);
  background: #fff;
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

.login-link button {
  border: 0;
  background: none;
  color: var(--color-brand);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}
</style>
