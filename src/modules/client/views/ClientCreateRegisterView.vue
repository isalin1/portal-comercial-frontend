<template>
  <div class="client-register-container">
    <!-- Header -->
        <header class="client-register-header">
          <button class="back-button" @click="goBack" title="Volver">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
            </svg>
          </button>
          <h1 class="title">Registro de Cliente</h1>
          <button class="debug-button" @click="clearAuthState" title="Limpiar Auth (Debug)">
            🧹
          </button>
        </header>

    <!-- Formulario de Registro -->
    <div class="form-container">
      <form @submit.prevent="handleSubmit" class="register-form">
        <!-- Primera fila: Nombres y Apellidos -->
        <div class="form-row">
          <div class="form-group">
            <label for="firstname" class="form-label">Nombres</label>
            <input
              id="firstname"
              v-model="form.firstname"
              type="text"
              class="form-input"
              placeholder="Ingresar nombres"
              required
            />
          </div>
          <div class="form-group">
            <label for="lastname" class="form-label">Apellidos</label>
            <input
              id="lastname"
              v-model="form.lastname"
              type="text"
              class="form-input"
              placeholder="Ingresar apellidos"
              required
            />
          </div>
        </div>

        <!-- Segunda fila: Teléfono y DNI -->
        <div class="form-row">
          <div class="form-group">
            <label for="phone" class="form-label">Teléfono</label>
            <input
              id="phone"
              v-model="form.phone"
              type="tel"
              class="form-input"
              placeholder="Ingresar 9 dígitos"
              maxlength="9"
              pattern="[0-9]{9}"
              required
            />
          </div>
          <div class="form-group">
            <label for="dni" class="form-label">DNI</label>
            <input
              id="dni"
              v-model="form.dni"
              type="text"
              class="form-input"
              placeholder="Ingresar 8 dígitos"
              maxlength="8"
              pattern="[0-9]{8}"
              required
            />
          </div>
        </div>

        <!-- Tercera fila: Departamento y Provincia -->
        <div class="form-row">
          <div class="form-group">
            <label for="department" class="form-label">Departamento</label>
            <select
              id="department"
              v-model="form.department"
              class="form-input"
              @change="onDepartmentChange"
            >
              <option value="">Elige Depart</option>
              <option 
                v-for="dept in departments" 
                :key="dept.id" 
                :value="dept.id"
              >
                {{ dept.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="province" class="form-label">Provincia</label>
            <select
              id="province"
              v-model="form.province"
              class="form-input"
              :disabled="!form.department"
              @change="onProvinceChange"
            >
              <option value="">Elige Prov</option>
              <option 
                v-for="prov in provinces" 
                :key="prov.id" 
                :value="prov.id"
              >
                {{ prov.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Cuarta fila: Distrito (ancho completo) -->
        <div class="form-group">
          <label for="district" class="form-label">Distrito</label>
          <select
            id="district"
            v-model="form.district"
            class="form-input"
            :disabled="!form.province"
          >
            <option value="">Elige Distr</option>
            <option 
              v-for="dist in districts" 
              :key="dist.id" 
              :value="dist.id"
            >
              {{ dist.name }}
            </option>
          </select>
        </div>

        <!-- Quinta fila: Dirección (ancho completo) -->
        <div class="form-group">
          <label for="address" class="form-label">Dirección</label>
          <input
            id="address"
            v-model="form.address"
            type="text"
            class="form-input"
            placeholder="Escribe tu direccion"
            required
          />
        </div>

        <!-- Sexta fila: Email (ancho completo) -->
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="form-input"
            placeholder="Ejem: minegocio@gmail.com"
            required
          />
        </div>

        <!-- Séptima fila: Contraseña (ancho completo) -->
        <div class="form-group">
          <label for="password" class="form-label">Contraseña</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="Ingresar mas de 6 dígitos"
            minlength="6"
            required
          />
        </div>

        <!-- Octava fila: Repetir Contraseña (ancho completo) -->
        <div class="form-group">
          <label for="confirmPassword" class="form-label">Repetir contraseña</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            class="form-input"
            placeholder="Escribe nuevamente la contraseña"
            minlength="6"
            required
          />
        </div>

        <!-- Botón Guardar -->
        <button type="submit" class="save-button" :disabled="loading">
          {{ loading ? 'Guardando...' : 'Guardar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { crearCliente, getAllUsers } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

// Interfaces
interface LocationItem {
  id: number
  name: string
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)

// Verificar si viene del formulario de creación de servicio
const fromServiceOrder = computed(() => route.query.fromServiceOrder === 'true')

// Datos de ubicación
const departments = ref<LocationItem[]>([
  { id: 1, name: 'Lima' },
  { id: 2, name: 'Arequipa' },
  { id: 3, name: 'Cusco' },
  { id: 4, name: 'La Libertad' },
  { id: 5, name: 'Piura' }
])

const provinces = ref<LocationItem[]>([])
const districts = ref<LocationItem[]>([])

// Datos de ubicación reales
const locationData = {
  1: { // Lima
    provinces: [
      { id: 1, name: 'Lima' },
      { id: 2, name: 'Callao' },
      { id: 3, name: 'Huaral' },
      { id: 4, name: 'Huarochirí' }
    ],
    districts: {
      1: [ // Lima
        { id: 1, name: 'Miraflores' },
        { id: 2, name: 'San Isidro' },
        { id: 3, name: 'La Molina' },
        { id: 4, name: 'Surco' },
        { id: 5, name: 'Pueblo Libre' },
        { id: 6, name: 'Jesús María' }
      ],
      2: [ // Callao
        { id: 7, name: 'Callao' },
        { id: 8, name: 'Bellavista' },
        { id: 9, name: 'La Perla' }
      ]
    }
  },
  2: { // Arequipa
    provinces: [
      { id: 5, name: 'Arequipa' },
      { id: 6, name: 'Caylloma' },
      { id: 7, name: 'Islay' }
    ],
    districts: {
      5: [ // Arequipa
        { id: 10, name: 'Arequipa' },
        { id: 11, name: 'Cayma' },
        { id: 12, name: 'Cerro Colorado' }
      ]
    }
  }
}

// Formulario reactivo
const form = reactive({
  firstname: '',
  lastname: '',
  phone: '',
  dni: '',
  department: '',
  province: '',
  district: '',
  address: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// Función para volver atrás
function goBack() {
  // Si viene del formulario de creación de servicio, regresar ahí
  if (fromServiceOrder.value) {
    router.push({ name: 'create-service-order' })
  } else {
    router.push({ name: 'client-list' })
  }
}

function clearAuthState() {
  authStore.clearAuthState()
  alert('Estado de autenticación limpiado. Por favor, haz login nuevamente.')
  router.push({ name: 'auth-presentation' })
}

// Función para manejar cambio de departamento
function onDepartmentChange() {
  form.province = ''
  form.district = ''
  districts.value = []
  
  // Cargar provincias basadas en el departamento seleccionado
  if (form.department) {
    const departmentId = parseInt(form.department)
    const departmentInfo = locationData[departmentId as keyof typeof locationData]
    if (departmentInfo) {
      provinces.value = departmentInfo.provinces as LocationItem[]
    } else {
      provinces.value = []
    }
  } else {
    provinces.value = []
  }
}

// Función para manejar cambio de provincia
function onProvinceChange() {
  form.district = ''
  
  // Cargar distritos basados en la provincia seleccionada
  if (form.province && form.department) {
    const departmentId = parseInt(form.department)
    const provinceId = parseInt(form.province)
    const departmentInfo = locationData[departmentId as keyof typeof locationData]
    
    if (departmentInfo && departmentInfo.districts) {
      const provinceDistricts = departmentInfo.districts[provinceId as keyof typeof departmentInfo.districts]
      if (provinceDistricts) {
        districts.value = provinceDistricts as LocationItem[]
      } else {
        districts.value = []
      }
    } else {
      districts.value = []
    }
  } else {
    districts.value = []
  }
}

// Función para manejar el envío del formulario
async function handleSubmit() {
  // Validaciones
  if (form.password !== form.confirmPassword) {
    alert('Las contraseñas no coinciden.')
    return
  }

  if (form.phone.length !== 9 || !/^\d+$/.test(form.phone)) {
    alert('El número de teléfono debe tener 9 dígitos numéricos.')
    return
  }

  if (!form.dni || form.dni.length !== 8 || !/^\d+$/.test(form.dni)) {
    alert('El DNI es obligatorio y debe tener 8 dígitos numéricos.')
    return
  }

  // Validar que el DNI sea único
  try {
    const allUsers = await getAllUsers()
    const existingUser = allUsers.find((user: any) => user.dni === form.dni)
    if (existingUser) {
      alert(`❌ NO se puede registrar otro usuario con un DNI que ya está en uso.\n\nEl DNI ${form.dni} ya está registrado por: ${existingUser.firstname} ${existingUser.lastname}`)
      return
    }
  } catch (error) {
    console.error('Error al validar DNI único:', error)
    alert('Error al validar el DNI. Por favor, intente nuevamente.')
    return
  }

  if (form.password.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres.')
    return
  }

  try {
    loading.value = true
    
    // El backend obtendrá automáticamente el businesId del usuario logueado

    const payload = {
      firstname: form.firstname.trim(),
      lastname: form.lastname.trim(),
      phone: form.phone,
      dni: form.dni || undefined,
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: 'CLIENT',
      isActive: true, // Los clientes se crean como activos por defecto
      isEmailVerified: true // También se marcan como verificados
      // TODO: Campos de ubicación temporalmente deshabilitados hasta resolver problema del cliente Prisma
      // department: form.department || undefined,
      // province: form.province || undefined,
      // district: form.district || undefined,
      // address: form.address.trim() || undefined
    }

    console.log('🔄 Registrando cliente:', payload)

    const result = await crearCliente(payload)

    if (result) {
      console.log('✅ Cliente registrado exitosamente:', result)
      
      // Si viene del formulario de creación de servicio
      if (fromServiceOrder.value) {
        // Guardar información del cliente creado en sessionStorage
        const createdClient = {
          id: result.id || result.data?.id,
          firstname: result.firstname || result.data?.firstname || form.firstname.trim(),
          lastname: result.lastname || result.data?.lastname || form.lastname.trim(),
          phone: result.phone || result.data?.phone || form.phone,
          email: result.email || result.data?.email || form.email.trim().toLowerCase(),
          dni: result.dni || result.data?.dni || form.dni
        }
        
        sessionStorage.setItem('newlyCreatedClient', JSON.stringify(createdClient))
        
        // Mostrar mensaje de éxito
        alert(`✅ Cliente creado exitosamente\n\n${createdClient.firstname} ${createdClient.lastname}\nTeléfono: ${createdClient.phone}\n\nSerás redirigido al formulario de creación de servicio.`)
        
        // Regresar al formulario de creación de servicio
        router.push({ name: 'create-service-order' })
      } else {
        // Si viene de otro lugar, comportamiento normal
        alert('Cliente registrado exitosamente.')
        router.push({ name: 'client-list' })
      }
    } else {
      alert('Error al registrar cliente.')
    }
       } catch (error: any) {
         console.error('❌ Error al registrar cliente:', error)
         console.error('❌ Error response:', error.response)
         console.error('❌ Error response data:', error.response?.data)
         
         let errorMessage = 'Error desconocido'
         
         if (error.response?.status === 409) {
           errorMessage = error.response?.data?.message || 'No se puede crear el cliente. El usuario no tiene un negocio asociado.'
         } else if (error.response?.status === 500) {
           errorMessage = 'Error interno del servidor. Por favor, intente nuevamente.'
         } else if (error.response?.data?.message) {
           errorMessage = error.response.data.message
         } else if (error.message) {
           errorMessage = error.message
         }
         
         alert(`Error al registrar cliente: ${errorMessage}`)
       } finally {
         loading.value = false
       }
}

// Lifecycle
onMounted(() => {
  console.log('🔄 ClientCreateRegisterView montado')
})
</script>

<style scoped>
.client-register-container {
  min-height: 100vh;
  background-color: #000;
  display: flex;
  flex-direction: column;
}

/* Header */
.client-register-header {
  display: flex;
  align-items: center;
  padding: 20px;
  background-color: #000;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.back-button {
  background: none;
  border: none;
  padding: 8px;
  margin-right: 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: rgba(255, 107, 53, 0.1);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  margin: 0;
  transform: translateX(-24px); /* Compensar el botón de retroceso */
}

.debug-button {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
}

.debug-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Form Container */
.form-container {
  flex: 1;
  background-color: #fff;
  margin: 20px;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Form Rows */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Form Groups */
.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin-bottom: 8px;
}

.form-input {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  color: #333;
  background-color: #f8f8f8;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: #999;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #ff6b35;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.form-input:invalid {
  border-color: #dc3545;
}

.form-input:disabled {
  background-color: #f0f0f0;
  color: #999;
  cursor: not-allowed;
}

/* Select styling */
.form-input select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

/* Save Button */
.save-button {
  background-color: #ff6b35;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px 24px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 20px;
  width: 100%;
}

.save-button:hover:not(:disabled) {
  background-color: #e55a2b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.save-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .client-register-container {
    padding: 0;
  }
  
  .client-register-header {
    padding: 16px;
  }
  
  .form-container {
    margin: 16px;
    padding: 20px;
    border-radius: 12px;
  }
  
  .title {
    font-size: 18px;
    color: #fff;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .form-input {
    padding: 14px;
    font-size: 16px;
  }
  
  .save-button {
    padding: 14px 20px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .form-container {
    margin: 12px;
    padding: 16px;
  }
  
  .register-form {
    gap: 16px;
  }
  
  .form-input {
    padding: 12px;
  }
  
  .save-button {
    padding: 12px 16px;
  }
}

/* Animaciones */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-container {
  animation: fadeIn 0.3s ease-out;
}

/* Estados de validación */
.form-input.valid {
  border-color: #28a745;
}

.form-input.invalid {
  border-color: #dc3545;
}

/* Loading state */
.save-button:disabled {
  position: relative;
}

.save-button:disabled::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  top: 50%;
  left: 50%;
  margin-left: -10px;
  margin-top: -10px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>