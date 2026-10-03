<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import type { UserType } from '../types'

const route = useRoute()
const router = useRouter()
const auth = usePortalAuth()
const tipo = computed<UserType>(() =>
  route.params.tipo === 'empresario' ? 'EMPRESARIO' : 'CLIENTE',
)
const title = computed(() =>
  tipo.value === 'EMPRESARIO' ? 'Registro de Empresario' : 'Registro de Cliente',
)

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  passwordRepeat: '',
})
const error = ref('')
const message = ref('')
const loading = ref(false)
const showPassword = ref(false)
const showRepeat = ref(false)
const salesPhone = ref('940485657')
const buying = computed(() => tipo.value === 'EMPRESARIO' && route.query.compra === '1')

function salesDigits() {
  let value = salesPhone.value.replace(/\D/g, '')
  if (value.startsWith('00')) value = value.slice(2)
  if (value.length === 9) value = `51${value}`
  return value
}

onMounted(async () => {
  if (!buying.value) return
  try {
    const { data } = await http.get<{ salesWhatsapp: string }>('/settings')
    if (data.salesWhatsapp) salesPhone.value = data.salesWhatsapp
  } catch {
    // Se usa el número inicial.
  }
})

async function submit() {
  error.value = ''
  message.value = ''
  if (form.value.password !== form.value.passwordRepeat) {
    error.value = 'Las contraseñas no coinciden'
    return
  }
  loading.value = true
  const email = form.value.email
  const password = form.value.password
  try {
    message.value = await auth.register({
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email,
      phone: form.value.phone.replace(/\D/g, ''),
      password,
      userType: tipo.value,
      ...(route.query.plan === 'free' ? { plan: 'free' } : {}),
    })
    if (tipo.value === 'CLIENTE') {
      await auth.login(email, password)
    }
    const name = `${form.value.firstName} ${form.value.lastName}`.trim()
    const plan = String(route.query.afiliacion || '').trim() || 'elegido'
    const text = `Hola, soy ${name}. Deseo comprar un Plan de Afiliacion. Por favor, confirmarme el costo del Plan ${plan} y el numero al que debo hacer el pago`
    const whatsappUrl = buying.value
      ? `https://web.whatsapp.com/send?phone=${salesDigits()}&text=${encodeURIComponent(text)}`
      : undefined
    if (tipo.value !== 'CLIENTE') {
      auth.holdAcceptance({ email, password, whatsappUrl })
    }
    await router.push({ name: 'terms', query: { next: whatsappUrl ? '' : '/' } })
    return
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back>
    <div class="client-register">
      <h2>{{ title }}</h2>
      <p class="lead">{{ tipo === 'EMPRESARIO' ? 'Completa tus datos para registrar tu negocio' : 'Completa tus datos para afiliarte gratis y acceder a todos los beneficios' }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="message" class="ok">{{ message }}</p>
      <form @submit.prevent="submit">
        <label class="reg-field">
          <span>Nombres <em>Requerido</em></span>
          <input v-model="form.firstName" required placeholder="Ingresa tus nombres" autocomplete="given-name" />
        </label>
        <label class="reg-field">
          <span>Apellidos</span>
          <input v-model="form.lastName" required placeholder="Ingresa tus apellidos" autocomplete="family-name" />
        </label>
        <label class="reg-field">
          <span>Correo</span>
          <input v-model="form.email" type="email" required placeholder="ejemplo@correo.com" autocomplete="email" />
        </label>
        <label class="reg-field">
          <span>Teléfono</span>
          <span class="dial">
            <b>+51</b>
            <input v-model="form.phone" type="tel" required maxlength="11" inputmode="numeric" placeholder="987 654 321" autocomplete="tel" />
          </span>
        </label>
        <label class="reg-field">
          <span>Contraseña</span>
          <span class="secret">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" required minlength="6" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
            <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Ver' }}</button>
          </span>
        </label>
        <label class="reg-field">
          <span>Repetir contraseña</span>
          <span class="secret">
            <input v-model="form.passwordRepeat" :type="showRepeat ? 'text' : 'password'" required minlength="6" placeholder="Confirma tu contraseña" autocomplete="new-password" />
            <button type="button" @click="showRepeat = !showRepeat">{{ showRepeat ? 'Ocultar' : 'Ver' }}</button>
          </span>
        </label>
        <p class="safe">Tus datos se usan solo para crear tu cuenta de {{ tipo === 'EMPRESARIO' ? 'empresario' : 'cliente' }}.</p>
        <button class="btn go" type="submit" :disabled="loading">{{ loading ? 'Registrando…' : 'Registrarme' }}</button>
      </form>
      <p class="login-link">
        ¿Ya tienes cuenta?
        <router-link :to="{ name: 'login', query: { tipo: tipo === 'EMPRESARIO' ? 'empresario' : 'cliente' } }">Ya tengo cuenta</router-link>
      </p>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.client-register {
  font-family: var(--font-ui);
  text-align: center;
}

.client-register h2 {
  margin: 8px 0 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.lead {
  margin: 8px auto 16px;
  max-width: 280px;
  color: #5c5e65;
  font-size: 14px;
  line-height: 20px;
}

.client-register form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.reg-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reg-field > span:first-child,
.reg-field > span:first-child em {
  font-size: 12px;
  font-weight: 700;
  font-style: normal;
}

.reg-field em {
  float: right;
  color: var(--color-brand);
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.reg-field input {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  background: #f0f3ff;
  padding: 0 14px;
  font-size: 14px;
  color: var(--color-ink);
}

.reg-field input:focus {
  outline: 2px solid var(--color-brand);
  background: #fff;
}

.dial {
  display: flex;
  align-items: center;
  height: 48px;
  border-radius: var(--radius-control);
  background: #f0f3ff;
  padding-left: 14px;
}

.dial:focus-within {
  outline: 2px solid var(--color-brand);
  background: #fff;
}

.dial b {
  flex: 0 0 auto;
  font-size: 14px;
  font-weight: 700;
}

.dial input,
.dial input:focus {
  height: 48px;
  border-radius: 0;
  background: transparent;
  outline: none;
  padding-left: 8px;
}

.secret {
  position: relative;
  display: flex;
  align-items: center;
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

.secret input {
  padding-right: 72px;
}

.safe {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-control);
  background: #e8eefd;
  font-size: 12px;
  line-height: 16px;
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
  margin: 14px 0 0;
  text-align: center;
  color: #5c5e65;
  font-size: 14px;
}

.login-link a {
  color: var(--color-brand);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
