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
            required
          />
        </div>

        <!-- Botón de Guardar -->
        <button type="submit" class="save-btn" :disabled="loading">
          {{ loading ? 'Guardando...' : 'Guardar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBusinessData, createBusiness, updateBusiness, getAllBusinesses } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

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
      const userBusiness = existingBusiness.find((b: any) => b.userId === authStore.user?.id)
      
      if (userBusiness) {
        businessId.value = userBusiness.id
        isEditing.value = true

        form.value = {
          name: userBusiness.name || '',
          comercialname: userBusiness.comercialname || '',
          doctype: userBusiness.doctype || '',
          numdoc: userBusiness.numdoc || '',
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

// Función para validar el número de documento según el tipo
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
      alert(`❌ ${formatValidation.message}`)
      return
    }

    // Validar que el número de documento sea único
    const uniquenessValidation = await validateUniqueDocument()
    if (!uniquenessValidation.isValid) {
      alert(`❌ ${uniquenessValidation.message}`)
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
        userId: authStore.user?.id
      }
      await createBusiness(businessData)
      console.log('✅ Negocio creado exitosamente')
      alert('✅ Negocio creado exitosamente')
    }

    // Redirigir de vuelta a la presentación
    router.push({ name: 'business-presentation' })

  } catch (error) {
    console.error('❌ Error al guardar negocio:', error)
    alert('❌ Error al guardar los datos. Inténtalo de nuevo.')
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
</style>
