<template>
  <div class="pointsale-colab">
    <!-- Header -->
    <div class="header">
      <button @click="goBack" class="back-button">
        <span class="arrow">←</span>
      </button>
      <h1 class="title">{{ isChangingExisting ? 'Cambiar Colaborador' : 'Registro Administrador Punto Venta' }}</h1>
    </div>

    <!-- Formulario -->
    <div class="form-container">
      <form @submit.prevent="onSubmit" class="form">
        <!-- Nombres -->
        <div class="form-group">
          <label for="firstname">Nombres</label>
          <input
            id="firstname"
            v-model="form.firstname"
            type="text"
            placeholder="Ingresar nombres"
            required
          />
        </div>

        <!-- Apellidos -->
        <div class="form-group">
          <label for="lastname">Apellidos</label>
          <input
            id="lastname"
            v-model="form.lastname"
            type="text"
            placeholder="Ingresar apellidos"
            required
          />
        </div>

        <!-- Teléfono -->
        <div class="form-group">
          <label for="phone">Teléfono</label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="Ingresar 9 dígitos"
            required
            maxlength="9"
          />
        </div>

        <!-- DNI -->
        <div class="form-group">
          <label for="dni">DNI</label>
          <input
            id="dni"
            v-model="form.dni"
            type="text"
            placeholder="Ingresar DNI"
            required
            maxlength="8"
          />
        </div>

        <!-- Email -->
        <div class="form-group">
          <label for="email">Creacion Usuario Administrador de Pto Venta Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="Ejem: minegocio@gmail.com"
            required
          />
        </div>

        <!-- Contraseña -->
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Ingresar mas de 8 dígitos"
            required
            minlength="8"
          />
        </div>

        <!-- Repetir contraseña -->
        <div class="form-group">
          <label for="confirmPassword">Repetir contraseña</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            placeholder="Escribe nuevamente la contraseña"
            required
            minlength="8"
          />
        </div>

        <!-- Botón de guardar -->
        <button type="submit" class="submit-button" :disabled="loading">
          {{ loading ? 'Guardando...' : (isChangingExisting ? 'Cambiar Colaborador' : 'Guardar') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import { createAndAssignCollaborator } from '@/api/lavanderiaApi'

const router = useRouter()
const route = useRoute()

// Estados reactivos
const loading = ref(false)
const pointSaleId = ref<number | null>(null)
const isChangingExisting = ref(false)

// Formulario
const form = ref({
  firstname: '',
  lastname: '',
  phone: '',
  dni: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// Función para regresar
function goBack() {
  router.back()
}

// Validar contraseñas
function validatePasswords(): boolean {
  if (form.value.password !== form.value.confirmPassword) {
    alert('Las contraseñas no coinciden')
    return false
  }
  if (form.value.password.length < 8) {
    alert('La contraseña debe tener al menos 8 caracteres')
    return false
  }
  return true
}

// Validar DNI
function validateDNI(): boolean {
  const dni = form.value.dni
  if (dni.length !== 8) {
    alert('El DNI debe tener 8 dígitos')
    return false
  }
  if (!/^\d+$/.test(dni)) {
    alert('El DNI debe contener solo números')
    return false
  }
  return true
}

// Validar teléfono
function validatePhone(): boolean {
  const phone = form.value.phone
  if (phone.length !== 9) {
    alert('El teléfono debe tener 9 dígitos')
    return false
  }
  if (!/^\d+$/.test(phone)) {
    alert('El teléfono debe contener solo números')
    return false
  }
  return true
}

// Enviar formulario
async function onSubmit() {
  try {
    loading.value = true

    // Validaciones
    if (!validatePasswords()) return
    if (!validateDNI()) return
    if (!validatePhone()) return

    // Preparar datos del usuario colaborador
    const userData = {
      firstname: form.value.firstname,
      lastname: form.value.lastname,
      phone: form.value.phone,
      dni: form.value.dni,
      email: form.value.email,
      password: form.value.password,
      isActive: true
    }

    // Crear y asignar colaborador automáticamente usando el nuevo endpoint
    if (pointSaleId.value) {
      const result = await createAndAssignCollaborator(pointSaleId.value, userData)
      console.log('✅ Colaborador creado y asignado automáticamente:', result)
    } else {
      throw new Error('No se recibió ID del punto de venta')
    }

    alert('Colaborador registrado y asignado exitosamente')

    // Navegar de vuelta a la presentación del negocio
    router.push({ name: 'business-presentation' })

  } catch (error) {
    console.error('❌ Error al crear colaborador:', error)
    alert('Error al registrar el colaborador')
  } finally {
    loading.value = false
  }
}

// Cargar datos al montar el componente
onMounted(() => {
  // Obtener el ID del punto de venta desde los parámetros de la URL
  const pointsaleIdParam = route.query.pointsaleId
  if (pointsaleIdParam) {
    pointSaleId.value = parseInt(pointsaleIdParam as string)
    console.log('✅ ID del punto de venta recibido:', pointSaleId.value)
  } else {
    console.warn('⚠️ No se recibió ID del punto de venta')
  }

  // Verificar si estamos cambiando un colaborador existente
  const changeExistingParam = route.query.changeExisting
  if (changeExistingParam === 'true') {
    isChangingExisting.value = true
    console.log('ℹ️ Modo: Cambiar colaborador existente')
  } else {
    isChangingExisting.value = false
    console.log('ℹ️ Modo: Crear nuevo colaborador')
  }
})
</script>

<style scoped>
.pointsale-colab {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  background: white;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-button {
  background: none;
  border: none;
  font-size: 24px;
  color: #ff6b35;
  cursor: pointer;
  margin-right: 15px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.form-container {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-group input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background-color: #fefefe;
}

.form-group input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
}

.submit-button {
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.3s;
}

.submit-button:hover:not(:disabled) {
  background-color: #e55a2b;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
