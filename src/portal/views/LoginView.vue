<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError } from '../api'
import { needsTerms, safeNext, usePortalAuth } from '../auth'
import type { UserType } from '../types'

const auth = usePortalAuth()
const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref('')
const note = ref('')
const loading = ref(false)

const tipo = computed(() => (route.query.tipo === 'empresario' ? 'empresario' : route.query.tipo === 'cliente' ? 'cliente' : ''))
const role = computed(() => (tipo.value === 'empresario' ? 'empresario' : 'cliente'))
const showPassword = ref(false)

const storedNote = sessionStorage.getItem('portal_login_note')
if (storedNote) {
  note.value = storedNote
  sessionStorage.removeItem('portal_login_note')
}

const registerTo = computed(() =>
  role.value === 'empresario' ? { name: 'empresario-benefits' } : { name: 'client-benefits' },
)

function choose(next: 'cliente' | 'empresario') {
  router.replace({ name: 'login', query: { ...route.query, tipo: next } })
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const user = await auth.login(email.value, password.value)
    if (user.userType !== 'ADMIN' && tipo.value === 'cliente' && user.userType !== 'CLIENTE') {
      auth.logout()
      error.value = 'Esta entrada es para clientes. Usa el botón Empresario.'
      return
    }
    if (user.userType !== 'ADMIN' && tipo.value === 'empresario' && user.userType === 'CLIENTE') {
      auth.logout()
      error.value = 'Esta entrada es para empresarios. Usa el botón Cliente.'
      return
    }
    const redirect = safeNext(route.query.redirect)
    const next = redirect || (user.userType === 'CLIENTE' ? '/' : '/panel')
    if (needsTerms(user)) {
      await router.push({ name: 'terms', query: { next } })
      return
    }
    if (redirect) {
      await router.push(redirect)
      return
    }
    if (user.userType === 'CLIENTE') {
      await router.push({ name: 'home' })
      return
    }
    await router.push(auth.homeFor(user.userType as UserType))
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back fluid>
    <div class="role-switch" role="tablist">
      <button :class="{ on: role === 'cliente' }" type="button" role="tab" :aria-selected="role === 'cliente'" @click="choose('cliente')">
        Cliente
      </button>
      <button :class="{ on: role === 'empresario' }" type="button" role="tab" :aria-selected="role === 'empresario'" @click="choose('empresario')">
        Empresario
      </button>
    </div>
    <div class="login-lead">
      <p class="badge">Bienvenido de vuelta</p>
      <h2>Iniciar sesión</h2>
      <p v-if="role === 'cliente'">Accede para descubrir comercios y hacer pedidos en tu zona</p>
      <p v-else>Accede para publicar tu negocio y atender a tus clientes</p>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="note" class="note">{{ note }}</p>
    <form class="login-form" @submit.prevent="submit">
      <label class="login-field">
        <span>Correo electrónico</span>
        <input v-model="email" type="email" required autocomplete="username" placeholder="ejemplo@correo.com" />
      </label>
      <label class="login-field">
        <span>Contraseña</span>
        <span class="pass-wrap">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" required minlength="6" autocomplete="current-password" placeholder="••••••••" />
          <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Ver' }}</button>
        </span>
      </label>
      <button class="btn enter" type="submit" :disabled="loading">{{ loading ? 'Ingresando…' : 'Ingresar' }}</button>
      <p class="forgot">
        <router-link :to="{ name: 'forgot-password' }">¿Olvidaste tu contraseña?</router-link>
      </p>
    </form>
    <section class="register-card">
      <p>¿No tienes una cuenta aún?</p>
      <router-link :to="registerTo">Registrarme como {{ role === 'empresario' ? 'Empresario' : 'Cliente' }}</router-link>
    </section>
    <p class="signature">Encuentra todo lo que se ofrece en un solo lugar</p>
  </ScreenFrame>
</template>

<style scoped>
.role-switch {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin: 4px auto 18px;
  max-width: 280px;
  background: #e2e8f7;
  border-radius: 999px;
}

.role-switch button {
  flex: 1;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #5c5e65;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 10px;
  cursor: pointer;
}

.role-switch button.on {
  background: var(--color-brand);
  color: #fff;
  box-shadow: 0 1px 2px rgba(226, 18, 33, 0.25);
}

.login-lead {
  text-align: center;
  margin-bottom: 18px;
}

.badge {
  display: inline-flex;
  margin: 0 0 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #ffdad6;
  color: #93000e;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.login-lead h2 {
  margin: 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.login-lead p:last-child {
  margin: 6px auto 0;
  max-width: 280px;
  color: #5c5e65;
  font-size: 14px;
  line-height: 20px;
}

.note {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--radius-control);
  background: #fff5f5;
  border: 1px solid #fecaca;
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login-field > span:first-child {
  font-size: 12px;
  font-weight: 700;
}

.login-field input {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  background: #f0f3ff;
  padding: 0 14px;
  font-size: 14px;
  color: var(--color-ink);
}

.login-field input:focus {
  outline: 2px solid var(--color-brand);
  background: #fff;
}

.pass-wrap {
  position: relative;
  display: block;
}

.pass-wrap input {
  padding-right: 72px;
}

.pass-wrap button {
  position: absolute;
  top: 8px;
  right: 8px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #5c5e65;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn.enter {
  height: 48px;
  margin-top: 4px;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 4px 14px -3px rgba(226, 18, 33, 0.35);
}

.forgot {
  margin: 4px 0 0;
  text-align: center;
}

.forgot a {
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.register-card {
  margin-top: 18px;
  padding: 14px;
  border-radius: var(--radius-card);
  background: #e8eefd;
  text-align: center;
}

.register-card p {
  margin: 0 0 8px;
  font-size: 12px;
  color: #5e3f3c;
}

.register-card a {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  border-radius: 12px;
  background: #fff;
  color: var(--color-brand);
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(31, 34, 40, 0.06);
}

.signature {
  margin: 22px 0 0;
  text-align: center;
  color: #5c5e65;
  font-size: 12px;
}

@media (min-width: 1024px) {
  .role-switch {
    max-width: 340px;
    margin: 8px auto 28px;
  }

  .role-switch button {
    font-size: 14px;
    padding: 10px 14px;
  }

  .login-lead {
    margin-bottom: 24px;
  }

  .badge {
    font-size: 11px;
    padding: 5px 12px;
  }

  .login-lead h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .login-lead p:last-child {
    max-width: 420px;
    font-size: 15px;
    line-height: 22px;
  }

  .note,
  .error,
  .login-form,
  .register-card {
    max-width: 440px;
    margin-left: auto;
    margin-right: auto;
  }

  .login-form {
    gap: 14px;
  }

  .login-field > span:first-child {
    font-size: 13px;
  }

  .login-field input {
    font-size: 15px;
  }

  .btn.enter {
    height: 52px;
    font-size: 17px;
  }

  .forgot a {
    font-size: 14px;
  }

  .register-card {
    margin-top: 24px;
    padding: 18px;
  }

  .register-card p {
    font-size: 13px;
  }

  .register-card a {
    min-height: 48px;
    font-size: 15px;
  }

  .signature {
    margin-top: 28px;
    font-size: 13px;
  }
}
</style>
