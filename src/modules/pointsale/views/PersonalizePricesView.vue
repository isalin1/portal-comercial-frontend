<template>
  <div class="personalize-prices-container">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" @click="goBack" aria-label="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#333" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Personalización de Precios</h1>
      <button
        @click="loadData"
        class="reload-btn"
        :disabled="loading"
        title="Recargar datos"
      >
        {{ loading ? '🔄' : '🔄' }}
      </button>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-message">
      <p>Cargando servicios...</p>
    </div>

    <!-- Servicios por Categoría -->
    <div v-else-if="!loading && categoriesWithServices.length > 0" class="services-categories">
      <!-- Loop por cada categoría -->
      <div 
        v-for="categoryType in categoriesWithServices" 
        :key="categoryType"
        class="category-card"
      >
        <!-- Header de la categoría -->
        <div class="category-header">
          <h2 class="category-title">{{ getCategoryDisplayName(categoryType) }}</h2>
          <div class="unit-info">
            <span class="unit-label">Unidad:</span>
            <span class="unit-value">{{ getCategoryUnit(categoryType) }}</span>
          </div>
        </div>

        <!-- Servicios de esta categoría -->
        <div 
          v-for="service in servicesByCategory[categoryType]" 
          :key="service.id"
          class="service-section"
        >
          <!-- Subtítulo: Tipo de servicio -->
          <h3 class="service-type-title">
            {{ getTypeDisplayName(service.type) }}
          </h3>

          <!-- Precio base (editable) -->
          <div class="base-price-section">
            <div class="base-price-info">
              <span class="base-price-label">Precio base del negocio:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                class="base-price-input"
                :value="getBasePrice(service.id, service.basePrice)"
                @input="updateBasePriceInput(service.id, $event)"
              />
            </div>
            <button 
              class="update-base-btn"
              @click="updateBasePrice(service)"
              :disabled="updatingBasePrice === service.id"
              title="Actualizar precio base para todos los puntos de venta (excepto los que tienen personalización)"
            >
              {{ updatingBasePrice === service.id ? 'Actualizando...' : 'Actualizar Precio Base' }}
            </button>
          </div>
          
          <p class="base-price-note">
            ℹ️ Al actualizar el precio base, se aplicará a todos los puntos de venta que no tienen precio personalizado.
          </p>

          <!-- Tabla de Puntos de Venta y Precios -->
          <div class="pointsales-table">
            <div class="table-header">
              <div class="col-pointsale">Punto de Venta</div>
              <div class="col-price">Precio Personalizado</div>
            </div>

            <div 
              v-for="pointSale in pointSalesData" 
              :key="`${service.id}-${pointSale.id}`"
              class="table-row"
            >
              <div class="col-pointsale">
                <span class="pointsale-name">{{ pointSale.name }}</span>
              </div>
              <div class="col-price">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  class="price-input"
                  :value="getCustomPrice(service.id, pointSale.id, service.basePrice)"
                  @input="updatePriceInput(service.id, pointSale.id, $event)"
                  :placeholder="`S/. ${formatPrice(service.basePrice)}`"
                />
              </div>
            </div>
          </div>

          <!-- Botón Guardar por servicio -->
          <div class="save-section">
            <button 
              class="save-btn"
              @click="saveServicePrices(service)"
              :disabled="savingService === service.id"
            >
              {{ savingService === service.id ? 'Guardando...' : 'Guardar Precios' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mensaje cuando no hay servicios -->
    <div v-else-if="!loading" class="no-services-message">
      <div class="no-services-card">
        <h3 class="no-services-title">Sin servicios disponibles</h3>
        <p class="no-services-description">
          No hay servicios registrados en el sistema. Por favor, crea servicios primero en "Nuestros Servicios".
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  getListServices, 
  getServiceCategories, 
  getAllPointSales,
  getPointSaleServices,
  createOrUpdatePointSaleService,
  updateListService,
  lavanderiaApi
} from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

// Estados
const loading = ref(true)
const savingService = ref<number | null>(null)
const updatingBasePrice = ref<number | null>(null)
const businesId = ref<number | null>(null)
const listServices = ref<any[]>([])
const serviceCategories = ref<any[]>([])
const pointSalesData = ref<any[]>([])
const customPrices = ref<Record<string, number>>({}) // Key: `${serviceId}-${pointSaleId}`
const basePrices = ref<Record<number, number>>({}) // Key: serviceId, Value: newBasePrice

// Mapeo de nombres
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

const unitDisplayNames: Record<string, string> = {
  'KILOGRAM': 'Kilogramo (kg)',
  'UNIT': 'Unidad (pieza)',
  'PAIR': 'Par',
  'METER': 'Metro (mt)'
}

// Computed: Agrupar servicios por categoría
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
  
  return grouped
})

// Computed: Categorías con servicios
const categoriesWithServices = computed(() => {
  return Object.keys(servicesByCategory.value)
})

// Función para obtener el businessId
async function getUserBusinessId() {
  try {
    const { data } = await lavanderiaApi.get('/busines')
    if (data && data.length > 0) {
      businesId.value = data[0].id
      return businesId.value
    } else {
      alert('No tienes un negocio registrado.')
      router.push({ name: 'dashboard' })
      return null
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo businessId:', error)
    return null
  }
}

// Función para cargar datos
async function loadData() {
  try {
    loading.value = true
    
    if (!businesId.value) {
      await getUserBusinessId()
    }
    
    if (!businesId.value) {
      loading.value = false
      return
    }

    // Cargar servicios, categorías y puntos de venta en paralelo
    const [services, categories, pointSales] = await Promise.all([
      getListServices(businesId.value),
      getServiceCategories(businesId.value),
      getAllPointSales()
    ])

    listServices.value = services
    serviceCategories.value = categories
    
    // Filtrar puntos de venta del negocio según rol
    const userRole = authStore.user?.role
    if (userRole === 'SUPERADMIN') {
      pointSalesData.value = pointSales
    } else if (userRole === 'ADMIN') {
      // ADMIN ve solo puntos de venta de su negocio
      pointSalesData.value = pointSales.filter((ps: any) => ps.businesId === businesId.value)
    }

    console.log('✅ Datos cargados:', {
      services: listServices.value.length,
      categories: serviceCategories.value.length,
      pointSales: pointSalesData.value.length
    })

    // Cargar precios personalizados existentes
    await loadCustomPrices()
    
  } catch (error: any) {
    console.error('❌ Error cargando datos:', error)
  } finally {
    loading.value = false
  }
}

// Cargar precios personalizados existentes
async function loadCustomPrices() {
  try {
    // Para cada punto de venta, obtener sus precios personalizados
    for (const pointSale of pointSalesData.value) {
      const customServices = await getPointSaleServices(pointSale.id)
      customServices.forEach((ps: any) => {
        const key = `${ps.listserviceId}-${pointSale.id}`
        customPrices.value[key] = parseFloat(ps.price)
      })
    }
    console.log('✅ Precios personalizados cargados:', customPrices.value)
  } catch (error: any) {
    console.error('❌ Error cargando precios personalizados:', error)
  }
}

// Obtener precio personalizado o base
function getCustomPrice(serviceId: number, pointSaleId: number, basePrice: number): number {
  const key = `${serviceId}-${pointSaleId}`
  return customPrices.value[key] || basePrice
}

// Actualizar precio en memoria
function updatePriceInput(serviceId: number, pointSaleId: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = parseFloat(input.value)
  
  const key = `${serviceId}-${pointSaleId}`
  
  if (!isNaN(value) && value >= 0) {
    customPrices.value[key] = value
    console.log(`✏️ Precio actualizado en memoria: ${key} = ${value}`)
  } else if (input.value === '') {
    // Si el input está vacío, eliminar la entrada
    delete customPrices.value[key]
    console.log(`🗑️ Precio eliminado: ${key}`)
  }
}

// Guardar precios de un servicio
async function saveServicePrices(service: any) {
  try {
    savingService.value = service.id
    
    const savePromises = []
    
    // Para cada punto de venta, guardar el precio personalizado
    for (const pointSale of pointSalesData.value) {
      const key = `${service.id}-${pointSale.id}`
      const customPrice = customPrices.value[key]
      
      // Guardar siempre si hay un precio en el input (ya sea personalizado nuevo o modificado)
      // El backend maneja el "createOrUpdate" para actualizar precios existentes
      if (customPrice && customPrice > 0) {
        const saveData = {
          listserviceId: service.id,
          pointsaleId: pointSale.id,
          price: customPrice,
          isActive: true
        }
        
        console.log('💾 Guardando precio:', saveData)
        savePromises.push(createOrUpdatePointSaleService(saveData))
      }
    }
    
    if (savePromises.length > 0) {
      await Promise.all(savePromises)
      alert('✅ Precios guardados exitosamente')
      // Recargar precios personalizados
      await loadCustomPrices()
    } else {
      alert('ℹ️ No hay cambios para guardar')
    }
    
  } catch (error: any) {
    console.error('❌ Error guardando precios:', error)
    alert('Error al guardar precios: ' + (error.response?.data?.message || error.message))
  } finally {
    savingService.value = null
  }
}

// Funciones para precio base
function getBasePrice(serviceId: number, currentBasePrice: number): number {
  return basePrices.value[serviceId] || currentBasePrice
}

function updateBasePriceInput(serviceId: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = parseFloat(input.value)
  
  if (!isNaN(value) && value >= 0) {
    basePrices.value[serviceId] = value
    console.log(`✏️ Precio base actualizado en memoria: servicio ${serviceId} = ${value}`)
  }
}

async function updateBasePrice(service: any) {
  try {
    updatingBasePrice.value = service.id
    
    const newBasePrice = basePrices.value[service.id]
    
    if (!newBasePrice || newBasePrice <= 0) {
      alert('⚠️ Por favor, ingresa un precio base válido')
      return
    }
    
    if (newBasePrice === parseFloat(service.basePrice)) {
      alert('ℹ️ El precio base no ha cambiado')
      return
    }
    
    const confirmMessage = `¿Actualizar el precio base de "${getTypeDisplayName(service.type)}" de S/. ${formatPrice(service.basePrice)} a S/. ${formatPrice(newBasePrice)}?\n\n` +
      `Esto afectará a todos los puntos de venta que NO tienen precio personalizado.`
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    // Actualizar el servicio en el backend
    await updateListService(service.id, { basePrice: newBasePrice })
    
    console.log('✅ Precio base actualizado:', { serviceId: service.id, newBasePrice })
    alert('✅ Precio base actualizado exitosamente')
    
    // Recargar todos los datos para reflejar el cambio
    await loadData()
    
  } catch (error: any) {
    console.error('❌ Error actualizando precio base:', error)
    alert('Error al actualizar precio base: ' + (error.response?.data?.message || error.message))
  } finally {
    updatingBasePrice.value = null
  }
}

// Funciones auxiliares
function getCategoryDisplayName(categoryType: string): string {
  return categoryDisplayNames[categoryType] || categoryType
}

function getCategoryUnit(categoryType: string): string {
  const categoryData = serviceCategories.value.find((cat: any) => cat.categoryType === categoryType)
  if (categoryData && categoryData.unit) {
    return unitDisplayNames[categoryData.unit] || categoryData.unit
  }
  return 'N/A'
}

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

function formatPrice(price: any): string {
  return parseFloat(price).toFixed(2)
}

function goBack() {
  router.push({ name: 'dashboard' })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.personalize-prices-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 0;
  margin: 0;
}

/* Header */
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
  flex: 1;
}

.reload-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
  font-size: 1.2rem;
}

.reload-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.reload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading & No Data */
.loading-message,
.no-services-message {
  padding: 2rem 1rem;
  text-align: center;
}

.no-services-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.no-services-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem;
}

.no-services-description {
  color: #666;
  margin: 0;
}

/* Services Categories */
.services-categories {
  padding: 1rem;
}

.category-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 2px solid #ff6b35;
  margin-bottom: 1.5rem;
}

.category-title {
  font-size: 1.3rem;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.unit-info {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.unit-label {
  color: #666;
}

.unit-value {
  color: #ff6b35;
  font-weight: 600;
}

/* Service Section */
.service-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.service-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.service-type-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ff6b35;
  margin: 0 0 0.75rem 0;
}

.base-price-section {
  margin-bottom: 1rem;
}

.base-price-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  font-size: 0.9rem;
}

.base-price-label {
  color: #666;
  white-space: nowrap;
}

.base-price-input {
  width: 120px;
  padding: 0.5rem;
  border: 2px solid #4CAF50;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  text-align: right;
  transition: border-color 0.2s;
  background-color: white;
}

.base-price-input:focus {
  outline: none;
  border-color: #45a049;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.update-base-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.update-base-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.update-base-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.base-price-note {
  font-size: 0.85rem;
  color: #666;
  margin: 0 0 1rem 0;
  padding: 0.5rem;
  background-color: #e7f3ff;
  border-left: 3px solid #2196F3;
  border-radius: 4px;
}

/* Table */
.pointsales-table {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background-color: #f8f9fa;
  font-weight: 600;
  font-size: 0.9rem;
  color: #333;
}

.table-header > div {
  padding: 0.75rem 1rem;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid #e0e0e0;
}

.table-row > div {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
}

.col-pointsale {
  color: #333;
  font-size: 0.9rem;
}

.pointsale-name {
  font-weight: 500;
}

.col-price {
  justify-content: flex-end;
}

.price-input {
  width: 120px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: right;
  transition: border-color 0.2s;
}

.price-input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
}

/* Save Button */
.save-section {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
}

.save-btn {
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
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

/* Responsive */
@media (max-width: 768px) {
  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .base-price-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .base-price-input {
    width: 100%;
  }
  
  .update-base-btn {
    width: 100%;
  }
  
  .price-input {
    width: 100px;
    font-size: 0.85rem;
  }
}
</style>

