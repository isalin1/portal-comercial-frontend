<template>
  <div class="pointsale-register">
    <!-- Header -->
    <div class="header">
      <button @click="goBack" class="back-button">
        <span class="arrow">←</span>
      </button>
      <h1 class="title">{{ isEditing ? 'Editar Punto de Venta' : 'Registro de Datos Punto Venta' }}</h1>
    </div>

    <!-- Formulario -->
    <div class="form-container">
      <form @submit.prevent="onSubmit" class="form">
        <!-- Nombre del punto de venta -->
        <div class="form-group">
          <label for="name">Nombre de punto de venta</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Ejem: Los Limpios 1"
            required
          />
        </div>

        <!-- Departamento -->
        <div class="form-group">
          <label for="department">Departamento</label>
          <select
            id="department"
            v-model="form.departmentId"
            @change="onDepartmentChange"
            required
          >
            <option value="">Selecciona el departamento</option>
            <option
              v-for="dept in departments"
              :key="dept.id"
              :value="dept.id"
            >
              {{ dept.name }}
            </option>
          </select>
        </div>

        <!-- Provincia -->
        <div class="form-group">
          <label for="province">Provincia</label>
          <select
            id="province"
            v-model="form.provinceId"
            @change="onProvinceChange"
            required
            :disabled="!form.departmentId"
          >
            <option value="">Selecciona la provincia</option>
            <option
              v-for="prov in provinces"
              :key="prov.id"
              :value="prov.id"
            >
              {{ prov.name }}
            </option>
          </select>
        </div>

        <!-- Distrito -->
        <div class="form-group">
          <label for="district">Distrito</label>
          <select
            id="district"
            v-model="form.districtId"
            required
            :disabled="!form.provinceId"
          >
            <option value="">Selecciona el distrito</option>
            <option
              v-for="dist in districts"
              :key="dist.id"
              :value="dist.id"
            >
              {{ dist.name }}
            </option>
          </select>
        </div>

        <!-- Dirección -->
        <div class="form-group">
          <label for="address">Dirección</label>
          <input
            id="address"
            v-model="form.address"
            type="text"
            placeholder="Selecciona una zona comercial"
            required
          />
        </div>

        <!-- Número de WhatsApp -->
        <div class="form-group">
          <label for="phonenumber">Número de WhatsApp</label>
          <input
            id="phonenumber"
            v-model="form.phonenumber"
            type="tel"
            placeholder="Ingresa 9 dígitos (ej: 999000000)"
            maxlength="9"
            pattern="[0-9]{9}"
            @input="formatPhoneNumber"
            required
          />
        </div>

        <!-- Sección de Colaborador (solo al editar) -->
        <div v-if="isEditing" class="collaborator-section">
          <h3 class="section-title">Gestión de Colaborador</h3>

          <!-- Mostrar colaborador actual si existe -->
          <div v-if="currentCollaborator" class="current-collaborator">
            <h4>Colaborador Actual:</h4>
            <div class="collaborator-info">
              <p><strong>Nombre:</strong> {{ currentCollaborator.firstname }} {{ currentCollaborator.lastname }}</p>
              <p><strong>Teléfono:</strong> {{ currentCollaborator.phone }}</p>
              <p><strong>Email:</strong> {{ currentCollaborator.email }}</p>
            </div>
            <button
              type="button"
              @click="changeCollaborator"
              class="change-collaborator-btn"
            >
              Cambiar Colaborador
            </button>
          </div>

          <!-- Mostrar opción para crear colaborador si no existe -->
          <div v-else class="no-collaborator">
            <p>Este punto de venta no tiene un colaborador asignado.</p>
            <button
              type="button"
              @click="createNewCollaborator"
              class="create-collaborator-btn"
            >
              Crear Nuevo Colaborador
            </button>
          </div>
        </div>

        <!-- Botón de guardar -->
        <button type="submit" class="submit-button" :disabled="loading">
          {{ loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar y Continuar') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import {
  getBusinessData,
  createPointSale,
  updatePointSale,
  getAllPointSales
} from '@/api/lavanderiaApi'
import { useUbigeo } from '@/composables/useUbigeo'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Estados reactivos
const loading = ref(false)
const businessData = ref<any>(null)
const isEditing = ref(false)
const editingPointSaleId = ref<number | null>(null)
const currentCollaborator = ref<any>(null)

// Usar el composable de ubigeo
const { departments, provinces, districts, loadDepartments, loadProvinces, loadDistricts, loadLocationByDistrict } = useUbigeo()

// Formulario
const form = ref({
  name: '',
  departmentId: '',
  provinceId: '',
  districtId: '',
  address: '',
  phonenumber: ''
})

// Función para regresar
function goBack() {
  router.back()
}

// Función para formatear el número de teléfono (solo números)
function formatPhoneNumber() {
  // Remover todos los caracteres que no sean números
  form.value.phonenumber = form.value.phonenumber.replace(/\D/g, '')
}

// Funciones para manejar cambios de ubicación usando el composable
async function onDepartmentChange() {
  form.value.provinceId = ''
  form.value.districtId = ''
  await loadProvinces(form.value.departmentId)
}

async function onProvinceChange() {
  form.value.districtId = ''
  await loadDistricts(form.value.provinceId)
}

// Validar que existe un business
async function validateBusiness() {
  try {
    const business = await getBusinessData()
    if (business && business.length > 0) {
      const userBusiness = business.find((b: any) => b.userId === authStore.user?.id)
      if (userBusiness) {
        businessData.value = userBusiness
        return true
      }
    }
    return false
  } catch (error) {
    console.error('❌ Error al validar business:', error)
    return false
  }
}

// Cargar datos de un punto de venta existente para edición
async function loadExistingPointSale(pointSaleId: number) {
  try {
    console.log('🔄 Cargando datos del punto de venta ID:', pointSaleId)
    
    // Cargar todos los datos de ubicación primero
    await loadDepartments()
    
    const pointSales = await getAllPointSales()
    const existingPointSale = pointSales.find((ps: any) => ps.id === pointSaleId)

    if (!existingPointSale) {
      console.error('❌ No se encontró el punto de venta con ID:', pointSaleId)
      return
    }

    console.log('📦 Datos del punto de venta encontrado:', existingPointSale)
    
    // Establecer datos básicos del formulario
    form.value = {
      name: existingPointSale.name || '',
      departmentId: '',
      provinceId: '',
      districtId: '',
      address: existingPointSale.address || '',
      phonenumber: existingPointSale.phonenumber || ''
    }

      // Cargar ubicación usando el composable
      if (existingPointSale.district?.id) {
        const location = await loadLocationByDistrict(existingPointSale.district.id)
        if (location) {
          form.value.departmentId = location.departmentId.toString()
          await nextTick()
          form.value.provinceId = location.provinceId.toString()
          await nextTick()
          form.value.districtId = location.districtId.toString()
          console.log('✅ Ubicación cargada:', {
            department: form.value.departmentId,
            province: form.value.provinceId,
            district: form.value.districtId
          })
        }
      } else if (existingPointSale.districtId) {
        const location = await loadLocationByDistrict(existingPointSale.districtId)
        if (location) {
          form.value.departmentId = location.departmentId.toString()
          await nextTick()
          form.value.provinceId = location.provinceId.toString()
          await nextTick()
          form.value.districtId = location.districtId.toString()
          console.log('✅ Ubicación cargada:', {
            department: form.value.departmentId,
            province: form.value.provinceId,
            district: form.value.districtId
          })
        }
      } else {
        console.log('ℹ️ Este punto de venta no tiene información de ubicación. Los campos de ubicación quedarán vacíos.')
      }

    // Cargar datos del colaborador si existe
    if (existingPointSale.colaborador) {
      currentCollaborator.value = existingPointSale.colaborador
      console.log('✅ Colaborador actual cargado')
    } else {
      currentCollaborator.value = null
    }

  } catch (error) {
    console.error('❌ Error al cargar datos del punto de venta:', error)
  }
}

// Enviar formulario
async function onSubmit() {
  try {
    loading.value = true

    // Validar número de WhatsApp
    if (!form.value.phonenumber || form.value.phonenumber.length !== 9 || !/^\d+$/.test(form.value.phonenumber)) {
      alert('❌ Debe ingresar 9 dígitos')
      return
    }

    // Validar que existe un business
    const hasBusiness = await validateBusiness()
    if (!hasBusiness) {
      alert('Debe crear una Empresa antes de registrar un punto de venta')
      router.push({ name: 'business-register' })
      return
    }

    // Preparar datos del punto de venta
    const pointSaleData: any = {
      name: form.value.name,
      address: form.value.address,
      phonenumber: form.value.phonenumber,
      businesId: businessData.value.id
    }

    // Incluir districtId si está seleccionado
    if (form.value.districtId) {
      pointSaleData.districtId = parseInt(form.value.districtId)
    }

            // Crear o actualizar punto de venta
    if (isEditing.value && editingPointSaleId.value) {
      await updatePointSale(editingPointSaleId.value, pointSaleData)
      console.log('✅ Punto de venta actualizado exitosamente')
      alert('Punto de venta actualizado exitosamente')
      router.push({ name: 'business-presentation' })
    } else {
      const createdPointSale = await createPointSale(pointSaleData)
      console.log('✅ Punto de venta creado exitosamente:', createdPointSale)
      alert('Punto de venta registrado exitosamente')
      // Navegar a la vista de registro de colaborador
      router.push({
        name: 'pointsale-colab',
        query: { pointsaleId: createdPointSale.id }
      })
    }

  } catch (error) {
    console.error('❌ Error al crear punto de venta:', error)
    alert('Error al registrar el punto de venta')
  } finally {
    loading.value = false
  }
}

// Funciones para gestión de colaboradores
function changeCollaborator() {
  // Navegar a la vista de creación de colaborador con el ID del punto de venta
  router.push({
    name: 'pointsale-colab',
    query: {
      pointsaleId: editingPointSaleId.value,
      changeExisting: 'true'
    }
  })
}

function createNewCollaborator() {
  // Navegar a la vista de creación de colaborador con el ID del punto de venta
  router.push({
    name: 'pointsale-colab',
    query: {
      pointsaleId: editingPointSaleId.value,
      createNew: 'true'
    }
  })
}

// Cargar datos al montar el componente
onMounted(async () => {
  await loadDepartments()

  // Validar business al cargar
  const hasBusiness = await validateBusiness()
  if (!hasBusiness) {
    alert('Debe crear una Empresa antes de registrar un punto de venta')
    router.push({ name: 'business-register' })
    return
  }

  // Verificar si estamos editando un punto de venta existente
  const editMode = route.query.edit === 'true'
  const pointSaleId = route.query.id ? parseInt(route.query.id as string) : null

  if (editMode && pointSaleId) {
    isEditing.value = true
    editingPointSaleId.value = pointSaleId
    // Esperar un momento para que los departamentos se carguen completamente
    await nextTick()
    await loadExistingPointSale(pointSaleId)
  }
})
</script>

<style scoped>
.pointsale-register {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  background: white;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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

.form-group input,
.form-group select {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background-color: #fefefe;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
}

.form-group select:disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
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

/* Estilos para la sección de colaborador */
.collaborator-section {
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px;
  margin: 20px 0;
  background-color: #f9f9f9;
}

.section-title {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: bold;
}

.current-collaborator {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.current-collaborator h4 {
  margin: 0 0 10px 0;
  color: #ff6b35;
  font-size: 14px;
}

.collaborator-info p {
  margin: 5px 0;
  font-size: 14px;
  color: #555;
}

.change-collaborator-btn {
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.3s;
}

.change-collaborator-btn:hover {
  background-color: #e55a2b;
}

.no-collaborator {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.no-collaborator p {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 14px;
}

.create-collaborator-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.create-collaborator-btn:hover {
  background-color: #218838;
}

/* Responsive Design - Desktop */
@media (min-width: 769px) {
  .pointsale-register {
    padding: 2rem;
  }

  .header {
    max-width: 800px;
    margin: 0 auto 2rem;
    padding: 1.5rem 2rem;
  }

  .form-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .form {
    gap: 24px;
  }

  .form-group {
    gap: 10px;
  }

  .form-group label {
    font-size: 15px;
  }

  .form-group input,
  .form-group select {
    padding: 14px;
    font-size: 15px;
  }

  .submit-button {
    padding: 16px;
    font-size: 17px;
    max-width: 400px;
    margin: 20px auto 0;
    display: block;
  }
}

@media (min-width: 1024px) {
  .pointsale-register {
    padding: 2.5rem;
  }

  .header {
    max-width: 900px;
    padding: 1.75rem 2.5rem;
  }

  .form-container {
    max-width: 900px;
    padding: 2.5rem;
  }

  .form {
    gap: 28px;
  }

  .form-group label {
    font-size: 16px;
  }

  .form-group input,
  .form-group select {
    padding: 16px;
    font-size: 16px;
  }

  .submit-button {
    padding: 18px;
    font-size: 18px;
    max-width: 450px;
  }

  .section-title {
    font-size: 18px;
  }

  .collaborator-section {
    padding: 24px;
  }
}

@media (min-width: 1280px) {
  .pointsale-register {
    padding: 3rem;
  }

  .header {
    max-width: 1000px;
    padding: 2rem 3rem;
  }

  .form-container {
    max-width: 1000px;
    padding: 3rem;
  }

  .form {
    gap: 32px;
  }

  .form-group {
    gap: 12px;
  }

  .form-group label {
    font-size: 17px;
  }

  .form-group input,
  .form-group select {
    padding: 18px;
    font-size: 17px;
  }

  .submit-button {
    padding: 20px;
    font-size: 19px;
    max-width: 500px;
  }

  .title {
    font-size: 22px;
  }

  .section-title {
    font-size: 19px;
  }

  .collaborator-section {
    padding: 28px;
  }
}
</style>

<style>
/* Estilos globales para asegurar que la vista use todo el ancho */
body:has(.pointsale-register) {
  display: block !important;
  place-items: unset !important;
  width: 100% !important;
  max-width: 100% !important;
}

#app:has(.pointsale-register) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
}

router-view:has(.pointsale-register) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
}
</style>
