<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import type { AccountUser } from '../types'

const auth = usePortalAuth()
const error = ref('')
const notice = ref('')
const saving = ref(false)
const showCurrent = ref(false)
const showNext = ref(false)
const emailVerified = ref(true)
const form = ref({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  currentPassword: '',
  newPassword: '',
})

onMounted(async () => {
  if (!auth.user) return
  try {
    const { data } = await http.get<AccountUser>(`/user/${auth.user.id}`)
    form.value.firstName = data.datUser.firstName
    form.value.lastName = data.datUser.lastName
    form.value.phone = data.datUser.phone
    form.value.email = data.datUser.email
    emailVerified.value = Boolean(data.emailVerifiedAt)
  } catch (err) {
    error.value = apiError(err)
  }
})

async function save() {
  error.value = ''
  notice.value = ''
  if (!form.value.currentPassword || form.value.currentPassword.length < 6) {
    error.value = 'Escribe la contraseña actual para guardar'
    return
  }
  if (form.value.newPassword && form.value.newPassword.length < 6) {
    error.value = 'La contraseña nueva debe tener al menos 6 caracteres'
    return
  }
  saving.value = true
  try {
    const payload: Record<string, string> = {
      currentPassword: form.value.currentPassword,
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      phone: form.value.phone.trim(),
      email: form.value.email.trim(),
    }
    if (form.value.newPassword) payload.newPassword = form.value.newPassword
    const { data } = await http.patch<{
      user: AccountUser
      requiresEmailVerification: boolean
      message: string
    }>('/auth/credenciales', payload)
    auth.setUser({
      id: data.user.id,
      email: data.user.datUser.email,
      firstName: data.user.datUser.firstName,
      lastName: data.user.datUser.lastName,
      phone: data.user.datUser.phone,
      userType: data.user.datUser.userType,
      isActive: data.user.isActive,
      termsAccepted: Boolean(data.user.termsAcceptedAt),
    })
    form.value.email = data.user.datUser.email
    emailVerified.value = Boolean(data.user.emailVerifiedAt)
    form.value.currentPassword = ''
    form.value.newPassword = ''
    notice.value = data.message
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Credenciales</h2>
      <p>Usuario, contraseña y datos del administrador. Si cambias el correo, tienes que abrirlo y confirmar el enlace.</p>
    </header>
    <p v-if="!emailVerified" class="pending">Este correo todavía no está confirmado. Revisa la bandeja o solicita un nuevo enlace desde el inicio de sesión.</p>
    <form class="sheet" @submit.prevent="save">
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="notice" class="ok">{{ notice }}</p>
      <label class="field">
        <span>Nombres</span>
        <input v-model="form.firstName" required placeholder="Nombres" />
      </label>
      <label class="field">
        <span>Apellidos</span>
        <input v-model="form.lastName" required placeholder="Apellidos" />
      </label>
      <label class="field">
        <span>Celular</span>
        <input v-model="form.phone" required type="tel" inputmode="numeric" placeholder="Celular" />
      </label>
      <label class="field">
        <span>Usuario (correo)</span>
        <input v-model="form.email" type="email" required autocomplete="username" placeholder="correo@dominio.com" />
      </label>
      <label class="field secret">
        <span>Contraseña actual</span>
        <input
          v-model="form.currentPassword"
          :type="showCurrent ? 'text' : 'password'"
          required
          minlength="6"
          autocomplete="current-password"
          placeholder="Necesaria para guardar"
        />
        <button type="button" @click="showCurrent = !showCurrent">{{ showCurrent ? 'Ocultar' : 'Ver' }}</button>
      </label>
      <label class="field secret">
        <span>Nueva contraseña</span>
        <input
          v-model="form.newPassword"
          :type="showNext ? 'text' : 'password'"
          minlength="6"
          autocomplete="new-password"
          placeholder="En blanco si no cambia"
        />
        <button type="button" @click="showNext = !showNext">{{ showNext ? 'Ocultar' : 'Ver' }}</button>
      </label>
      <p class="hint">El usuario es el correo con el que entras. Al cambiarlo llega un enlace a esa bandeja. La sesión de ahora sigue abierta; el próximo ingreso espera esa confirmación.</p>
      <button class="btn" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 14px; text-align: center; }
.head h2 { margin: 0; font-size: 22px; line-height: 28px; font-weight: 800; letter-spacing: -0.02em; }
.head p { margin: 6px auto 0; max-width: 340px; color: var(--color-muted); font-size: 13px; line-height: 18px; }
.error { margin: 0 0 10px; color: var(--color-brand); font-size: 13px; font-weight: 700; }
.ok { margin: 0 0 10px; color: #006740; font-size: 13px; font-weight: 700; line-height: 18px; }
.pending { margin: 0 0 12px; color: #b45309; font-size: 13px; font-weight: 700; line-height: 18px; }
.sheet { display: flex; flex-direction: column; gap: 10px; }
.sheet .field { margin: 0; }
.sheet .field span { font-size: 12px; font-weight: 700; }
.sheet .field input {
  min-height: 44px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: #fff;
  font: inherit;
  font-weight: 600;
}
.secret { position: relative; }
.secret input { padding-right: 72px; }
.secret button {
  position: absolute;
  right: 10px;
  bottom: 12px;
  border: 0;
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.hint { margin: 0; color: var(--color-muted); font-size: 12px; line-height: 16px; }
.sheet .btn {
  height: 48px;
  margin-top: 4px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.sheet .btn:disabled { opacity: 0.7; cursor: default; }

@media (min-width: 1024px) {
  .sheet { max-width: 560px; margin: 0 auto; }
  .head h2 { font-size: 28px; }
  .head p { max-width: 520px; font-size: 15px; line-height: 22px; }
}
</style>
