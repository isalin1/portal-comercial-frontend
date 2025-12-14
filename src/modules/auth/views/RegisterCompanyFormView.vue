<template>
  <div class="business-register-container">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" @click="goBack" aria-label="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff7a2f" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Registro de Datos Empresa</h1>
    </header>

    <!-- Formulario -->
    <div class="form-container">
      <div class="content-wrapper">
        <form @submit.prevent="onSubmit" class="business-form">

        <!-- Razón Social -->
        <div class="form-group">
          <label for="name" class="form-label">Razón social</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Ingresa la razón social de tu negocio"
            class="form-input"
            required
          />
        </div>

        <!-- Nombre Comercial -->
        <div class="form-group">
          <label for="comercialname" class="form-label">Nombre comercial</label>
          <input
            id="comercialname"
            v-model="form.comercialname"
            type="text"
            placeholder="Ejem: Pollo el dorado"
            class="form-input"
            required
          />
        </div>

        <!-- Tipo de Documento -->
        <div class="form-group">
          <label for="doctype" class="form-label">Tipo de documento</label>
          <select
            id="doctype"
            v-model="form.doctype"
            class="form-input"
            required
          >
            <option value="">Selecciona el tipo de documento</option>
            <option value="RUC">RUC</option>
            <option value="DNI">DNI</option>
            <option value="CE">CE</option>
            <option value="PASAPORTE">PASAPORTE</option>
          </select>
        </div>

        <!-- Número de Documento -->
        <div class="form-group">
          <label for="numdoc" class="form-label">Número de documento</label>
          <input
            id="numdoc"
            v-model="form.numdoc"
            type="text"
            :placeholder="getDocumentPlaceholder()"
            :maxlength="getDocumentMaxLength()"
            class="form-input"
            :class="{ 'input-error': errors.numdoc }"
            @input="validateDocumentNumberInput"
            required
          />
          <span v-if="errors.numdoc" class="error-message">{{ errors.numdoc }}</span>
        </div>

        <!-- Teléfono -->
        <div class="form-group">
          <label for="phone" class="form-label">Teléfono</label>
          <input
            id="phone"
            v-model="form.phone"
            type="text"
            placeholder="Ingresar 9 dígitos"
            class="form-input"
            :class="{ 'input-error': errors.phone }"
            maxlength="9"
            @input="validatePhone"
            required
          />
          <span v-if="errors.phone" class="error-message">{{ errors.phone }}</span>
        </div>

        <!-- Botón de Guardar -->
        <button type="submit" class="save-btn" :disabled="loading">
          {{ loading ? 'Guardando...' : 'Guardar' }}
        </button>
      </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getBusinessData, createBusiness, updateBusiness, getAllBusinesses } from '@/api/lavanderiaApi'

const router = useRouter()
const route = useRoute()
const userId = Number(route.query.userId)

console.log({userId});


// Estados reactivos
const loading = ref(false)
const isEditing = ref(false)
const businessId = ref<number | null>(null)

// Formulario
const form = ref({
  name: '',
  comercialname: '',
  doctype: '',
  numdoc: '',
  phone: '',
})

// Estado de errores
const errors = ref({
  numdoc: '',
  phone: ''
})

// Función para volver atrás
function goBack() {
  router.go(-1)
}

// Función para obtener el placeholder dinámico según el tipo de documento
function getDocumentPlaceholder() {
  switch (form.value.doctype) {
    case 'DNI':
      return 'Ingresa 8 dígitos (ej: 12345678)'
    case 'RUC':
      return 'Ingresa 11 dígitos (ej: 20123456789)'
    case 'CE':
      return 'Ingresa el número de carné de extranjería'
    case 'PASAPORTE':
      return 'Ingresa el número de pasaporte'
    default:
      return 'Selecciona primero el tipo de documento'
  }
}

// Función para obtener la longitud máxima según el tipo de documento
function getDocumentMaxLength() {
  switch (form.value.doctype) {
    case 'DNI':
      return 8
    case 'RUC':
      return 11
    case 'CE':
    case 'PASAPORTE':
      return 20
    default:
      return 20
  }
}

// Función para cargar datos existentes (si es edición)
async function loadExistingData() {
  try {
    const existingBusiness = await getBusinessData()
    if (existingBusiness && existingBusiness.length > 0) {
      // Buscar solo el negocio del usuario logueado
      const userBusiness = existingBusiness.find((b: any) => b.userId === userId)
      
      if (userBusiness) {
        businessId.value = userBusiness.id
        isEditing.value = true

        form.value = {
          name: userBusiness.name || '',
          comercialname: userBusiness.comercialname || '',
          doctype: userBusiness.doctype || '',
          numdoc: userBusiness.numdoc || '',
          phone: userBusiness.phone || '',
        }

        console.log('✅ Datos existentes cargados:', userBusiness)
      } else {
        // No hay negocio del usuario, formulario limpio para crear nuevo
        console.log('ℹ️ No hay negocio existente para este usuario, formulario limpio')
      }
    }
  } catch (error) {
    console.error('❌ Error al cargar datos existentes:', error)
  }
}

// Función para validar el número de documento en tiempo real
function validateDocumentNumberInput() {
  // Filtrar solo números para DNI y RUC
  if (form.value.doctype === 'DNI' || form.value.doctype === 'RUC') {
    form.value.numdoc = form.value.numdoc.replace(/\D/g, '')
  }
  
  const numdoc = form.value.numdoc.trim()
  
  if (!form.value.doctype) {
    errors.value.numdoc = ''
    return
  }
  
  if (numdoc.length === 0) {
    errors.value.numdoc = ''
    return
  }
  
  // Validar formato según el tipo de documento
  switch (form.value.doctype) {
    case 'DNI':
      if (numdoc.length !== 8 || !/^\d+$/.test(numdoc)) {
        errors.value.numdoc = 'El DNI debe tener exactamente 8 dígitos numéricos'
      } else {
        errors.value.numdoc = ''
      }
      break
    case 'RUC':
      if (numdoc.length !== 11 || !/^\d+$/.test(numdoc)) {
        errors.value.numdoc = 'El RUC debe tener exactamente 11 dígitos numéricos'
      } else {
        errors.value.numdoc = ''
      }
      break
    case 'CE':
    case 'PASAPORTE':
      if (numdoc.length < 6 || numdoc.length > 20) {
        errors.value.numdoc = 'El número de documento debe tener entre 6 y 20 caracteres'
      } else {
        errors.value.numdoc = ''
      }
      break
    default:
      errors.value.numdoc = ''
  }
}

// Función para validar el número de documento según el tipo (para onSubmit)
function validateDocumentNumber() {
  if (!form.value.doctype || !form.value.numdoc) {
    return { isValid: false, message: 'Debe seleccionar el tipo de documento y ingresar el número' }
  }

  const numdoc = form.value.numdoc.trim()
  
  // Validar formato según el tipo de documento
  switch (form.value.doctype) {
    case 'DNI':
      if (numdoc.length !== 8 || !/^\d+$/.test(numdoc)) {
        return { isValid: false, message: 'El DNI debe tener exactamente 8 dígitos numéricos' }
      }
      break
    case 'RUC':
      if (numdoc.length !== 11 || !/^\d+$/.test(numdoc)) {
        return { isValid: false, message: 'El RUC debe tener exactamente 11 dígitos numéricos' }
      }
      break
    case 'CE':
    case 'PASAPORTE':
      if (numdoc.length < 6 || numdoc.length > 20) {
        return { isValid: false, message: 'El número de documento debe tener entre 6 y 20 caracteres' }
      }
      break
    default:
      return { isValid: false, message: 'Tipo de documento no válido' }
  }

  return { isValid: true, message: '' }
}

// Función para validar teléfono en tiempo real
function validatePhone() {
  const phone = form.value.phone.replace(/\D/g, '') // Solo números
  form.value.phone = phone
  
  if (phone.length === 0) {
    errors.value.phone = ''
  } else if (phone.length !== 9) {
    errors.value.phone = 'El teléfono debe tener exactamente 9 dígitos'
  } else {
    errors.value.phone = ''
  }
}

// Función para validar que el número de documento sea único
async function validateUniqueDocument() {
  try {
    const allBusinesses = await getAllBusinesses()
    const existingBusiness = allBusinesses.find((business: any) => 
      business.numdoc === form.value.numdoc && 
      (!isEditing.value || business.id !== businessId.value)
    )
    
    if (existingBusiness) {
      return { 
        isValid: false, 
        message: `El número de documento ${form.value.numdoc} ya está registrado por: ${existingBusiness.name}` 
      }
    }
    
    return { isValid: true, message: '' }
  } catch (error) {
    console.error('Error al validar documento único:', error)
    return { isValid: false, message: 'Error al validar el documento. Inténtalo de nuevo.' }
  }
}

// Función para enviar el formulario
async function onSubmit() {
  try {
    loading.value = true

    // Validar formato del número de documento
    const formatValidation = validateDocumentNumber()
    if (!formatValidation.isValid) {
      errors.value.numdoc = formatValidation.message
      loading.value = false
      return
    }

    // Validar teléfono
    if (!/^\d{9}$/.test(form.value.phone)) {
      errors.value.phone = 'El teléfono debe tener exactamente 9 dígitos'
      loading.value = false
      return
    }

    // Validar que el número de documento sea único
    const uniquenessValidation = await validateUniqueDocument()
    if (!uniquenessValidation.isValid) {
      alert(`❌ ${uniquenessValidation.message}`)
      loading.value = false
      return
    }

    if (isEditing.value && businessId.value) {
      // Actualizar negocio existente
      await updateBusiness(businessId.value, form.value)
      console.log('✅ Negocio actualizado exitosamente')
      alert('✅ Negocio actualizado exitosamente')
    } else {
      // Crear nuevo negocio con userId del usuario logueado
      const businessData = {
        ...form.value,
        userId
      }
      await createBusiness(businessData)
      //
      console.log('✅ Negocio creado exitosamente')
      alert('✅ Negocio creado exitosamente')
    }

    // Redirigir de vuelta a la presentación
    router.push({ name: 'business-presentation' })

  } catch (error: any) {
    console.error('❌ Error al guardar negocio:', error)
    console.error('❌ Error response:', error.response)
    console.error('❌ Error response data:', error.response?.data)
    console.error('❌ Error completo:', JSON.stringify(error, null, 2))
    
    let errorMessage = 'Error desconocido al guardar los datos'
    
    // Extraer mensaje específico del backend
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.response?.data) {
      // Intentar extraer mensaje de diferentes formatos de error
      const errorData = error.response.data
      if (typeof errorData === 'string') {
        errorMessage = errorData
      } else if (errorData.message) {
        errorMessage = errorData.message
      } else if (errorData.error) {
        errorMessage = errorData.error
      }
    }
    
    // Manejar errores específicos de Prisma (P2002 = unique constraint violation)
    if (error.response?.data?.code === 'P2002' || error.response?.data?.meta?.target) {
      const target = error.response.data.meta?.target || []
      if (target.includes('numdoc')) {
        errorMessage = `El número de documento "${form.value.numdoc}" ya está registrado. Por favor, verifica el número de documento.`
      } else if (target.includes('phone')) {
        errorMessage = `El teléfono "${form.value.phone}" ya está registrado. Por favor, verifica el número de teléfono.`
      } else {
        errorMessage = 'Los datos ingresados ya están registrados. Por favor, verifica que el número de documento y teléfono sean únicos.'
      }
    }
    
    // Manejar errores por código de estado HTTP
    if (error.response?.status === 409) {
      if (!errorMessage.includes('registrado')) {
        errorMessage = 'El número de documento o teléfono ya está registrado. Por favor, verifica los datos.'
      }
    } else if (error.response?.status === 400) {
      if (!errorMessage || errorMessage === 'Error desconocido al guardar los datos') {
        errorMessage = 'Datos inválidos. Por favor, verifica que todos los campos estén correctamente completados.'
      }
    } else if (error.response?.status === 404) {
      errorMessage = 'No se encontró el recurso solicitado. Por favor, intenta nuevamente.'
    } else if (error.response?.status === 500) {
      errorMessage = 'Error interno del servidor. Por favor, intenta nuevamente más tarde.'
    } else if (error.message && !error.response) {
      errorMessage = `Error de conexión: ${error.message}. Por favor, verifica tu conexión a internet.`
    } else if (error.response?.status) {
      errorMessage = `Error del servidor (Código ${error.response.status}). ${errorMessage}`
    }
    
    alert(`❌ ${errorMessage}`)
  } finally {
    loading.value = false
  }
}

onMounted(loadExistingData)
</script>

<style scoped>
.business-register-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 0;
  margin: 0;
}

.header {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: #f0f0f0;
}

.title {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.form-container {
  padding: 1rem;
}

.business-form {
  background-color: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 6px;
  background: #ffe5e5;
  font-size: 1rem;
  outline: none;
  transition: background-color 0.2s;
}

.form-input:focus {
  background: #ffd6d6;
}

.form-input::placeholder {
  color: #999;
}

select.form-input {
  cursor: pointer;
}

.input-error {
  border: 2px solid #ff4444;
  background: #ffe5e5;
}

.error-message {
  color: #ff4444;
  font-size: 0.85rem;
  margin-top: -0.5rem;
  margin-bottom: 0.5rem;
  display: block;
}

.save-btn {
  width: 100%;
  padding: 1rem;
  background-color: #ff7a2f;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1rem;
}

.save-btn:hover:not(:disabled) {
  background-color: #ff944d;
}

.save-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Responsive design */
@media (max-width: 768px) {
  .form-container {
    padding: 0.5rem;
  }

  .business-form {
    padding: 1rem;
  }
}

/* Responsive: Centrar en desktop */
@media (min-width: 769px) {
  .form-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 2rem;
  }
  
  .content-wrapper {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }
}

@media (min-width: 1024px) {
  .content-wrapper {
    max-width: 700px;
  }
}

@media (min-width: 1280px) {
  .content-wrapper {
    max-width: 800px;
  }
}
</style>

<style>
/* Estilos globales para centrar el contenedor en desktop */
@media (min-width: 769px) {
  body:has(.business-register-container) {
    display: flex !important;
    flex-direction: column !important;
  }
  
  .business-register-container {
    width: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .business-register-container .form-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
}
</style>
