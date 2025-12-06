<template>
  <div class="user-create-register-view">
    <button class="back-btn" @click="goToDashboard" aria-label="Volver al Dashboard">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="#ff7a2f" stroke-width="2" fill="none" />
      </svg>
    </button>
    <div class="logo-container">
      <div class="logo">LOGO</div>
    </div>
    <h2 class="title">Registro de Usuario</h2>
    <form class="register-form" @submit="handleSubmit">
      <label
        >Nombres
        <input v-model="firstname" type="text" placeholder="Ingresar nombres" required />
      </label>
      <label
        >Apellidos
        <input v-model="lastname" type="text" placeholder="Ingresar apellidos" required />
      </label>
      <label
        >Telefono
        <input
          v-model="phone"
          type="text"
          placeholder="Ingresar 9 dígitos"
          maxlength="9"
          required
        />
      </label>
      <label
        >DNI
        <input
          v-model="dni"
          type="text"
          placeholder="Ingresar 8 dígitos"
          maxlength="8"
          required
        />
      </label>
      <label
        >Email
        <input v-model="email" type="email" placeholder="Ejem: minegocio@gmail.com" required />
      </label>
      <label
        >Contraseña
        <input
          v-model="password"
          type="password"
          placeholder="Ingresa 6 dígitos"
          minlength="6"
          required
        />
      </label>
      <label
        >Repetir contraseña
        <input
          v-model="repeatPassword"
          type="password"
          placeholder="Escribe nuevamente la contraseña"
          minlength="6"
          required
        />
      </label>
      <div v-if="error" style="color: red; margin-bottom: 8px">{{ error }}</div>
      <button type="submit" class="submit-btn">Crear Nuevo Usuario</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerAction } from '@/modules/auth/actions/register.action'
import { Roles } from '@/modules/auth/interfaces/role.enum'
import { getAllUsers } from '@/api/lavanderiaApi'

const router = useRouter()

const firstname = ref('')
const lastname = ref('')
const phone = ref('')
const dni = ref('')
const email = ref('')
const password = ref('')
const repeatPassword = ref('')
const error = ref('')

async function handleSubmit(e: Event) {
  e.preventDefault()
  error.value = ''
  
  // Validar formato del DNI
  if (!dni.value || dni.value.length !== 8 || !/^\d+$/.test(dni.value)) {
    error.value = 'El DNI debe tener 8 dígitos numéricos'
    return
  }
  
  // Validar que el DNI sea único
  try {
    const allUsers = await getAllUsers()
    const existingUser = allUsers.find((user: any) => user.dni === dni.value)
    if (existingUser) {
      error.value = `El DNI ${dni.value} ya está registrado por: ${existingUser.firstname} ${existingUser.lastname}`
      return
    }
  } catch (error) {
    console.error('Error al validar DNI único:', error)
    error.value = 'Error al validar el DNI. Por favor, intente nuevamente.'
    return
  }
  
  if (password.value !== repeatPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }
  // Llamar a registerAction y enviar isActive: true (si el backend lo permite)
  const result = await registerAction(
    email.value,
    password.value,
    firstname.value,
    lastname.value,
    dni.value,
    Roles.COLABORADOR,
    phone.value,
    // isActive: true // Si el backend lo permite, agregar este campo en registerAction y en el backend
  )
  if (result.ok) {
    router.push({ name: 'UserAuthorization' })
  } else {
    error.value = result.message || 'Error al crear usuario'
  }
}

function goToDashboard() {
  router.push({ name: 'dashboard' })
}
</script>

<style scoped>
.user-create-register-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: #fff;
  padding: 32px 16px 0 16px;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}
.back-btn svg {
  display: block;
}
.logo-container {
  margin-top: 16px;
  margin-bottom: 24px;
}
.logo {
  background: #000;
  color: #fff;
  font-weight: bold;
  font-size: 1.5rem;
  padding: 12px 32px;
  border-radius: 4px;
  text-align: center;
}
.title {
  margin-bottom: 32px;
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
}
.register-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 350px;
}
.register-form label {
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  font-weight: 500;
  color: #222;
}
.register-form input {
  margin-top: 6px;
  padding: 10px;
  border: none;
  border-radius: 6px;
  background: #ffe5e5;
  font-size: 1rem;
  outline: none;
}
.submit-btn {
  margin-top: 16px;
  background: #ff8000;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  padding: 14px 0;
  cursor: pointer;
  transition: background 0.2s;
}
.submit-btn:hover {
  background: #ff9900;
}
</style>
