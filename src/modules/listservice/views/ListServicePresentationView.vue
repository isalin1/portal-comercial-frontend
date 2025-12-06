<template>
  <div class="services-container">
    <!-- Header -->
    <header class="services-header">
      <button class="back-button" @click="goBack" title="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Nuestros Servicios</h1>
    </header>

    <!-- Botón Crear Nueva Categoría -->
    <div class="create-category-section">
      <button 
        class="create-category-btn" 
        :class="{ 'disabled': allCategoriesHaveServices }"
        :disabled="allCategoriesHaveServices"
        @click="createNewCategory"
        :title="allCategoriesHaveServices ? 'Todas las categorías disponibles ya han sido creadas' : 'Crear una nueva categoría de servicio'"
      >
        {{ allCategoriesHaveServices ? 'Todas las Categorías Creadas' : 'Crear Nueva Categoria Servicio' }}
      </button>
    </div>

    <!-- Categorías de Servicios (Dinámicas) -->
    <div class="services-categories" v-if="hasAnyServices">

      <!-- Loop dinámico por cada categoría que tiene servicios -->
      <div class="service-category" v-for="categoryType in categoriesWithServices" :key="categoryType">
        <div class="category-header">
          <h3 class="category-title">{{ getCategoryDisplayName(categoryType) }}</h3>
          <div class="unit-info">
            <span class="unit-label">Unidad medida:</span>
            <span class="unit-value">{{ getCategoryUnit(categoryType) }}</span>
          </div>
        </div>

        <button 
          class="add-new-btn" 
          :class="{ 'disabled': areAllTypesUsedForCategory(categoryType) }"
          :disabled="areAllTypesUsedForCategory(categoryType)"
          @click="addNewService(categoryType)"
          :title="areAllTypesUsedForCategory(categoryType) ? 'Todos los tipos de esta categoría ya han sido creados' : 'Agregar un nuevo tipo de servicio'"
        >
          {{ areAllTypesUsedForCategory(categoryType) ? 'Todos los tipos creados' : 'Agregar nuevo' }}
        </button>

        <div class="services-list">
          <div class="service-item" v-for="service in servicesByCategory[categoryType]" :key="service.id">
            <span class="service-name">{{ service.servicecategory?.name || 'Sin nombre' }}</span>
            <span class="service-type">{{ getTypeDisplayName(service.type) }}</span>
            <span class="service-price">S/. {{ service.basePrice }}</span>
            <div class="service-actions">
              <button class="edit-btn" @click="editService(service.id)" title="Editar">
                ✏️
              </button>
              <button class="toggle-btn" :class="{ active: service.isActive }" @click="toggleService(service.id)" title="Activar/Desactivar">
                {{ service.isActive ? '🔘' : '⚪' }}
              </button>
              <button class="delete-btn" @click="deleteService(service.id)" title="Eliminar">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Mensaje cuando no hay servicios -->
    <div v-if="!hasAnyServices" class="no-services-message">
      <div class="no-services-card">
        <h3 class="no-services-title">Sin servicios creados</h3>
        <p class="no-services-description">
          No hay servicios registrados en el sistema.
          Haz clic en "Crear Nueva Categoria Servicio" para comenzar.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { getServiceCategories, getListServices, deleteListService, updateListService, lavanderiaApi, getServiceEnums } from '@/api/lavanderiaApi'

const router = useRouter()

// Datos reales desde la API
const serviceCategories = ref<any[]>([])
const listServices = ref<any[]>([])
const loading = ref(false)
const businesId = ref<number | null>(null)

// Enums cargados desde el backend
const allCategoriesFromEnum = ref<string[]>([])
const allTypesFromEnum = ref<string[]>([])
const allUnitsFromEnum = ref<string[]>([])

// Mapeo de nombres de categorías para visualización
const categoryDisplayNames: Record<string, string> = {
  'LAVADO': 'Lavado',
  'LAVADO_ESPECIAL': 'Lavado Especial',
  'LAVADO_EN_SECO': 'Lavado en Seco',
  'PLANCHADO': 'Planchado',
  'FRAZADAS': 'Frazadas',
  'EDREDONES': 'Edredones',
  'ZAPATILLAS': 'Zapatillas',
  'ALFOMBRAS': 'Alfombras',
  'CORTINAS': 'Cortinas'
}

// Mapeo de nombres de unidades para visualización
const unitDisplayNames: Record<string, string> = {
  'KILOGRAM': 'Kilogramo (kg)',
  'UNIT': 'Unidad (pieza)',
  'PAIR': 'Par',
  'METER': 'Metro (mt)'
}

// Mapeo de categorías a tipos permitidos (debe coincidir con CreateServiceView)
const categoryToTypesMap: Record<string, string[]> = {
  'LAVADO': ['GENERAL', 'OTROS'],
  'LAVADO_ESPECIAL': ['CAMISA', 'PANTALON', 'JEAN', 'CHOMPA', 'CASACA', 'ABRIGO', 'TERNO', 'CORBATA', 'OTROS'],
  'LAVADO_EN_SECO': ['CAMISA', 'PANTALON', 'JEAN', 'CHOMPA', 'CASACA', 'ABRIGO', 'TERNO', 'CORBATA', 'OTROS'],
  'PLANCHADO': ['CAMISA', 'PANTALON', 'JEAN', 'CHOMPA', 'OTROS'],
  'FRAZADAS': ['UNO_PLAZA', 'UNO_MEDIO_PLAZA', 'DOS_PLAZAS', 'QUEEN', 'KING'],
  'EDREDONES': ['UNO_PLAZA', 'UNO_MEDIO_PLAZA', 'DOS_PLAZAS', 'QUEEN', 'KING'],
  'ZAPATILLAS': ['GENERAL', 'OTROS'],
  'ALFOMBRAS': ['GENERAL', 'OTROS'],
  'CORTINAS': ['GENERAL', 'OTROS']
}

// Función para obtener el businessId del usuario logueado
async function getUserBusinessId() {
  try {
    const { data } = await lavanderiaApi.get('/busines')
    console.log('📦 Negocios del usuario:', data)
    if (data && data.length > 0) {
      businesId.value = data[0].id
      console.log('✅ BusinessId obtenido:', businesId.value)
      return businesId.value
    } else {
      console.error('❌ El usuario no tiene negocios registrados')
      alert('No tienes un negocio registrado. Por favor, crea un negocio primero.')
      router.push({ name: 'business-register' })
      return null
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo businessId:', error)
    return null
  }
}

// Función para cargar los enums desde el backend
async function loadEnums() {
  try {
    const enums = await getServiceEnums()
    allCategoriesFromEnum.value = enums.categories
    allTypesFromEnum.value = enums.types
    allUnitsFromEnum.value = enums.units
    
    console.log('✅ Enums cargados desde backend:', {
      categories: allCategoriesFromEnum.value,
      types: allTypesFromEnum.value,
      units: allUnitsFromEnum.value
    })
  } catch (error: any) {
    console.error('❌ Error cargando enums:', error)
  }
}

// Función para cargar datos
async function loadData() {
  try {
    loading.value = true
    
    // Cargar enums primero
    await loadEnums()
    
    if (!businesId.value) {
      await getUserBusinessId()
    }
    
    if (!businesId.value) {
      console.error('❌ No se pudo obtener el businesId')
      loading.value = false
      return
    }

    console.log('🔄 Cargando datos para businesId:', businesId.value)

    // Cargar categorías y servicios
    const [categories, services] = await Promise.all([
      getServiceCategories(businesId.value),
      getListServices(businesId.value)
    ])

    serviceCategories.value = categories
    listServices.value = services

    console.log('✅ Datos cargados exitosamente:')
    console.log('📋 Categorías:', categories)
    console.log('🛠️ Servicios:', services)
    console.log('📊 Total de servicios:', services.length)

    // Verificar cada servicio
    services.forEach((service: any, index: number) => {
      console.log(`🔍 Servicio ${index + 1} - Estructura completa:`, service)
      console.log(`🔍 Servicio ${index + 1} - Tipo exacto:`, {
        type: service.type,
        typeType: typeof service.type,
        typeUpperCase: service.type?.toUpperCase(),
        typeLowerCase: service.type?.toLowerCase()
      })
      console.log(`🔍 Servicio ${index + 1} - Categoría:`, {
        categoryId: service.servicecategory?.id,
        categoryType: service.servicecategory?.categoryType,
        categoryName: service.servicecategory?.name
      })
    })

  } catch (error: any) {
    console.error('❌ Error cargando datos:', error)
    // Mantener datos de ejemplo en caso de error
    serviceCategories.value = []
    listServices.value = []
  } finally {
    loading.value = false
  }
}

// Computed: Agrupar servicios por categoría dinámicamente
const servicesByCategory = computed(() => {
  const grouped: Record<string, any[]> = {}
  
  listServices.value.forEach((service: any) => {
    const categoryType = service.servicecategory?.categoryType
    if (categoryType) {
      if (!grouped[categoryType]) {
        grouped[categoryType] = []
      }
      grouped[categoryType].push(service)
    }
  })
  
  console.log('📊 Servicios agrupados por categoría:', grouped)
  return grouped
})

// Computed: Obtener categorías que tienen servicios (ordenadas)
const categoriesWithServices = computed(() => {
  const categories = Object.keys(servicesByCategory.value)
  console.log('📋 Categorías con servicios:', categories)
  return categories
})

// Computed: Verificar si hay algún servicio
const hasAnyServices = computed(() => listServices.value.length > 0)

// Computed: Verificar si todas las categorías ya tienen servicios
const allCategoriesHaveServices = computed(() => {
  // Contar cuántas categorías del enum tienen servicios
  const categoriesWithServicesCount = categoriesWithServices.value.length
  const totalCategories = allCategoriesFromEnum.value.length
  
  console.log('📊 Categorías con servicios vs total:', {
    withServices: categoriesWithServicesCount,
    total: totalCategories,
    allUsed: categoriesWithServicesCount >= totalCategories
  })
  
  return categoriesWithServicesCount >= totalCategories
})

// Función auxiliar para obtener el nombre de la categoría
function getCategoryDisplayName(categoryType: string): string {
  return categoryDisplayNames[categoryType] || categoryType
}

// Función auxiliar para obtener la unidad de una categoría
function getCategoryUnit(categoryType: string): string {
  // Obtener la unidad de la primera categoría de servicio con este tipo
  const categoryData = serviceCategories.value.find((cat: any) => cat.categoryType === categoryType)
  if (categoryData && categoryData.unit) {
    return unitDisplayNames[categoryData.unit] || categoryData.unit
  }
  return 'N/A'
}

// Función para verificar si todos los tipos de una categoría ya están usados
function areAllTypesUsedForCategory(categoryType: string): boolean {
  const allowedTypes = categoryToTypesMap[categoryType] || []
  const usedTypes = servicesByCategory.value[categoryType]?.map((s: any) => s.type) || []
  
  const allUsed = allowedTypes.every(type => usedTypes.includes(type))
  console.log(`📊 Verificando tipos usados para ${categoryType}:`, {
    allowedTypes,
    usedTypes,
    allUsed
  })
  
  return allUsed
}

function goBack() {
  router.push({ name: 'dashboard' })
}

function createNewCategory() {
  console.log('Crear nueva categoría de servicio')
  router.push({ name: 'create-service' })
}

function addNewService(categoryType: string) {
  console.log('Agregar nuevo servicio a categoría:', categoryType)

  // Navegar a la página de crear servicio con la categoría predefinida
  router.push({
    path: '/create-service',
    query: {
      category: categoryType
    }
  })
}

// Función auxiliar para encontrar un servicio por ID
function findServiceById(serviceId: number) {
  return listServices.value.find((service: any) => service.id === serviceId)
}

async function toggleService(serviceId: number) {
  const service = findServiceById(serviceId)
  if (!service) {
    alert('Servicio no encontrado')
    return
  }

  const newStatus = !service.isActive
  const action = newStatus ? 'activar' : 'desactivar'
  const confirmMessage = `¿Estás seguro de ${action} el servicio "${service.type}" con precio S/. ${service.basePrice}?`
  
  if (!confirm(confirmMessage)) {
    return
  }

  try {
    console.log(`🔄 ${action} servicio:`, serviceId, 'nuevo estado:', newStatus)
    await updateListService(serviceId, { isActive: newStatus })
    console.log(`✅ Servicio ${action}do exitosamente`)
    
    // Recargar los datos
    console.log('🔄 Recargando lista de servicios...')
    await loadData()
    console.log('✅ Lista de servicios recargada')
    
    alert(`Servicio ${action}do exitosamente`)
  } catch (error: any) {
    console.error(`❌ Error al ${action} servicio:`, error)
    console.error('Detalles del error:', error.response?.data || error.message)
    alert(`Error al ${action} el servicio: ${error.response?.data?.message || error.message}`)
  }
}

async function deleteService(serviceId: number) {
  const service = findServiceById(serviceId)
  if (!service) {
    alert('Servicio no encontrado')
    return
  }

  const confirmMessage = `¿Estás seguro de eliminar el servicio "${service.type}" con precio S/. ${service.basePrice}?\n\nEsta acción no se puede deshacer.`
  
  if (!confirm(confirmMessage)) {
    return
  }

  try {
    console.log('🗑️ Iniciando eliminación del servicio:', serviceId)
    const result = await deleteListService(serviceId)
    console.log('✅ Servicio eliminado exitosamente:', result)
    
    // Recargar los datos
    console.log('🔄 Recargando lista de servicios...')
    await loadData()
    console.log('✅ Lista de servicios recargada')
    
    alert('Servicio eliminado exitosamente')
  } catch (error: any) {
    console.error('❌ Error al eliminar servicio:', error)
    console.error('Detalles del error:', error.response?.data || error.message)
    alert(`Error al eliminar el servicio: ${error.response?.data?.message || error.message}`)
  }
}

function editService(serviceId: number) {
  const service = findServiceById(serviceId)
  if (!service) {
    alert('Servicio no encontrado')
    return
  }

  // Navegar a la vista de edición con los datos del servicio
  router.push({
    name: 'edit-service',
    params: { id: serviceId },
    query: {
      type: service.type,
      price: service.basePrice,
      isActive: service.isActive,
      category: service.servicecategory?.categoryType
    }
  })
}

// Función auxiliar para obtener el nombre de visualización del tipo
function getTypeDisplayName(type: string): string {
  const typeNames: { [key: string]: string } = {
    'GENERAL': 'General',
    'CASACA': 'Casaca',
    'ABRIGO': 'Abrigo',
    'CAMISA': 'Camisa',
    'TERNO': 'Terno',
    'PANTALON': 'Pantalón',
    'JEAN': 'Jean',
    'CHOMPA': 'Chompa',
    'CORBATA': 'Corbata',
    'UNO_PLAZA': 'Una Plaza',
    'UNO_MEDIO_PLAZA': 'Una Plaza y Media',
    'DOS_PLAZAS': 'Dos Plazas',
    'QUEEN': 'Queen',
    'KING': 'King',
    'OTROS': 'Otros'
  }
  return typeNames[type] || type
}

onMounted(() => {
  console.log('ListServicePresentationView montado')
  loadData()
})

onActivated(() => {
  console.log('ListServicePresentationView activado')
  loadData() // Recargar datos cuando regresemos a esta vista
})
</script>

<style scoped>
.services-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.services-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
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

.back-button:active {
  background-color: rgba(255, 107, 53, 0.2);
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.create-category-section {
  margin-bottom: 20px;
}

.create-category-btn {
  width: 100%;
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

.create-category-btn:hover:not(.disabled) {
  background-color: #ff8c5a;
}

.create-category-btn.disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
  opacity: 0.7;
}

.services-categories {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.service-category {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.category-header {
  margin-bottom: 15px;
}

.category-title {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.unit-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.unit-label {
  font-size: 14px;
  color: #666;
}

.unit-value {
  font-weight: bold;
  color: #333;
}

.add-new-btn {
  width: 100%;
  padding: 12px;
  background-color: #ff6b35;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 15px;
  transition: background-color 0.2s;
}

.add-new-btn:hover:not(:disabled) {
  background-color: #ff8c5a;
}

.add-new-btn:disabled,
.add-new-btn.disabled {
  background-color: #ccc;
  color: #666;
  cursor: not-allowed;
  opacity: 0.6;
}

.services-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.service-name {
  font-weight: 600;
  color: #333;
  flex: 1;
}

.service-type {
  font-size: 12px;
  color: #888;
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 12px;
  margin: 0 15px;
  min-width: 60px;
  text-align: center;
  font-weight: 500;
  text-transform: uppercase;
}

.service-price {
  font-size: 14px;
  color: #666;
  font-weight: 600;
  margin: 0 20px;
  min-width: 80px;
  text-align: right;
}

.service-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s;
  padding: 6px;
  border-radius: 4px;
}

.edit-btn:hover {
  transform: scale(1.1);
  background-color: #f0f8ff;
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.2s;
  padding: 6px;
  border-radius: 4px;
}

.toggle-btn.active {
  color: #ff6b35;
}

.toggle-btn:hover {
  transform: scale(1.1);
  background-color: #fff5f0;
}

.delete-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s;
  padding: 6px;
  border-radius: 4px;
}

.delete-btn:hover {
  transform: scale(1.1);
  background-color: #fff5f5;
}

.no-services-message {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.no-services-card {
  background: white;
  border-radius: 10px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 400px;
}

.no-services-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.no-services-description {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin: 0;
}

/* Responsive Design */
@media (min-width: 768px) {
  .services-container {
    max-width: 100%;
    padding: 2rem;
  }

  .services-header {
    padding: 1.5rem 2rem;
  }

  .title {
    font-size: 24px;
  }

  .create-category-btn {
    max-width: 400px;
  }

  .create-category-section {
    display: flex;
    justify-content: center;
  }

  .service-item {
    padding: 15px 20px;
  }
}

@media (min-width: 1024px) {
  .services-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem 4rem;
  }

  .services-categories {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  .service-category {
    padding: 1.5rem;
  }

  .category-title {
    font-size: 20px;
  }

  .service-item {
    padding: 15px 20px;
  }

  .service-name {
    font-size: 15px;
    min-width: 150px;
  }

  .service-type {
    font-size: 13px;
    min-width: 100px;
  }

  .service-price {
    font-size: 16px;
    min-width: 100px;
  }
}

@media (min-width: 1440px) {
  .services-container {
    max-width: 1600px;
  }

  .services-categories {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}
</style>
