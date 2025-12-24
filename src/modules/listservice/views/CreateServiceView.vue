<template>
  <div class="create-service-container">
    <!-- Header -->
    <header class="create-service-header">
      <button class="back-button" @click="goBack" title="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Crear Nuevo Servicio</h1>
    </header>

    <!-- Formulario -->
    <div class="form-container">
      <form @submit.prevent="handleSubmit" class="service-form">

        <!-- Categoría de Servicio -->
        <div class="form-group">
          <label for="categoryType" class="form-label">
            Categoría de Servicio
            <span v-if="isCategoryLocked" class="locked-indicator">(Bloqueada)</span>
          </label>
          
          <!-- Si la categoría está bloqueada, mostrar como campo de solo lectura -->
          <div v-if="isCategoryLocked" class="form-input-readonly">
            {{ categoryDisplayNames[form.categoryType] || form.categoryType }}
          </div>
          
          <!-- Si no está bloqueada, mostrar el select normal -->
          <select
            v-else
            id="categoryType"
            v-model="form.categoryType"
            class="form-input"
            required
            @change="onCategoryChange"
          >
            <option value="">Seleccionar categoría</option>
            <option 
              v-for="category in availableCategories" 
              :key="category.value" 
              :value="category.value"
            >
              {{ category.label }}
            </option>
          </select>
          <p v-if="isCategoryLocked" class="locked-message">
            ℹ️ La categoría no se puede cambiar porque ya existen servicios de esta categoría.
          </p>
        </div>

        <!-- Tipo -->
        <div class="form-group">
          <label for="typeName" class="form-label">
            Tipo
            <span v-if="usedTypes.length > 0" class="used-types-info">
              ({{ usedTypes.length }} tipo{{ usedTypes.length > 1 ? 's' : '' }} ya usado{{ usedTypes.length > 1 ? 's' : '' }})
            </span>
          </label>
          <select
            id="typeName"
            v-model="form.typeName"
            class="form-input"
            required
          >
            <option value="">Seleccionar tipo</option>
            <option 
              v-for="type in availableTypes" 
              :key="type" 
              :value="type"
            >
              {{ getTypeDisplayName(type) }}
            </option>
            <option 
              v-for="type in usedTypes" 
              :key="type" 
              :value="type"
              disabled
              class="used-option"
            >
              {{ getTypeDisplayName(type) }} (Ya usado)
            </option>
          </select>
          <p v-if="availableTypes.length === 0" class="no-available-types">
            ⚠️ Todos los tipos de servicios ya han sido creados para esta categoría.
          </p>
        </div>

        <!-- Unidad de Medida -->
        <div class="form-group">
          <label for="unitMeasure" class="form-label">Unidad de Medida</label>
          <input
            id="unitMeasure"
            type="text"
            class="form-input"
            :value="form.unitMeasure ? (unitDisplayNames[form.unitMeasure] || form.unitMeasure) : 'Seleccione una categoría primero'"
            readonly
            disabled
          />
          <p class="unit-info">ℹ️ La unidad se asigna automáticamente según la categoría seleccionada</p>
        </div>

        <!-- Precio x Unidad de Medida -->
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

        <!-- Botón Guardar -->
        <div class="form-actions">
          <button
            type="submit"
            class="save-btn"
            :disabled="loading"
          >
            {{ loading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createServiceCategory, createListService, getListServices, getServiceCategories, getServiceEnums } from '@/api/lavanderiaApi'
import { lavanderiaApi } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)
const isCategoryLocked = ref(false)
const availableTypes = ref<string[]>([])
const usedTypes = ref<string[]>([])
const serviceCategories = ref([])
const listServices = ref([])
const businesId = ref<number | null>(null)

// Enums cargados desde el backend
const allCategoriesFromEnum = ref<string[]>([])
const allTypesFromEnum = ref<string[]>([])
const allUnitsFromEnum = ref<string[]>([])

// Formulario reactivo
const form = reactive({
  categoryType: '',
  typeName: '',
  unitMeasure: '',
  price: ''
})

// Mapeo de categorías a unidades de medida
const categoryToUnitMap: Record<string, string> = {
  'LAVADO': 'KILOGRAM',
  'LAVADO_ESPECIAL': 'UNIT',
  'LAVADO_EN_SECO': 'UNIT',
  'PLANCHADO': 'UNIT',
  'FRAZADAS': 'UNIT',
  'EDREDONES': 'UNIT',
  'ZAPATILLAS': 'PAIR',
  'ALFOMBRAS': 'METER',
  'CORTINAS': 'METER'
}

// Mapeo de categorías a tipos permitidos
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

// Computed para obtener las categorías disponibles (que no están en uso)
const availableCategories = computed(() => {
  const services = listServices.value
  
  // Obtener categorías que ya tienen servicios
  const categoriesInUse = services.map((service: any) => service.servicecategory?.categoryType)
  
  // Filtrar categorías que no están en uso
  const available = allCategoriesFromEnum.value
    .filter(cat => !categoriesInUse.includes(cat))
    .map(cat => ({
      value: cat,
      label: categoryDisplayNames[cat] || cat
    }))
  
  console.log('🔍 Categorías disponibles (no en uso):', available)
  console.log('🔍 Categorías en uso:', categoriesInUse)
  
  return available
})

// Función para manejar el cambio de categoría
async function onCategoryChange() {
  // Asignar la unidad de medida según la categoría seleccionada
  if (form.categoryType && categoryToUnitMap[form.categoryType]) {
    form.unitMeasure = categoryToUnitMap[form.categoryType]
    console.log('🔄 Unidad asignada:', form.unitMeasure, 'para categoría:', form.categoryType)
  }
  
  // Limpiar el tipo seleccionado cuando cambia la categoría
  form.typeName = ''
  
  // Cargar los tipos disponibles para la nueva categoría
  if (form.categoryType && businesId.value) {
    console.log('🔄 Cargando tipos para categoría:', form.categoryType)
    await loadUsedServiceTypes(businesId.value, form.categoryType)
  }
}

// Función para obtener el nombre de visualización del tipo
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

// Función para cargar los tipos de servicios usados
async function loadUsedServiceTypes(businesId: number, categoryType: string) {
  try {
    console.log('🔍 Cargando tipos usados para businesId:', businesId, 'categoryType:', categoryType)
    const existingServices = await getListServices(businesId)
    console.log('📋 Servicios existentes (total):', existingServices.length)
    console.log('📋 Todos los servicios:', existingServices)
    
    // Obtener los tipos ya usados en la misma categoría (incluyendo activos e inactivos)
    // Esto evita que se puedan crear servicios duplicados aunque estén inactivos
    const servicesInCategory = existingServices.filter((service: any) => {
      const matches = service.servicecategory && 
        service.servicecategory.categoryType === categoryType
      
      if (matches) {
        console.log(`✅ Servicio encontrado en categoría ${categoryType}:`, {
          id: service.id,
          type: service.type,
          typeNormalized: String(service.type).toUpperCase(),
          isActive: service.isActive,
          categoryType: service.servicecategory?.categoryType
        })
      }
      
      return matches
    })
    
    console.log(`📊 Servicios en categoría ${categoryType}:`, servicesInCategory.length)
    
    // Primero, obtener los tipos normalizados para comparación
    const usedNormalized = servicesInCategory
      .map((service: any) => {
        // Normalizar el tipo a mayúsculas y trim para comparación
        const normalizedType = String(service.type || '').trim().toUpperCase()
        console.log(`  - Tipo: "${service.type}" -> Normalizado: "${normalizedType}"`)
        return normalizedType
      })
      .filter((type, index, self) => {
        // Eliminar duplicados y valores vacíos
        return type && self.indexOf(type) === index
      })
    
    // Guardar los tipos usados en formato normalizado para comparación
    const used = usedNormalized
    
    // Para mostrar en el template, convertir a formato original si es posible
    usedTypes.value = usedNormalized.map(normalizedType => {
      // Intentar encontrar el tipo original en el mapeo
      const originalType = categoryToTypesMap[categoryType]?.find(ot => 
        String(ot).trim().toUpperCase() === normalizedType
      )
      return originalType || normalizedType
    })
    
    // Obtener los tipos permitidos para esta categoría específica
    const allowedTypesForCategory = (categoryToTypesMap[categoryType] || []).map(t => String(t).trim().toUpperCase())
    console.log('📋 Tipos permitidos para categoría', categoryType, ':', allowedTypesForCategory)
    console.log('📋 Tipos permitidos (originales):', categoryToTypesMap[categoryType])
    
    // Filtrar los tipos disponibles (permitidos y no usados)
    // Comparar en mayúsculas para evitar problemas de case-sensitivity
    const availableTypesNormalized = allowedTypesForCategory.filter(type => {
      const isUsed = used.includes(type)
      console.log(`  - Tipo "${type}": ${isUsed ? 'USADO' : 'DISPONIBLE'}`)
      return !isUsed
    })
    
    availableTypes.value = availableTypesNormalized.map(t => {
      // Devolver el tipo en el formato original del mapeo
      const originalType = categoryToTypesMap[categoryType]?.find(ot => String(ot).trim().toUpperCase() === t)
      const result = originalType || t
      console.log(`  - Mapeando "${t}" -> "${result}"`)
      return result
    })
    
    console.log('✅ Tipos usados:', used)
    console.log('✅ Tipos usados (array):', JSON.stringify(used))
    console.log('✅ Tipos permitidos (normalizados):', JSON.stringify(allowedTypesForCategory))
    console.log('✅ Tipos disponibles (normalizados):', JSON.stringify(availableTypesNormalized))
    console.log('✅ Tipos disponibles (originales):', availableTypes.value)
    console.log('✅ Total tipos disponibles:', availableTypes.value.length)
    
    // Verificación adicional: comparar cada tipo permitido individualmente
    console.log('🔍 Verificación detallada por tipo:')
    categoryToTypesMap[categoryType]?.forEach(originalType => {
      const normalized = String(originalType).trim().toUpperCase()
      const isInUsed = used.includes(normalized)
      const isInAvailable = availableTypes.value.includes(originalType)
      console.log(`  - "${originalType}" (normalizado: "${normalized}"): usado=${isInUsed}, disponible=${isInAvailable}`)
    })
    
    // Si no hay tipos disponibles, mostrar un mensaje de advertencia
    if (availableTypes.value.length === 0) {
      console.warn('⚠️ No hay tipos disponibles para la categoría', categoryType)
      console.warn('⚠️ Todos los tipos permitidos están usados:', allowedTypesForCategory)
      console.warn('⚠️ Tipos usados encontrados:', used)
    }
    
  } catch (error) {
    console.error('❌ Error al cargar tipos de servicios:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available')
    // En caso de error, mostrar los tipos permitidos para la categoría
    availableTypes.value = categoryToTypesMap[categoryType] || []
    usedTypes.value = []
  }
}

// Función para validar si el tipo de servicio ya existe
async function validateServiceType(serviceType: string, businesId: number, categoryType: string): Promise<boolean> {
  try {
    const existingServices = await getListServices(businesId)
    
    // Normalizar el tipo a comparar
    const normalizedServiceType = String(serviceType).toUpperCase()
    
    // Verificar si ya existe un servicio con el mismo tipo en la misma categoría
    // (incluyendo activos e inactivos para evitar duplicados)
    const typeExists = existingServices.some((service: any) => {
      // Normalizar el tipo del servicio existente
      const normalizedExistingType = String(service.type).toUpperCase()
      
      // Verificar que tenga el mismo tipo (comparación case-insensitive)
      if (normalizedExistingType !== normalizedServiceType) {
        return false
      }
      
      // Verificar que pertenezca a la misma categoría
      if (service.servicecategory) {
        const serviceCategoryType = service.servicecategory.categoryType
        return serviceCategoryType === categoryType
      }
      
      return false
    })
    
    return typeExists
  } catch (error) {
    console.error('Error al validar tipo de servicio:', error)
    return false
  }
}

// Función para obtener el businessId del usuario logueado
async function getUserBusinessId() {
  try {
    const user = authStore.user
    const { data } = await lavanderiaApi.get('/busines')
    console.log('📦 Todos los negocios:', data)
    console.log('👤 Usuario actual:', { id: user?.id, role: user?.role })
    
    if (!user) {
      console.error('❌ No hay usuario autenticado')
      return null
    }
    
    // Para ADMIN, buscar su negocio específico
    if (user.role === 'ADMIN') {
      const userBusiness = data.find((b: any) => b.userId === user.id)
      if (userBusiness) {
        businesId.value = userBusiness.id
        console.log('✅ BusinessId del ADMIN obtenido:', businesId.value, '| Negocio:', userBusiness.name)
        return businesId.value
      } else {
        console.error('❌ El ADMIN no tiene un negocio registrado')
        alert('No tienes un negocio registrado. Por favor, crea un negocio primero.')
        router.push({ name: 'business-register' })
        return null
      }
    } else if (user.role === 'SUPERADMIN') {
      // Para SUPERADMIN, usar el primer negocio disponible
      if (data && data.length > 0) {
        businesId.value = data[0].id
        console.log('✅ BusinessId del SUPERADMIN obtenido:', businesId.value)
        return businesId.value
      } else {
        console.error('❌ No hay negocios registrados')
        alert('No hay negocios registrados en el sistema.')
        return null
      }
    } else {
      console.error('❌ Rol no permitido para crear servicios:', user.role)
      return null
    }
  } catch (error) {
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
  } catch (error) {
    console.error('❌ Error cargando enums:', error)
  }
}

// Función para cargar datos de servicios y categorías
async function loadData() {
  try {
    if (!businesId.value) {
      await getUserBusinessId()
    }
    
    if (!businesId.value) {
      console.error('❌ No se pudo obtener el businesId')
      return
    }
    
    const [categories, services] = await Promise.all([
      getServiceCategories(businesId.value),
      getListServices(businesId.value)
    ])
    
    serviceCategories.value = categories
    listServices.value = services
    
    console.log('✅ Datos cargados en CreateServiceView:', { categories, services })
  } catch (error) {
    console.error('❌ Error cargando datos en CreateServiceView:', error)
  }
}

// Función para pre-llenar el formulario basado en los parámetros de la URL
async function prefillForm() {
  // Cargar enums primero
  await loadEnums()
  
  // Luego cargar datos de servicios
  await loadData()
  
  const category = route.query.category as string

  if (category) {
    // Si viene una categoría en la URL, significa que ya existe una categoría creada
    // Por lo tanto, bloqueamos la categoría para que no se pueda cambiar
    isCategoryLocked.value = true
    form.categoryType = category
    
    console.log('📝 Categoría precargada desde URL:', category)
    
    // Asignar la unidad de medida automáticamente
    if (categoryToUnitMap[category]) {
      form.unitMeasure = categoryToUnitMap[category]
    }
    
    // Cargar los tipos de servicios usados para esta categoría
    if (businesId.value) {
      await loadUsedServiceTypes(businesId.value, category)
    }
  } else {
    // Si no hay parámetros de URL, es una nueva categoría
    // Los tipos se cargarán cuando el usuario seleccione una categoría
    console.log('🆕 Creando nueva categoría - tipos se cargarán al seleccionar categoría')
    availableTypes.value = []
    usedTypes.value = []
  }
}

// Watcher para actualizar tipos disponibles cuando cambie la categoría
watch(() => form.categoryType, (newCategoryType) => {
  if (newCategoryType && !isCategoryLocked.value) {
    console.log('🔄 Categoría cambiada a:', newCategoryType)
    if (businesId.value) {
      loadUsedServiceTypes(businesId.value, newCategoryType)
    }
  }
})

// Pre-llenar el formulario cuando se monta el componente
onMounted(() => {
  prefillForm()
})

function goBack() {
  router.push({ name: 'list-presentation' })
}

async function handleSubmit() {
  try {
    loading.value = true

    // Validaciones básicas
    if (!form.categoryType) {
      alert('Debe seleccionar una categoría de servicio')
      return
    }



    if (!form.typeName) {
      alert('Debe seleccionar un tipo')
      return
    }

    if (!form.unitMeasure) {
      alert('Debe seleccionar una unidad de medida')
      return
    }

    if (!form.price || parseFloat(form.price) <= 0) {
      alert('El precio debe ser mayor a 0')
      return
    }

    // Validar que tengamos businesId
    if (!businesId.value) {
      console.error('❌ No se ha obtenido el businesId')
      alert('Error: No se pudo identificar el negocio')
      return
    }

    // Validar si el tipo de servicio ya existe en la misma categoría
    const typeExists = await validateServiceType(form.typeName, businesId.value, form.categoryType)
    if (typeExists) {
      const categoryName = categoryDisplayNames[form.categoryType] || form.categoryType
      const typeName = getTypeDisplayName(form.typeName)
      alert(`El tipo de servicio "${typeName}" ya existe en la categoría "${categoryName}". No se puede crear un servicio duplicado con diferente precio.`)
      return
    }

    let servicecategoryId

    if (isCategoryLocked.value) {
      // Si la categoría está bloqueada, significa que ya existe
      // Necesitamos obtener el ID de la categoría existente
      try {
        const categories = await getServiceCategories(businesId.value!)
        const existingCategory = categories.find((cat: any) => cat.categoryType === form.categoryType)
        
        if (existingCategory) {
          servicecategoryId = existingCategory.id
          console.log('✅ Usando categoría existente con ID:', servicecategoryId, 'Tipo:', form.categoryType)
        } else {
          throw new Error(`No se encontró la categoría ${form.categoryType}`)
        }
      } catch (error) {
        console.error('❌ Error al obtener categoría existente:', error)
        alert('Error al obtener la categoría existente')
        return
      }
    } else {
      // Crear la categoría de servicio solo si no existe
      const categoryData = {
        name: categoryDisplayNames[form.categoryType] || form.categoryType,
        categoryType: form.categoryType,
        unit: form.unitMeasure,
        businesId: businesId.value
      }

      console.log('📝 Creando nueva categoría:', categoryData)
      const createdCategory = await createServiceCategory(categoryData)
      console.log('✅ Categoría creada:', createdCategory)
      servicecategoryId = createdCategory.id
    }

    // Crear el servicio
    const serviceData = {
      type: form.typeName as any, // Asegurar que el tipo coincida con el enum
      basePrice: parseFloat(form.price),
      isActive: true,
      servicecategoryId: servicecategoryId
    }

    console.log('📝 Datos del servicio a crear:', serviceData)
    console.log('📝 Tipo de servicio:', typeof serviceData.type, serviceData.type)
    console.log('📝 Precio:', typeof serviceData.basePrice, serviceData.basePrice)
    console.log('📝 Categoría ID:', typeof serviceData.servicecategoryId, serviceData.servicecategoryId)

    const createdService = await createListService(serviceData)
    console.log('✅ Servicio creado exitosamente:', createdService)
    console.log('📊 Datos del servicio creado:', {
      id: createdService.id,
      type: createdService.type,
      basePrice: createdService.basePrice,
      servicecategoryId: createdService.servicecategoryId
    })

    alert('Servicio guardado exitosamente')

    // Regresar a la vista de servicios
    router.push({ name: 'list-presentation' })

  } catch (error: any) {
    console.error('Error al guardar servicio:', error)
    
    let errorMessage = 'Error al guardar el servicio'
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    alert(errorMessage)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.create-service-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.create-service-header {
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

.back-button:active {
  background-color: rgba(255, 107, 53, 0.2);
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

.form-input::placeholder {
  color: #999;
}

.form-input[readonly] {
  background-color: #f8f9fa;
  color: #666;
  cursor: not-allowed;
}

.form-input:disabled {
  background-color: #f8f9fa;
  color: #666;
  cursor: not-allowed;
}

.form-input-readonly {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-color: #f8f9fa;
  color: #333;
  font-weight: 500;
  cursor: default;
}

.form-actions {
  margin-top: 20px;
}

.save-btn {
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

.save-btn:hover:not(:disabled) {
  background-color: #ff8c5a;
}

.save-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.locked-indicator {
  color: #ff6b35;
  font-size: 12px;
  font-weight: normal;
}

.locked-field {
  background-color: #f8f9fa !important;
  color: #666 !important;
  cursor: not-allowed !important;
  border-color: #ddd !important;
}

.locked-message {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  font-style: italic;
}

.used-types-info {
  color: #ff6b35;
  font-size: 12px;
  font-weight: normal;
}

.used-option {
  color: #999 !important;
  background-color: #f5f5f5 !important;
}

.no-available-types {
  font-size: 12px;
  color: #ff6b35;
  margin-top: 5px;
  font-weight: 500;
}

.unit-info {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  font-style: italic;
}
</style>
