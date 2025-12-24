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

    <!-- Botón Crear Nueva Categoría (solo para ADMIN/COLABORADOR) -->
    <div v-if="authStore.user?.role !== 'SUPERADMIN'" class="create-category-section">
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

    <!-- SUPERADMIN: Servicios agrupados por negocio y punto de venta -->
    <div v-if="authStore.user?.role === 'SUPERADMIN' && hasAnyServices" class="services-by-business">
      <div class="business-section" v-for="(businessData, businessId) in servicesByBusinessAndPointSale" :key="businessId">
        <div class="business-header">
          <h2 class="business-title">{{ businessData.business.comercialname || businessData.business.name }}</h2>
          <p class="business-subtitle">{{ businessData.business.name }}</p>
        </div>

        <!-- Puntos de Venta del Negocio -->
        <div class="pointsales-section">
          <div class="pointsale-section" v-for="(pointsaleData, pointsaleId) in businessData.pointsales" :key="pointsaleId">
            <div class="pointsale-header">
              <h3 class="pointsale-title">{{ pointsaleData.pointsale.name }}</h3>
              <p class="pointsale-address">{{ pointsaleData.pointsale.address }}</p>
            </div>

            <!-- Agrupar servicios del punto de venta por categoría -->
            <div class="services-categories">
              <div class="service-category" v-for="categoryType in getCategoriesForBusiness(pointsaleData.services)" :key="categoryType">
                <div class="category-header">
                  <h4 class="category-title">{{ getCategoryDisplayName(categoryType) }}</h4>
                  <div class="unit-info">
                    <span class="unit-label">Unidad medida:</span>
                    <span class="unit-value">{{ getCategoryUnit(categoryType) }}</span>
                  </div>
                </div>

                <div class="services-list">
                  <div class="service-item" v-for="service in getServicesForCategory(pointsaleData.services, categoryType)" :key="`${service.id}-${pointsaleId}`">
                    <span class="service-name">{{ service.servicecategory?.name || 'Sin nombre' }}</span>
                    <span class="service-type">{{ getTypeDisplayName(service.type) }}</span>
                    <span class="service-price">
                      <span class="price-label">Precio:</span>
                      <span class="price-value" :class="{ 'custom-price': service.personalizedPrice && service.personalizedPrice !== service.basePrice }">
                        S/. {{ service.personalizedPrice || service.basePrice }}
                      </span>
                      <span v-if="service.personalizedPrice && service.personalizedPrice !== service.basePrice" class="base-price-hint">
                        (Base: S/. {{ service.basePrice }})
                      </span>
                    </span>
                    <div class="service-actions">
                      <button class="edit-btn" @click="editService(service.id)" title="Editar">
                        ✏️
                      </button>
                      <button class="toggle-btn" :class="{ active: service.isActive }" @click="toggleService(service.id)" title="Activar/Desactivar servicio">
                        {{ service.isActive ? '🔘' : '⚪' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ADMIN: Servicios agrupados por punto de venta -->
    <div v-else-if="authStore.user?.role === 'ADMIN' && hasAnyServices" class="services-by-pointsale">
      <div class="pointsale-section" v-for="(pointsaleData, pointsaleId) in servicesByPointSale" :key="pointsaleId">
        <div class="pointsale-header">
          <h2 class="pointsale-title">{{ pointsaleData.pointsale.name }}</h2>
          <p class="pointsale-address">{{ pointsaleData.pointsale.address }}</p>
        </div>

        <!-- Agrupar servicios del punto de venta por categoría -->
        <div class="services-categories">
          <div class="service-category" v-for="categoryType in getCategoriesForBusiness(pointsaleData.services)" :key="categoryType">
            <div class="category-header">
              <h3 class="category-title">{{ getCategoryDisplayName(categoryType) }}</h3>
              <div class="unit-info">
                <span class="unit-label">Unidad medida:</span>
                <span class="unit-value">{{ getCategoryUnit(categoryType) }}</span>
              </div>
            </div>

            <div class="services-list">
              <div class="service-item" v-for="service in getServicesForCategory(pointsaleData.services, categoryType)" :key="service.id">
                <span class="service-name">{{ service.servicecategory?.name || 'Sin nombre' }}</span>
                <span class="service-type">{{ getTypeDisplayName(service.type) }}</span>
                <span class="service-price">
                  <span class="price-label">Precio:</span>
                  <span class="price-value" :class="{ 'custom-price': service.personalizedPrice && service.personalizedPrice !== service.basePrice }">
                    S/. {{ service.personalizedPrice || service.basePrice }}
                  </span>
                  <span v-if="service.personalizedPrice && service.personalizedPrice !== service.basePrice" class="base-price-hint">
                    (Base: S/. {{ service.basePrice }})
                  </span>
                </span>
                <div class="service-actions">
                  <button class="edit-btn" @click="editService(service.id)" title="Editar">
                    ✏️
                  </button>
                  <button class="toggle-btn" :class="{ active: service.isActive }" @click="toggleService(service.id)" title="Activar/Desactivar servicio">
                    {{ service.isActive ? '🔘' : '⚪' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- COLABORADOR: Categorías de Servicios (Dinámicas) -->
    <div v-else-if="hasAnyServices" class="services-categories">

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
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { getServiceCategories, getListServices, deleteListService, updateListService, lavanderiaApi, getServiceEnums, getAllPointSales } from '@/api/lavanderiaApi'

const router = useRouter()
const authStore = useAuthStore()

// Datos reales desde la API
const serviceCategories = ref<any[]>([])
const listServices = ref<any[]>([])
const loading = ref(false)
const businesId = ref<number | null>(null)
const allPointSales = ref<any[]>([]) // Para ADMIN: todos los puntos de venta del negocio

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

// Mapeo de categorías a unidades por defecto (fallback si no se encuentra en la BD)
const categoryToDefaultUnit: Record<string, string> = {
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
    
    const isSuperAdmin = authStore.user?.role === 'SUPERADMIN'
    
    if (isSuperAdmin) {
      // SUPERADMIN: cargar todos los servicios de todos los negocios
      console.log('🔑 SUPERADMIN - Cargando todos los servicios')
      const services = await getListServices(null)
      listServices.value = services
      serviceCategories.value = []
      
      console.log('✅ Datos cargados exitosamente (SUPERADMIN):')
      console.log('🛠️ Servicios:', services)
      console.log('📊 Total de servicios:', services.length)
    } else {
      // ADMIN/COLABORADOR: cargar servicios de su negocio
      if (!businesId.value) {
        await getUserBusinessId()
      }
      
      if (!businesId.value) {
        console.error('❌ No se pudo obtener el businesId')
        loading.value = false
        return
      }

      console.log('🔄 Cargando datos para businesId:', businesId.value)

      // Cargar categorías, servicios y puntos de venta
      const [categories, services, pointSales] = await Promise.all([
        getServiceCategories(businesId.value),
        getListServices(businesId.value),
        getAllPointSales()
      ])

      serviceCategories.value = categories
      listServices.value = services
      
      // Filtrar puntos de venta del negocio del ADMIN
      if (authStore.user?.role === 'ADMIN') {
        allPointSales.value = pointSales.filter((ps: any) => ps.businesId === businesId.value)
        console.log('📍 Puntos de venta del negocio:', allPointSales.value)
      }

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
    }

  } catch (error: any) {
    console.error('❌ Error cargando datos:', error)
    // Mantener datos de ejemplo en caso de error
    serviceCategories.value = []
    listServices.value = []
  } finally {
    loading.value = false
  }
}

// Computed: Agrupar servicios por negocio y punto de venta (para SUPERADMIN)
const servicesByBusinessAndPointSale = computed(() => {
  if (authStore.user?.role !== 'SUPERADMIN') {
    return {}
  }
  
  const grouped: Record<number, { 
    business: any, 
    pointsales: Record<number, {
      pointsale: any,
      services: any[]
    }>
  }> = {}
  
  // Primero, obtener todos los puntos de venta de cada negocio
  const businessPointsales: Record<number, any[]> = {}
  
  listServices.value.forEach((service: any) => {
    const business = service.servicecategory?.busines
    if (business) {
      const businessId = business.id
      if (!businessPointsales[businessId]) {
        businessPointsales[businessId] = []
      }
      
      // Recopilar todos los puntos de venta únicos del negocio
      if (service.pointsaleServices && service.pointsaleServices.length > 0) {
        service.pointsaleServices.forEach((ps: any) => {
          if (!businessPointsales[businessId].find((p: any) => p.id === ps.pointsale.id)) {
            businessPointsales[businessId].push(ps.pointsale)
          }
        })
      }
      
      // También incluir puntos de venta del negocio desde business.pointsales si están disponibles
      if (business.pointsales && business.pointsales.length > 0) {
        business.pointsales.forEach((ps: any) => {
          if (!businessPointsales[businessId].find((p: any) => p.id === ps.id)) {
            businessPointsales[businessId].push(ps)
          }
        })
      }
    }
  })
  
  // Ahora agrupar servicios por negocio y punto de venta
  listServices.value.forEach((service: any) => {
    const business = service.servicecategory?.busines
    if (business) {
      const businessId = business.id
      if (!grouped[businessId]) {
        grouped[businessId] = {
          business: business,
          pointsales: {}
        }
        
        // Inicializar puntos de venta del negocio
        if (businessPointsales[businessId]) {
          businessPointsales[businessId].forEach((ps: any) => {
            grouped[businessId].pointsales[ps.id] = {
              pointsale: ps,
              services: []
            }
          })
        }
      }
      
      // Agrupar por punto de venta usando pointsaleServices
      if (service.pointsaleServices && service.pointsaleServices.length > 0) {
        service.pointsaleServices.forEach((ps: any) => {
          const pointsaleId = ps.pointsale.id
          if (!grouped[businessId].pointsales[pointsaleId]) {
            grouped[businessId].pointsales[pointsaleId] = {
              pointsale: ps.pointsale,
              services: []
            }
          }
          // Agregar servicio con precio personalizado del punto de venta
          grouped[businessId].pointsales[pointsaleId].services.push({
            ...service,
            personalizedPrice: ps.price,
            isActiveInPointSale: ps.isActive,
            pointsaleServiceId: ps.id
          })
        })
      } else {
        // Si el servicio no tiene personalización, agregarlo a todos los puntos de venta del negocio con precio base
        Object.keys(grouped[businessId].pointsales).forEach((pointsaleIdStr: string) => {
          const pointsaleId = parseInt(pointsaleIdStr)
          grouped[businessId].pointsales[pointsaleId].services.push({
            ...service,
            personalizedPrice: null,
            isActiveInPointSale: service.isActive,
            pointsaleServiceId: null
          })
        })
      }
    }
  })
  
  console.log('📊 Servicios agrupados por negocio y punto de venta:', grouped)
  return grouped
})

// Computed: Agrupar servicios por punto de venta (para ADMIN)
const servicesByPointSale = computed(() => {
  if (authStore.user?.role !== 'ADMIN') {
    return {}
  }
  
  const grouped: Record<number, {
    pointsale: any,
    services: any[]
  }> = {}
  
  // Inicializar todos los puntos de venta del negocio
  allPointSales.value.forEach((ps: any) => {
    grouped[ps.id] = {
      pointsale: ps,
      services: []
    }
  })
  
  // Agrupar servicios por punto de venta
  listServices.value.forEach((service: any) => {
    // Obtener los puntos de venta donde este servicio está personalizado
    const personalizedPointSaleIds = new Set<number>()
    
    if (service.pointsaleServices && service.pointsaleServices.length > 0) {
      service.pointsaleServices.forEach((ps: any) => {
        const pointsaleId = ps.pointsale.id
        personalizedPointSaleIds.add(pointsaleId)
        
        // Agregar servicio personalizado solo si el punto de venta está en la lista del negocio
        if (grouped[pointsaleId]) {
          // Verificar que no esté duplicado
          const alreadyExists = grouped[pointsaleId].services.some((s: any) => 
            s.id === service.id && s.pointsaleServiceId === ps.id
          )
          
          if (!alreadyExists) {
            grouped[pointsaleId].services.push({
              ...service,
              personalizedPrice: ps.price,
              isActiveInPointSale: ps.isActive,
              pointsaleServiceId: ps.id
            })
          }
        }
      })
    }
    
    // Para servicios sin personalización, agregarlos solo a los puntos de venta que no tienen personalización
    // O si no hay ningún punto de venta con personalización, agregarlo a todos
    Object.keys(grouped).forEach((pointsaleIdStr: string) => {
      const pointsaleId = parseInt(pointsaleIdStr)
      
      // Solo agregar si no tiene personalización para este punto de venta
      if (!personalizedPointSaleIds.has(pointsaleId)) {
        // Verificar que no esté duplicado
        const alreadyExists = grouped[pointsaleId].services.some((s: any) => 
          s.id === service.id && s.pointsaleServiceId === null
        )
        
        if (!alreadyExists) {
          grouped[pointsaleId].services.push({
            ...service,
            personalizedPrice: null,
            isActiveInPointSale: service.isActive,
            pointsaleServiceId: null
          })
        }
      }
    })
  })
  
  console.log('📊 Servicios agrupados por punto de venta:', grouped)
  console.log('📊 Resumen por punto de venta:')
  Object.keys(grouped).forEach((pointsaleIdStr: string) => {
    const pointsaleId = parseInt(pointsaleIdStr)
    const pointsaleData = grouped[pointsaleId]
    console.log(`  - Punto de venta ${pointsaleId} (${pointsaleData.pointsale.name}): ${pointsaleData.services.length} servicios`)
    
    // Agrupar por categoría para verificar duplicados
    const servicesByCategory: Record<string, number> = {}
    pointsaleData.services.forEach((s: any) => {
      const catType = s.servicecategory?.categoryType || 'SIN_CATEGORIA'
      servicesByCategory[catType] = (servicesByCategory[catType] || 0) + 1
    })
    console.log(`    Categorías:`, servicesByCategory)
  })
  
  return grouped
})

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
    // Normalizar la unidad a mayúsculas para coincidir con el mapeo
    const unitKey = String(categoryData.unit).toUpperCase()
    const displayName = unitDisplayNames[unitKey]
    
    if (displayName) {
      return displayName
    }
    
    // Si no está en el mapeo, devolver el valor original
    return categoryData.unit
  }
  
  // Fallback 1: intentar obtener la unidad desde los servicios de esta categoría
  const servicesInCategory = servicesByCategory.value[categoryType]
  if (servicesInCategory && servicesInCategory.length > 0) {
    const firstService = servicesInCategory[0]
    if (firstService.servicecategory && firstService.servicecategory.unit) {
      const unitKey = String(firstService.servicecategory.unit).toUpperCase()
      const displayName = unitDisplayNames[unitKey]
      if (displayName) {
        return displayName
      }
      return firstService.servicecategory.unit
    }
  }
  
  // Fallback 2: usar el mapeo de categorías a unidades por defecto
  const defaultUnit = categoryToDefaultUnit[categoryType]
  if (defaultUnit) {
    const displayName = unitDisplayNames[defaultUnit]
    if (displayName) {
      return displayName
    }
    return defaultUnit
  }
  
  // Fallback final: devolver 'Unidad (pieza)' como valor por defecto
  return 'Unidad (pieza)'
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

// Función auxiliar para obtener las categorías únicas de los servicios de un negocio
function getCategoriesForBusiness(services: any[]): string[] {
  const categories = new Set<string>()
  services.forEach((service: any) => {
    const categoryType = service.servicecategory?.categoryType
    if (categoryType) {
      categories.add(categoryType)
    }
  })
  return Array.from(categories)
}

// Función auxiliar para obtener los servicios de una categoría específica
function getServicesForCategory(services: any[], categoryType: string): any[] {
  return services.filter((service: any) => 
    service.servicecategory?.categoryType === categoryType
  )
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
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
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
  width: 100%;
  box-sizing: border-box;
}

.service-category {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
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
  width: 100%;
  box-sizing: border-box;
  flex-wrap: wrap;
  gap: 8px;
  overflow: hidden;
}

.service-name {
  font-weight: 600;
  color: #333;
  flex: 1;
  min-width: 100px;
  word-break: break-word;
}

.service-type {
  font-size: 12px;
  color: #888;
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 12px;
  margin: 0 8px;
  min-width: 60px;
  text-align: center;
  font-weight: 500;
  text-transform: uppercase;
  flex-shrink: 0;
}

.service-price {
  font-size: 14px;
  color: #666;
  font-weight: 600;
  margin: 0 8px;
  min-width: 120px;
  max-width: 150px;
  text-align: right;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.price-label {
  font-size: 11px;
  color: #999;
  font-weight: 400;
}

.price-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.price-value.custom-price {
  color: #ff6b35;
  font-weight: 700;
}

.base-price-hint {
  font-size: 10px;
  color: #999;
  font-weight: 400;
  font-style: italic;
}

.service-actions {
  display: flex !important;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex: 0 0 auto;
  min-width: 80px;
  max-width: 100px;
  justify-content: flex-end;
  visibility: visible !important;
  opacity: 1 !important;
  position: relative;
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
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .service-actions {
    min-width: 100px !important;
    gap: 12px;
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  .edit-btn,
  .toggle-btn {
    font-size: 20px;
    padding: 8px;
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
}

@media (min-width: 1024px) {
  .services-container {
    padding: 2rem;
    max-width: 100%;
  }

  .services-categories {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  .service-category {
    padding: 1.5rem;
    min-width: 0; /* Permite que el grid item se ajuste */
    overflow: visible;
  }

  .category-title {
    font-size: 20px;
  }

  .service-item {
    padding: 15px 20px;
    flex-wrap: nowrap;
    overflow: visible;
    display: grid !important;
    grid-template-columns: 2fr 1fr 1.5fr auto;
    gap: 12px;
    align-items: center;
  }

  .service-name {
    font-size: 15px;
    min-width: 0;
    flex: none !important;
    grid-column: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .service-type {
    font-size: 13px;
    min-width: 0;
    flex: none !important;
    grid-column: 2;
    margin: 0 !important;
    justify-self: center;
    max-width: 100%;
  }

  .service-price {
    font-size: 16px;
    min-width: 0;
    flex: none !important;
    grid-column: 3;
    margin: 0 !important;
    text-align: right;
    justify-self: end;
    max-width: 100%;
  }

  .service-actions {
    min-width: 100px !important;
    max-width: 150px !important;
    gap: 12px;
    visibility: visible !important;
    opacity: 1 !important;
    display: flex !important;
    flex: none !important;
    grid-column: 4;
    position: relative;
    justify-content: flex-end;
    justify-self: start;
    width: auto;
    margin: 0 !important;
    z-index: 10;
  }

  .edit-btn,
  .toggle-btn {
    font-size: 22px;
    padding: 10px;
    min-width: 40px;
    min-height: 40px;
    display: flex !important;
    align-items: center;
    justify-content: center;
    visibility: visible !important;
    opacity: 1 !important;
    flex-shrink: 0;
  }
}

@media (min-width: 1280px) {
  .services-container {
    padding: 2rem 3rem;
  }
}

@media (min-width: 1440px) {
  .services-container {
    padding: 2rem 4rem;
  }

  .services-categories {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}

@media (min-width: 1920px) {
  .services-container {
    padding: 2rem 5rem;
  }

  .services-categories {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }
}

/* Estilos para SUPERADMIN: Servicios agrupados por negocio */
.services-by-business {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  box-sizing: border-box;
}

.business-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  box-sizing: border-box;
}

.business-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #ff6b35;
}

.business-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: bold;
  color: #ff6b35;
}

.business-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  font-style: italic;
}

@media (min-width: 1024px) {
  .business-section {
    padding: 2rem;
  }

  .business-title {
    font-size: 1.75rem;
  }
}

/* Estilos para puntos de venta */
.pointsales-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.pointsale-section {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
}

.pointsale-header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #dee2e6;
}

.pointsale-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: bold;
  color: #333;
}

.pointsale-address {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}

/* Estilos para servicios agrupados por punto de venta (ADMIN) */
.services-by-pointsale {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 1024px) {
  .pointsale-section {
    padding: 2rem;
  }

  .pointsale-title {
    font-size: 1.5rem;
  }

  .service-price {
    min-width: 150px;
  }
}
</style>
