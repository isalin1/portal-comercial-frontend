<template>
  <div class="register-form-container">
    <div class="logo-box">LOGO</div>
    <h2>Registro de Usuario</h2>
    <form class="register-form" @submit.prevent="onSubmit">
      <label>Nombres</label>
      <input v-model="form.firstname" type="text" placeholder="Ingresar nombres" class="input" />

      <label>Apellidos</label>
      <input v-model="form.lastname" type="text" placeholder="Ingresar apellidos" class="input" />

      <label>Documento de Identidad</label>
      <input v-model="form.dni" type="text" placeholder="Ingresar dni" class="input" />

      <label>Telefono</label>
      <input v-model="form.phone" type="text" placeholder="Ingresar 9 dígitos" class="input" />

      <label>Email</label>
      <input
        v-model="form.email"
        type="email"
        placeholder="Ejem: minegocio@gmail.com"
        class="input"
      />

      <label>Contraseña</label>
      <input
        v-model="form.password"
        type="password"
        placeholder="Ingresa 6 dígitos"
        class="input"
      />

      <label>Repetir contraseña</label>
      <input
        v-model="form.repeatPassword"
        type="password"
        placeholder="Escribe nuevamente la contraseña"
        class="input"
      />

      <button type="submit" class="btn-register">Registrarse</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { registerAction } from '../actions/register.action'
import { Roles } from '../interfaces/role.enum'
import { useAuthStore } from '../stores/auth.store'
import { AuthStatus } from '../interfaces/auth-status.enum'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

function getRoleFromQuery(roleStr: string): Roles {
  console.log('Rol recibido en getRoleFromQuery:', roleStr) // Agregar esta línea
  console.log('Tipo de dato:', typeof roleStr)
  console.log('Longitud:', roleStr.length)
  console.log('Valor exacto:', `"${roleStr}"`)
  if (roleStr === 'ADMIN') return Roles.ADMIN
  if (roleStr === 'CLIENT') return Roles.CLIENT
  throw new Error('Rol inválido')
}

const form = ref({
  firstname: '',
  lastname: '',
  dni: '',
  phone: '',
  email: '',
  password: '',
  repeatPassword: '',
})

async function onSubmit() {
  if (form.value.password !== form.value.repeatPassword) {
    alert('Las contraseñas no coinciden')
    return
  }
  if (!/^\d{8}$/.test(form.value.dni)) {
    alert('El DNI debe tener exactamente 8 dígitos')
    return
  }
  if (!/^\d{9}$/.test(form.value.phone)) {
    alert('El teléfono debe tener exactamente 9 dígitos')
    return
  }
  try {
    console.log('Rol recibido en query:', route.query.role) // Agregar esta línea
    const role = getRoleFromQuery(route.query.role as string)
    console.log('Datos enviados al backend:', {
      email: form.value.email,
      password: form.value.password,
      firstname: form.value.firstname,
      lastname: form.value.lastname,
      dni: form.value.dni,
      phone: form.value.phone,
      role,
    })
    const result = await registerAction(
      form.value.email,
      form.value.password,
      form.value.firstname,
      form.value.lastname,
      form.value.dni,
      role,
      form.value.phone,
    )
    console.log('Respuesta de registerAction:', result)
    if (result.ok) {
      // Verificar si el usuario está activo
      if (result.user.isActive) {
        // Usuario activo (SUPERADMIN) - hacer login automático
        authStore.user = result.user
        authStore.token = result.token
        authStore.authStatus = AuthStatus.Authenticated
        alert(`¡Bienvenido, ${result.user.firstname}! Tu registro fue exitoso.`)
        router.push({ name: 'dashboard' })
      } else {
        // Usuario inactivo (ADMIN) - mostrar mensaje y redirigir a login
        alert(`¡Registro exitoso, ${result.user.firstname}! Tu cuenta está pendiente de activación. Por favor, contacta al administrador para activar tu cuenta.`)
        router.push({ name: 'auth-presentation' })
      }
    } else {
      alert(result.message)
    }
  } catch (e) {
    console.error('Error en el registro:', e)
    alert('Error en el registro')
  }
}
</script>

<style scoped>
.register-form-container {
  border-radius: 0.5rem;
  padding: 2rem 1rem 1.5rem 1rem;
  max-width: 350px;
  margin: 2rem auto;
  min-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* box-shadow: 0 0 0 4px #222; */
  /* background: #fff; */
}
.logo-box {
  background: #000;
  color: #fff;
  font-weight: 500;
  font-size: 1.2rem;
  padding: 0.5rem 2.5rem;
  border-radius: 4px;
  margin-bottom: 2rem;
  text-align: center;
}
h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
}
.register-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
label {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.2rem;
}
.input {
  width: 100%;
  padding: 0.7rem;
  border: none;
  border-radius: 6px;
  background: #ffe5e5;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  outline: none;
}
.btn-register {
  width: 100%;
  padding: 0.8rem 0;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  background: #ff7a2f;
  color: #fff;
  font-weight: 600;
  margin-top: 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-register:hover {
  background: #ff944d;
}
</style>
