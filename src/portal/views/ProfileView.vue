<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import type { AccountUser } from '../types'

const auth = usePortalAuth()
const router = useRouter()
const error = ref('')
const saving = ref(false)
const showPassword = ref(false)
const isClient = computed(() => auth.userType === 'CLIENTE')
const form = ref({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
})

onMounted(async () => {
  if (!auth.user) return
  try {
    const { data } = await http.get<AccountUser>(`/user/${auth.user.id}`)
    form.value = {
      firstName: data.datUser.firstName,
      lastName: data.datUser.lastName,
      phone: data.datUser.phone,
      email: data.datUser.email,
      password: '',
    }
  } catch (err) {
    error.value = apiError(err)
  }
})

async function save() {
  if (!auth.user) return
  if (!form.value.firstName.trim() || !form.value.lastName.trim() || !form.value.phone.trim() || !form.value.email.trim()) {
    error.value = 'Completa nombres, apellidos, celular y email'
    return
  }
  if (form.value.password && form.value.password.length < 6) {
    error.value = 'La contraseña nueva debe tener al menos 6 caracteres'
    return
  }
  error.value = ''
  saving.value = true
  try {
    const payload: Record<string, string> = {
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      phone: form.value.phone.trim(),
      email: form.value.email.trim(),
    }
    if (form.value.password) payload.password = form.value.password
    const { data } = await http.patch<AccountUser>(`/user/${auth.user.id}`, payload)
    auth.setUser({
      id: data.id,
      email: data.datUser.email,
      firstName: data.datUser.firstName,
      lastName: data.datUser.lastName,
      phone: data.datUser.phone,
      userType: data.datUser.userType,
      isActive: data.isActive,
      termsAccepted: Boolean(data.termsAcceptedAt),
    })
    await router.push(isClient.value ? { name: 'account' } : { name: 'panel' })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <h2>Mis datos</h2>
      <p>Actualiza tu información personal de contacto y acceso</p>
    </header>
    <form class="sheet" @submit.prevent="save">
      <p v-if="error" class="error">{{ error }}</p>
      <label class="field"><span>Nombres</span><input v-model="form.firstName" required placeholder="Ingresa tus nombres" /></label>
      <label class="field"><span>Apellidos</span><input v-model="form.lastName" required placeholder="Ingresa tus apellidos" /></label>
      <label class="field"><span>Celular</span><input v-model="form.phone" required type="tel" inputmode="numeric" placeholder="Número de celular" /></label>
      <label class="field"><span>Email</span><input v-model="form.email" type="email" required placeholder="tu@correo.com" /></label>
      <label class="field secret">
        <span>Nueva contraseña</span>
        <input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          minlength="6"
          placeholder="Dejar en blanco para no cambiarla"
          autocomplete="new-password"
        />
        <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Ver' }}</button>
      </label>
      <button class="btn" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Registrar' }}</button>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 18px;
  text-align: center;
  font-family: var(--font-ui);
}

.head h2 {
  margin: 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.sheet .field span {
  font-size: 12px;
  font-weight: 600;
}

.sheet .field input {
  border: 1px solid #fecdd3;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.secret {
  position: relative;
}

.secret input {
  padding-right: 72px;
}

.secret button {
  position: absolute;
  right: 10px;
  bottom: 10px;
  border: 0;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.sheet .btn {
  min-height: 48px;
  margin-top: 16px;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
