<template>
  <div class="edit-service-container">
    <!-- Header -->
    <header class="edit-service-header">
      <button class="back-button" @click="goBack" title="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Editar Servicio</h1>
    </header>

    <!-- Formulario -->
    <div class="form-container">
      <form @submit.prevent="handleSubmit" class="service-form">

        <!-- Categoría de Servicio (Solo lectura) -->
        <div class="form-group">
          <label for="categoryType" class="form-label">Categoría de Servicio</label>
          <input
            id="categoryType"
            :value="getCategoryDisplayName()"
            class="form-input readonly-field"
            readonly
          />
        </div>

        <!-- Tipo (Solo lectura) -->
        <div class="form-group">
          <label for="typeName" class="form-label">Tipo</label>
          <input
            id="typeName"
            :value="getTypeDisplayName(form.typeName)"
            class="form-input readonly-field"
            readonly
          />
        </div>

        <!-- Unidad de Medida (Solo lectura) -->
        <div class="form-group">
          <label for="unitMeasure" class="form-label">Unidad de Medida</label>
          <input
            id="unitMeasure"
            :value="getUnitDisplayName()"
            class="form-input readonly-field"
            readonly
          />
        </div>

        <!-- Precio x Unidad de Medida (Editable) -->
        <div class="form-group">
          <label for="price" class="form-label">Precio x Unidad de Medida</label>
          <input
            id="price"
            v-model="form.price"
            type="number"
            step="0.01"
            min="0"
            class="form-input"
            placeholder="0.00"
            required
          />
        </div>

        <!-- Estado Activo/Inactivo -->
        <div class="form-group">
          <label class="form-label">Estado del Servicio</label>
          <div class="toggle-container">
            <label class="toggle-label">
              <input
                type="checkbox"
                v-model="form.isActive"
                class="toggle-input"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-text">{{ form.isActive ? 'Activo' : 'Inactivo' }}</span>
            </label>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="form-actions">
          <button
            type="button"
            @click="goBack"
            class="cancel-btn"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="save-btn"
            :disabled="loading"
          >
            {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { updateListService } from '@/api/lavanderiaApi'

const router = useRouter()
const route = useRoute()
const loading = ref(false)

// Formulario reactivo
const form = reactive({
  typeName: '',
  price: '',
  isActive: true
})

// Función para volver atrás
function goBack() {
  router.push({ name: 'list-presentation' })
}

// Función para obtener el nombre de visualización del tipo
function getTypeDisplayName(type: string): string {
  const typeNames: { [key: string]: string } = {
    'GENERAL': 'General',
    'ABRIGO': 'Abrigo',
    'FRAZADA': 'Frazada',
    'EN_SECO': 'En Seco'
  }
  return typeNames[type] || type
}

// Función para obtener el nombre de la categoría
function getCategoryDisplayName(): string {
  const category = route.query.category as string
  switch (category) {
    case 'kilo':
      return 'Servicios por Peso'
    case 'piece':
      return 'Servicios por Unidad'
    default:
      return 'Categoría desconocida'
  }
}

// Función para obtener el nombre de la unidad
function getUnitDisplayName(): string {
  const category = route.query.category as string
  switch (category) {
    case 'kilo':
      return 'Kilos'
    case 'piece':
      return 'Pieza'
    default:
      return 'Unidad desconocida'
  }
}

// Función para cargar los datos del servicio
function loadServiceData() {
  const serviceId = route.params.id as string
  const type = route.query.type as string
  const price = route.query.price as string
  const isActive = route.query.isActive as string

  if (!serviceId || !type || !price) {
    alert('Datos del servicio no encontrados')
    goBack()
    return
  }

  form.typeName = type
  form.price = price
  form.isActive = isActive !== 'false'
}

// Función para enviar el formulario
async function handleSubmit() {
  try {
    loading.value = true

    // Validaciones básicas
    if (!form.price || parseFloat(form.price) <= 0) {
      alert('El precio debe ser mayor a 0')
      return
    }

    const serviceId = parseInt(route.params.id as string)

    // Actualizar el servicio
    const serviceData = {
      basePrice: parseFloat(form.price),
      isActive: form.isActive
    }

    await updateListService(serviceId, serviceData)
    console.log('✅ Servicio actualizado exitosamente')

    alert('Servicio actualizado exitosamente')

    // Regresar a la vista de servicios
    router.push({ name: 'list-presentation' })

  } catch (error) {
    console.error('❌ Error al actualizar servicio:', error)
    alert('Error al actualizar el servicio')
  } finally {
    loading.value = false
  }
}

// Cargar datos al montar el componente
onMounted(() => {
  loadServiceData()
})
</script>

<style scoped>
.edit-service-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.edit-service-header {
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
  cursor: pointer;
  margin-right: 15px;
  padding: 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: rgba(255, 107, 53, 0.1);
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.form-container {
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.service-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-color: #fff5f5;
  color: #333;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
}

.readonly-field {
  background-color: #f8f9fa !important;
  color: #666 !important;
  cursor: not-allowed !important;
  border-color: #ddd !important;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle-input {
  display: none;
}

.toggle-slider {
  width: 50px;
  height: 24px;
  background-color: #ccc;
  border-radius: 12px;
  position: relative;
  transition: background-color 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: white;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-slider {
  background-color: #ff6b35;
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(26px);
}

.toggle-text {
  font-weight: 500;
  color: #333;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

.cancel-btn {
  flex: 1;
  padding: 15px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

.save-btn {
  flex: 1;
  padding: 15px;
  background-color: #ff6b35;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-btn:hover:not(:disabled) {
  background-color: #ff8c5a;
}

.save-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>

