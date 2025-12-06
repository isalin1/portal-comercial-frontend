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
            @change="loadProvinces"
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
            @change="loadDistricts"
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
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import {
  getBusinessData,
  getAllDepartments,
  getAllProvinces,
  getAllDistricts,
  createPointSale,
  updatePointSale,
  getAllPointSales
} from '@/api/lavanderiaApi'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Estados reactivos
const loading = ref(false)
const businessData = ref<any>(null)
const departments = ref<any[]>([])
const provinces = ref<any[]>([])
const districts = ref<any[]>([])
const isEditing = ref(false)
const editingPointSaleId = ref<number | null>(null)
const currentCollaborator = ref<any>(null)

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

// Cargar datos de ubicación
async function loadDepartments() {
  try {
    const data = await getAllDepartments()
    departments.value = data
    console.log('✅ Departamentos cargados:', data)
  } catch (error) {
    console.error('❌ Error al cargar departamentos:', error)
  }
}

async function loadProvinces() {
  if (!form.value.departmentId) {
    provinces.value = []
    districts.value = []
    form.value.provinceId = ''
    form.value.districtId = ''
    return
  }

  try {
    const data = await getAllProvinces()
    provinces.value = data.filter((prov: any) => prov.departmentId === parseInt(form.value.departmentId))
    console.log('✅ Provincias cargadas:', provinces.value)
  } catch (error) {
    console.error('❌ Error al cargar provincias:', error)
  }
}

async function loadDistricts() {
  if (!form.value.provinceId) {
    districts.value = []
    form.value.districtId = ''
    return
  }

  try {
    const data = await getAllDistricts()
    districts.value = data.filter((dist: any) => dist.provinceId === parseInt(form.value.provinceId))
    console.log('✅ Distritos cargados:', districts.value)
  } catch (error) {
    console.error('❌ Error al cargar distritos:', error)
  }
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
    const pointSales = await getAllPointSales()
    const existingPointSale = pointSales.find((ps: any) => ps.id === pointSaleId)

    if (existingPointSale) {
      form.value = {
        name: existingPointSale.name,
        departmentId: '',
        provinceId: '',
        districtId: '',
        address: existingPointSale.address,
        phonenumber: existingPointSale.phonenumber
      }

      // Cargar ubicación si está disponible
      if (existingPointSale.district?.province?.department) {
        form.value.departmentId = existingPointSale.district.province.department.id.toString()
        await loadProvinces()
        form.value.provinceId = existingPointSale.district.province.id.toString()
        await loadDistricts()
        form.value.districtId = existingPointSale.district.id.toString()
      }

      // Cargar datos del colaborador si existe
      if (existingPointSale.colaborador) {
        currentCollaborator.value = existingPointSale.colaborador
        console.log('✅ Colaborador actual cargado:', existingPointSale.colaborador)
      } else {
        currentCollaborator.value = null
        console.log('ℹ️ No hay colaborador asignado a este punto de venta')
      }

      console.log('✅ Datos de punto de venta cargados para edición:', existingPointSale)
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
    const pointSaleData = {
      name: form.value.name,
      address: form.value.address,
      phonenumber: form.value.phonenumber,
      businesId: businessData.value.id
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
    await loadExistingPointSale(pointSaleId)
  }
})
</script>

<style scoped>
.pointsale-register {
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
</style>
