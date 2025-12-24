<template>
  <div class="create-service-container">
    <!-- Header -->
    <header class="service-header">
      <button class="back-button" @click="goBack" title="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Creacion de Servicio</h1>
    </header>

    <div class="content">
      <!-- Selección de Negocio y Punto de Venta -->
      <section class="section">
        <h2 class="section-title">Punto de Venta</h2>
        
        <!-- SUPERADMIN: Seleccionar Negocio -->
        <div v-if="userRole === 'SUPERADMIN'" class="form-group">
          <label class="form-label">Negocio *</label>
          <select 
            v-model="selectedBusinessId" 
            class="form-select" 
            @change="loadPointSalesByBusiness"
            :disabled="!!existingOrderData"
          >
            <option value="">Seleccionar Negocio</option>
            <option v-for="business in businesses" :key="business.id" :value="business.id">
              {{ business.name }}
            </option>
          </select>
        </div>

        <!-- SUPERADMIN: Siempre mostrar selector -->
        <div v-if="userRole === 'SUPERADMIN'" class="form-group">
          <label class="form-label">Punto de Venta *</label>
          <select 
            v-model="selectedPointSaleId" 
            class="form-select"
            :disabled="!!existingOrderData"
          >
            <option value="">Seleccionar Punto de Venta</option>
            <option v-for="pointsale in pointsales" :key="pointsale.id" :value="pointsale.id">
              {{ pointsale.name }} - {{ pointsale.address }}
            </option>
          </select>
        </div>

        <!-- ADMIN: Mostrar selector solo si tiene más de un punto de venta -->
        <div v-if="userRole === 'ADMIN' && pointsales.length > 1" class="form-group">
          <label class="form-label">Punto de Venta *</label>
          <select 
            v-model="selectedPointSaleId" 
            class="form-select"
            :disabled="!!existingOrderData"
          >
            <option value="">Seleccionar Punto de Venta</option>
            <option v-for="pointsale in pointsales" :key="pointsale.id" :value="pointsale.id">
              {{ pointsale.name }} - {{ pointsale.address }}
            </option>
          </select>
        </div>

        <!-- ADMIN: Mostrar información si tiene un solo punto de venta -->
        <div v-if="userRole === 'ADMIN' && pointsales.length === 1" class="info-box">
          <p><strong>Punto de Venta:</strong> {{ pointsales[0]?.name || 'Cargando...' }}</p>
          <p><strong>Dirección:</strong> {{ pointsales[0]?.address || '' }}</p>
        </div>

        <!-- COLABORADOR: Mostrar punto de venta asignado -->
        <div v-if="userRole === 'COLABORADOR'" class="info-box">
          <p><strong>Punto de Venta:</strong> {{ assignedPointSale?.name || 'Cargando...' }}</p>
          <p><strong>Dirección:</strong> {{ assignedPointSale?.address || '' }}</p>
        </div>
      </section>

      <!-- Datos del Cliente -->
      <section class="section">
        <h2 class="section-title">Datos del Cliente</h2>
        
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <div class="search-input-container">
            <input 
              v-model="searchClient" 
              type="text" 
              class="search-input"
              placeholder="Buscar Cliente"
              @input="handleSearchClientInput"
              @focus="showClientResults = true"
              @blur="handleBlur"
              :readonly="!!existingOrderData"
              :class="{ 'readonly-input': !!existingOrderData }"
            >
            <button 
              class="search-icon" 
              @click="showAllClients"
              :disabled="!!existingOrderData"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </button>
          </div>
          
          <!-- Lista de resultados de búsqueda -->
          <div v-if="showClientResults && clientResults.length > 0" class="search-results">
            <div 
              v-for="client in clientResults" 
              :key="client.id"
              class="search-result-item"
              @mousedown.prevent="selectClient(client)"
            >
              <div class="client-result-name">{{ client.firstname }} {{ client.lastname }}</div>
              <div class="client-result-phone">{{ client.phone }}</div>
            </div>
          </div>
          
          <div v-if="showClientResults && searchClient && clientResults.length === 0" class="no-results">
            No se encontraron clientes
          </div>
        </div>

        <button 
          v-if="!existingOrderData"
          class="btn-create-client" 
          @click="goToCreateClient"
        >
          Crear Cliente
        </button>
      </section>

      <!-- Mensaje cuando se está agregando items a una orden existente -->
      <div v-if="existingOrderData" class="existing-order-alert">
        <p>
          <strong>📦 Agregando items a orden existente</strong>
        </p>
        <p class="alert-detail">
          Cliente: {{ existingOrderData.client.name }} | 
          Items existentes: {{ existingItems.length }} | 
          Total actual: S/. {{ formatPrice(existingOrderData.total) }}
        </p>
      </div>

      <!-- Datos del Servicio -->
      <section class="section">
        <h2 class="section-title">Datos del Servicio</h2>
        
        <div v-for="(item, index) in serviceItems" :key="index" class="service-item-block">
          <h3 class="item-title">Item {{ index + 1 }}</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Categoria</label>
              <select 
                v-model="item.categoryId" 
                class="form-select" 
                @change="onCategoryChange(index)"
                :disabled="categoryLocked"
                :class="{ 'select-locked': categoryLocked }"
              >
                <option value="">Seleccionar</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <div class="form-display">{{ getCategoryUnit(item.categoryId) }}</div>
            </div>

            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select 
                v-model="item.serviceId" 
                class="form-select" 
                @change="onServiceChange(index)"
                :disabled="userRole === 'ADMIN' && !selectedPointSaleId"
              >
                <option value="">Seleccionar</option>
                <option v-for="service in getServicesForCategory(item.categoryId)" :key="service.id" :value="service.id">
                  {{ getServiceTypeLabel(service.type) }}
                </option>
              </select>
              <div class="form-display">{{ getServiceTypeLabel(getSelectedServiceType(item.serviceId)) }}</div>
              <p v-if="userRole === 'ADMIN' && !selectedPointSaleId" class="form-hint">
                ⚠️ Debe seleccionar un punto de venta primero
              </p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Unidad</label>
              <div class="form-display">{{ getCategoryUnit(item.categoryId) }}</div>
            </div>

            <div class="form-group">
              <label class="form-label">Cantidad</label>
              <input 
                v-model.number="item.quantity" 
                type="number" 
                step="0.01"
                min="0"
                class="form-input"
                @input="calculateSubtotal(index)"
              >
              <div class="form-display">{{ item.quantity }}</div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Precio Unitario</label>
              <div class="form-display-price">S/. {{ formatPrice(item.unitPrice) }}</div>
            </div>

            <div class="form-group">
              <label class="form-label">Sub Total</label>
              <div class="form-display-price">S/. {{ formatPrice(item.subtotal) }}</div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Descuento (Opcional)</label>
              <input 
                v-model.number="item.discount" 
                type="number" 
                step="0.01"
                min="0"
                :max="item.subtotal"
                class="form-input"
                placeholder="0.00"
                @input="calculateSubtotalWithDiscount(index)"
              >
              <div class="form-display">S/. {{ formatPrice(item.discount) }}</div>
            </div>

            <div class="form-group">
              <label class="form-label">Sub Total con Descuento</label>
              <div class="form-display-price" :class="{ 'discount-applied': item.discount > 0 }">
                S/. {{ formatPrice(item.subtotalWithDiscount) }}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Cantidad Piezas</label>
            <input 
              v-model.number="item.numberpieces" 
              type="number" 
              min="0"
              class="form-input"
              :readonly="isCategoryByUnit(item.categoryId)"
              :class="{ 'readonly-input': isCategoryByUnit(item.categoryId) }"
            >
            <div class="form-display">{{ item.numberpieces }}</div>
            <p v-if="isCategoryByUnit(item.categoryId)" class="info-text">
              ℹ️ Para servicios por unidad, la cantidad de piezas es igual a la cantidad
            </p>
          </div>

          <div class="form-group">
            <label class="form-label">Observaciones</label>
            <textarea 
              v-model="item.observations" 
              class="form-textarea"
              placeholder="Ej: Camisa con botón faltante - Polo con mancha roja"
              rows="3"
            ></textarea>
            <p class="info-text">
              💡 Agregue comentarios sobre el estado de las prendas recibidas
            </p>
          </div>

          <button 
            v-if="serviceItems.length > 1"
            @click="removeItem(index)" 
            class="btn-remove-item"
          >
            Eliminar Item
          </button>
        </div>
      </section>

      <!-- Botón Guardar -->
      <button 
        @click="handleSubmit" 
        class="btn-save"
        :disabled="!canSubmit || submitting"
      >
        {{ submitting ? 'Guardando...' : 'Guardar' }}
      </button>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Cargando datos...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { lavanderiaApi, getClients, getPointSaleServices, getListServices } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

// Types
interface Client {
  id: number
  firstname: string
  lastname: string
  phone: string
  email: string
}

interface Business {
  id: number
  name: string
  comercialname: string
}

interface PointSale {
  id: number
  name: string
  address: string
  businesId: number
}

interface ServiceCategory {
  id: number
  name: string
  unit: string
  categoryType: string
}

interface Service {
  id: number
  type: string
  basePrice: number
  servicecategoryId: number
}

interface ServiceItem {
  categoryId: number
  serviceId: number
  quantity: number
  unitPrice: number
  subtotal: number
  discount: number
  subtotalWithDiscount: number
  numberpieces: number
  observations: string
}

// Router & Auth
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// State - Usuario y Rol
const userRole = computed(() => authStore.user?.role?.toUpperCase() || '')

// State - Negocio y Punto de Venta
const businesses = ref<Business[]>([])
const pointsales = ref<PointSale[]>([])
const selectedBusinessId = ref<number | string>('')
const selectedPointSaleId = ref<number | string>('')
const assignedPointSale = ref<PointSale | null>(null)

// State - Orden Existente (para agregar más items)
const existingOrderData = ref<any>(null)
const existingItems = ref<any[]>([])

// State - Cliente
const loading = ref(false)
const submitting = ref(false)
const searchClient = ref('')
const selectedClient = ref<Client | null>(null)
const showClientResults = ref(false)
const clientResults = ref<Client[]>([])

// State - Servicios
const categories = ref<ServiceCategory[]>([])
const services = ref<Service[]>([])
const categoryLocked = ref(false) // True cuando la categoría viene preseleccionada desde la vista de selección

const serviceItems = ref<ServiceItem[]>([
  {
    categoryId: 0,
    serviceId: 0,
    quantity: 0,
    unitPrice: 0,
    subtotal: 0,
    discount: 0,
    subtotalWithDiscount: 0,
    numberpieces: 0,
    observations: ''
  }
])

// Computed
const canSubmit = computed(() => {
  // Validar que haya punto de venta seleccionado o asignado
  const hasPointSale = userRole.value === 'COLABORADOR' 
    ? !!assignedPointSale.value 
    : !!selectedPointSaleId.value
  
  const result = hasPointSale &&
         selectedClient.value && 
         serviceItems.value.length > 0 &&
         serviceItems.value.every(item => 
           item.categoryId && 
           item.serviceId && 
           item.quantity > 0 &&
           item.numberpieces > 0
         )
  
  // Debug logs
  console.log('🔍 Validación del formulario:')
  console.log('  hasPointSale:', hasPointSale, '| selectedPointSaleId:', selectedPointSaleId.value, '| assignedPointSale:', assignedPointSale.value)
  console.log('  selectedClient:', selectedClient.value ? `${selectedClient.value.firstname} ${selectedClient.value.lastname}` : 'NO SELECCIONADO')
  console.log('  serviceItems.length:', serviceItems.value.length)
  serviceItems.value.forEach((item, idx) => {
    console.log(`  Item ${idx}:`, {
      categoryId: item.categoryId,
      serviceId: item.serviceId,
      quantity: item.quantity,
      numberpieces: item.numberpieces,
      valid: item.categoryId && item.serviceId && item.quantity > 0 && item.numberpieces > 0
    })
  })
  console.log('  ✅ canSubmit:', result)
  
  return result
})

const effectivePointSaleId = computed(() => {
  if (userRole.value === 'COLABORADOR') {
    return assignedPointSale.value?.id || null
  }
  return selectedPointSaleId.value ? Number(selectedPointSaleId.value) : null
})

// Methods
const goBack = () => {
  // Limpiar sessionStorage si existe orden en proceso
  if (sessionStorage.getItem('existingOrder')) {
    sessionStorage.removeItem('existingOrder')
  }
  // Navegar al dashboard
  router.push({ name: 'dashboard' })
}

const goToCreateClient = () => {
  // Guardar el estado actual del formulario para restaurarlo al regresar
  const formState = {
    selectedPointSaleId: selectedPointSaleId.value,
    selectedBusinessId: selectedBusinessId.value,
    categoryId: serviceItems.value.length > 0 && serviceItems.value[0].categoryId > 0 
      ? serviceItems.value[0].categoryId 
      : null,
    userRole: userRole.value
  }
  
  console.log('💾 Guardando estado del formulario antes de crear cliente:', formState)
  sessionStorage.setItem('serviceOrderFormState', JSON.stringify(formState))
  
  // Indicar que viene del formulario de creación de servicio
  router.push({ 
    name: 'client-create',
    query: { fromServiceOrder: 'true' }
  })
}

const handleSearchClientInput = async () => {
  // Buscar clientes mientras escribe (mínimo 2 caracteres)
  if (searchClient.value.length < 2) {
    if (searchClient.value.length === 0) {
      clientResults.value = []
      showClientResults.value = false
    }
    return
  }

  await searchClients(searchClient.value)
}

const searchClients = async (query: string = '') => {
  try {
    console.log('🔍 Buscando clientes del negocio...')
    
    // Usar la función getClients que ya está definida en el API
    const response = await getClients()
    console.log('📦 Respuesta completa:', response)
    
    // La función getClients devuelve {success: true, data: Array, count: number}
    let clients: Client[] = []
    if (response && response.data && Array.isArray(response.data)) {
      clients = response.data
    } else if (Array.isArray(response)) {
      clients = response
    }
    
    console.log('👥 Total de clientes:', clients.length)
    console.log('👥 Clientes:', clients)
    
    // Si hay query, filtrar en el frontend
    if (query && query.length >= 2) {
      const searchTerm = query.toLowerCase()
      console.log('🔎 Filtrando por:', searchTerm)
      
      clients = clients.filter((client: Client) => {
        const fullName = `${client.firstname} ${client.lastname}`.toLowerCase()
        const phone = client.phone.toLowerCase()
        const email = client.email.toLowerCase()
        return fullName.includes(searchTerm) || 
               phone.includes(searchTerm) || 
               email.includes(searchTerm)
      })
      
      console.log('✅ Clientes filtrados:', clients.length)
    }
    
    clientResults.value = clients
    showClientResults.value = true
    
    console.log('✅ clientResults actualizado:', clientResults.value.length)
  } catch (error: any) {
    console.error('❌ Error searching clients:', error)
    console.error('❌ Error response:', error.response?.data)
    console.error('❌ Error status:', error.response?.status)
    clientResults.value = []
    showClientResults.value = false
  }
}

const showAllClients = async () => {
  // Al hacer clic en la lupa, mostrar todos los clientes del negocio
  console.log('🔍 Botón lupa presionado - mostrando todos los clientes')
  await searchClients()
}

const handleBlur = () => {
  // Retrasar el cierre para permitir el clic en los resultados
  setTimeout(() => {
    showClientResults.value = false
  }, 200)
}

const selectClient = (client: Client) => {
  selectedClient.value = client
  searchClient.value = `${client.firstname} ${client.lastname}`
  showClientResults.value = false
}

// Cargar datos según rol del usuario
const loadBusinesses = async () => {
  try {
    console.log('🔄 Cargando negocios (SUPERADMIN)...')
    const { data } = await lavanderiaApi.get('/busines')
    businesses.value = data
    console.log('✅ Negocios cargados:', businesses.value)
  } catch (error) {
    console.error('❌ Error cargando negocios:', error)
  }
}

const loadPointSalesByBusiness = async () => {
  try {
    const businesId = selectedBusinessId.value
    if (!businesId) {
      pointsales.value = []
      selectedPointSaleId.value = ''
      return
    }
    
    console.log('🔄 Cargando puntos de venta para negocio:', businesId)
    const { data } = await lavanderiaApi.get(`/pointsale?businesId=${businesId}`)
    pointsales.value = data
    selectedPointSaleId.value = '' // Reset
    console.log('✅ Puntos de venta cargados:', pointsales.value)
    
    // Cargar categorías y servicios para este negocio
    await loadCategoriesAndServices(Number(businesId))
  } catch (error) {
    console.error('❌ Error cargando puntos de venta:', error)
  }
}

const loadPointSalesForAdmin = async () => {
  try {
    const user = authStore.user
    const { data: businessesData } = await lavanderiaApi.get('/busines')
    
    // Buscar el negocio del usuario ADMIN actual
    const userBusiness = businessesData.find((b: any) => b.userId === user?.id)
    
    if (userBusiness) {
      const businesId = userBusiness.id
      selectedBusinessId.value = businesId
      
      console.log('🔄 Cargando puntos de venta para ADMIN, businesId:', businesId)
      // Usar los puntos de venta que vienen en la relación del negocio
      pointsales.value = userBusiness.pointsales || []
      console.log('✅ Puntos de venta cargados:', pointsales.value.length, pointsales.value)
      
      // Si el ADMIN tiene un solo punto de venta, seleccionarlo automáticamente
      if (pointsales.value.length === 1) {
        selectedPointSaleId.value = pointsales.value[0].id
        console.log('✅ ADMIN con un solo punto de venta - seleccionado automáticamente:', selectedPointSaleId.value)
        // Cargar categorías y servicios del punto de venta seleccionado
        await loadCategoriesForBusiness(businesId)
        await loadServicesForPointSale(Number(selectedPointSaleId.value))
      } else if (pointsales.value.length === 0) {
        console.warn('⚠️ ADMIN sin puntos de venta asignados')
        alert('No tienes puntos de venta asignados. Por favor, crea un punto de venta primero.')
        router.push({ name: 'business-presentation' })
        return
      } else {
        // Si tiene múltiples puntos de venta, cargar solo categorías hasta que seleccione uno
        await loadCategoriesForBusiness(businesId)
        services.value = [] // Limpiar servicios hasta que se seleccione un punto de venta
      }
    } else {
      alert('No tienes un negocio registrado. Por favor, crea un negocio primero.')
      router.push({ name: 'business-presentation' })
    }
  } catch (error) {
    console.error('❌ Error cargando puntos de venta para ADMIN:', error)
  }
}

const loadAssignedPointSale = async () => {
  try {
    console.log('🔄 Obteniendo punto de venta asignado al COLABORADOR...')
    const userId = authStore.user?.id
    
    if (!userId) {
      alert('No se pudo obtener tu información de usuario')
      return
    }
    
    // Obtener el usuario con su punto de venta asignado
    const { data } = await lavanderiaApi.get(`/pointsale`)
    console.log('📦 Puntos de venta:', data)
    
    // Buscar el punto de venta donde el userId coincide (colaborador asignado)
    const userPointSale = data.find((ps: any) => ps.userId === userId)
    
    if (userPointSale) {
      assignedPointSale.value = userPointSale
      selectedBusinessId.value = userPointSale.businesId
      console.log('✅ Punto de venta asignado:', assignedPointSale.value)
      
      // Cargar categorías y servicios para este negocio
      await loadCategoriesAndServices(userPointSale.businesId)
    } else {
      alert('No tienes un punto de venta asignado. Por favor, contacta al administrador.')
      router.push({ name: 'dashboard-client' })
    }
  } catch (error) {
    console.error('❌ Error obteniendo punto de venta asignado:', error)
  }
}

// Cargar solo categorías (sin servicios)
const loadCategoriesForBusiness = async (businesId: number) => {
  try {
    console.log('🔄 Cargando categorías para businesId:', businesId)
    
    const { data } = await lavanderiaApi.get(`/servicecategory?businesId=${businesId}`)
    categories.value = data
    
    console.log('✅ Categorías cargadas:', categories.value)
  } catch (error) {
    console.error('❌ Error cargando categorías:', error)
  }
}

// Cargar servicios para un punto de venta específico
const loadServicesForPointSale = async (pointsaleId: number) => {
  try {
    console.log('🔄 Cargando servicios para punto de venta:', pointsaleId)
    
    // Obtener el punto de venta para conocer su businesId
    const pointsale = pointsales.value.find((ps: any) => ps.id === pointsaleId)
    if (!pointsale) {
      console.error('❌ Punto de venta no encontrado:', pointsaleId)
      services.value = []
      return
    }
    
    const businesId = pointsale.businesId || selectedBusinessId.value
    if (!businesId) {
      console.error('❌ No se pudo obtener businesId para el punto de venta')
      services.value = []
      return
    }
    
    console.log('🏢 BusinesId del punto de venta:', businesId)
    
    // 1. Obtener servicios personalizados del punto de venta (si existen)
    const pointSaleServices = await getPointSaleServices(pointsaleId)
    console.log('📦 Servicios personalizados del punto de venta:', pointSaleServices)
    
    // 2. Obtener servicios base del negocio
    const baseServices = await getListServices(businesId)
    console.log('📦 Servicios base del negocio (total):', baseServices.length)
    console.log('📦 Servicios base del negocio (detalles):', baseServices.map((bs: any) => ({
      id: bs.id,
      type: bs.type,
      servicecategoryId: bs.servicecategoryId,
      categoryName: bs.servicecategory?.name || 'N/A',
      categoryType: bs.servicecategory?.categoryType || 'N/A',
      isActive: bs.isActive,
      basePrice: bs.basePrice
    })))
    
    // Verificar específicamente servicios de LAVADO en baseServices
    const lavadoBaseServices = baseServices.filter((bs: any) => bs.servicecategory?.categoryType === 'LAVADO')
    console.log('🧼 Servicios base de LAVADO:', lavadoBaseServices.length, lavadoBaseServices.map((bs: any) => ({
      id: bs.id,
      type: bs.type,
      isActive: bs.isActive
    })))
    console.log('📦 Servicios base del negocio (detalles):', baseServices.map((s: any) => ({
      id: s.id,
      type: s.type,
      categoryId: s.servicecategoryId,
      isActive: s.isActive,
      basePrice: s.basePrice
    })))
    
    // 3. Crear un mapa de servicios personalizados por listserviceId
    const personalizedServicesMap = new Map<number, any>()
    pointSaleServices.forEach((ps: any) => {
      if (ps.listservice && ps.listservice.id) {
        personalizedServicesMap.set(ps.listservice.id, ps)
        console.log(`📦 Servicio personalizado mapeado: ${ps.listservice.type} (ID: ${ps.listservice.id}), isActive: ${ps.isActive}`)
      }
    })
    console.log('📦 IDs de servicios personalizados mapeados:', Array.from(personalizedServicesMap.keys()))
    
    // Verificar específicamente servicios de LAVADO en pointSaleServices
    const lavadoPersonalizedServices = pointSaleServices.filter((ps: any) => ps.listservice?.servicecategory?.categoryType === 'LAVADO')
    console.log('🧼 Servicios personalizados de LAVADO:', lavadoPersonalizedServices.length, lavadoPersonalizedServices.map((ps: any) => ({
      id: ps.listservice?.id,
      type: ps.listservice?.type,
      isActive: ps.isActive
    })))
    
    // 4. Combinar servicios: usar personalizados si existen, sino usar base
    const combinedServices: any[] = []
    
    baseServices.forEach((baseService: any) => {
      const personalizedService = personalizedServicesMap.get(baseService.id)
      
      if (personalizedService) {
        // Usar servicio personalizado (con precio y estado personalizado)
        const serviceCategoryId = personalizedService.listservice?.servicecategoryId || baseService.servicecategoryId
        const isLavado = baseService.servicecategory?.categoryType === 'LAVADO'
        if (isLavado) {
          console.log(`✅ Servicio ${baseService.type} (ID: ${baseService.id}) tiene personalización, servicecategoryId: ${serviceCategoryId}, isActive: ${personalizedService.isActive}`)
        }
        combinedServices.push({
          id: personalizedService.listservice.id,
          type: personalizedService.listservice.type,
          basePrice: personalizedService.price, // Precio personalizado
          isActive: personalizedService.isActive, // Estado personalizado
          servicecategoryId: serviceCategoryId,
          servicecategory: personalizedService.listservice.servicecategory || baseService.servicecategory,
          pointsaleServiceId: personalizedService.id,
          pointsaleId: pointsaleId
        })
      } else {
        // Usar servicio base (con precio y estado base)
        const isLavado = baseService.servicecategory?.categoryType === 'LAVADO'
        if (isLavado) {
          console.log(`✅ Servicio ${baseService.type} (ID: ${baseService.id}) usando base, servicecategoryId: ${baseService.servicecategoryId}, isActive: ${baseService.isActive}`)
        }
        combinedServices.push({
          id: baseService.id,
          type: baseService.type,
          basePrice: baseService.basePrice,
          isActive: baseService.isActive,
          servicecategoryId: baseService.servicecategoryId,
          servicecategory: baseService.servicecategory,
          pointsaleServiceId: null, // No tiene personalización
          pointsaleId: pointsaleId
        })
      }
    })
    
    console.log('📦 Servicios combinados (antes de filtrar activos):', combinedServices.length)
    console.log('📦 Servicios combinados (detalles):', combinedServices.map((s: any) => ({
      id: s.id,
      type: s.type,
      categoryId: s.servicecategoryId,
      isActive: s.isActive,
      categoryName: s.servicecategory?.name || 'N/A'
    })))
    
    // Filtrar solo servicios activos
    const activeServices = combinedServices.filter((s: any) => s.isActive)
    const inactiveServices = combinedServices.filter((s: any) => !s.isActive)
    
    if (inactiveServices.length > 0) {
      console.warn('⚠️ Servicios inactivos encontrados (no se mostrarán):', inactiveServices.map((s: any) => ({
        id: s.id,
        type: s.type,
        categoryName: s.servicecategory?.name || 'N/A',
        categoryType: s.servicecategory?.categoryType || 'N/A',
        isActive: s.isActive
      })))
    }
    
    // Verificar específicamente si hay servicios de LAVADO antes de filtrar
    const lavadoServicesBeforeFilter = combinedServices.filter((s: any) => s.servicecategory?.categoryType === 'LAVADO')
    console.log('🧼 Servicios de LAVADO (antes de filtrar activos):', lavadoServicesBeforeFilter.map((s: any) => ({
      id: s.id,
      type: s.type,
      isActive: s.isActive
    })))
    
    services.value = activeServices
    
    console.log('📦 Servicios activos (después de filtrar):', services.value.length)
    console.log('📦 Servicios activos (detalles):', services.value.map((s: any) => ({
      id: s.id,
      type: s.type,
      categoryId: s.servicecategoryId,
      categoryName: s.servicecategory?.name || 'N/A',
      isActive: s.isActive
    })))
    
    // Verificar específicamente servicios de LAVADO
    const lavadoServices = services.value.filter((s: any) => s.servicecategory?.categoryType === 'LAVADO')
    console.log('🧼 Servicios de LAVADO activos:', lavadoServices.length, lavadoServices.map((s: any) => ({
      id: s.id,
      type: s.type,
      isActive: s.isActive
    })))
    
    console.log('✅ Servicios cargados para punto de venta:', services.value.length)
    console.log('✅ Servicios (combinados):', services.value)
  } catch (error) {
    console.error('❌ Error cargando servicios del punto de venta:', error)
    services.value = []
  }
}

// Cargar categorías y servicios (para SUPERADMIN y COLABORADOR)
const loadCategoriesAndServices = async (businesId: number) => {
  try {
    console.log('🔄 Cargando categorías y servicios para businesId:', businesId)
    
    const [categoriesData, servicesData] = await Promise.all([
      lavanderiaApi.get(`/servicecategory?businesId=${businesId}`),
      lavanderiaApi.get(`/listservice?businesId=${businesId}`)
    ])
    
    categories.value = categoriesData.data
    services.value = servicesData.data
    
    console.log('✅ Categorías cargadas:', categories.value)
    console.log('✅ Servicios cargados:', services.value)
  } catch (error) {
    console.error('❌ Error cargando categorías y servicios:', error)
  }
}


const getServicesForCategory = (categoryId: number) => {
  // Para ADMIN: solo mostrar servicios si hay un punto de venta seleccionado
  if (userRole.value === 'ADMIN' && !selectedPointSaleId.value) {
    return []
  }
  
  const category = categories.value.find(c => c.id === categoryId)
  console.log('🔍 Buscando servicios para categoría:', category?.name, 'categoryId:', categoryId, 'categoryType:', category?.categoryType)
  console.log('📦 Total de servicios disponibles:', services.value.length)
  console.log('📦 Servicios disponibles (todos - DETALLADO):', services.value.map(s => ({ 
    id: s.id, 
    type: s.type, 
    categoryId: s.servicecategoryId,
    categoryIdType: typeof s.servicecategoryId,
    categoryName: s.servicecategory?.name || 'N/A',
    categoryType: s.servicecategory?.categoryType || 'N/A',
    isActive: s.isActive,
    name: getServiceTypeLabel(s.type),
    fullService: s // Incluir el objeto completo para debugging
  })))
  
  // Normalizar categoryId para comparación (asegurar que sea número)
  const normalizedCategoryId = Number(categoryId)
  const categoryType = category?.categoryType
  
  const filtered = services.value.filter(s => {
    const serviceCategoryId = Number(s.servicecategoryId)
    const serviceCategoryType = s.servicecategory?.categoryType
    
    // Primero intentar coincidencia por categoryId
    const matchesById = serviceCategoryId === normalizedCategoryId
    
    // También verificar por categoryType (por si hay categorías duplicadas con diferentes IDs)
    const matchesByType = categoryType && serviceCategoryType === categoryType
    
    // Coincide si coincide por ID O por tipo (y el tipo no es null/undefined)
    const matches = matchesById || (matchesByType && categoryType)
    
    // Log detallado para servicios de LAVADO
    if (category?.categoryType === 'LAVADO') {
      if (matches) {
        const matchReason = matchesById ? 'ID' : (matchesByType ? 'TIPO' : 'NINGUNO')
        console.log(`✅ Servicio ${s.type} (ID: ${s.id}) COINCIDE con LAVADO - servicecategoryId: ${serviceCategoryId}, categoryId buscado: ${normalizedCategoryId}, matchBy: ${matchReason}, isActive: ${s.isActive}`)
      } else {
        console.log(`⚠️ Servicio ${s.type} (ID: ${s.id}) NO coincide - servicecategoryId: ${serviceCategoryId}, categoryType: ${serviceCategoryType}, buscando categoryId: ${normalizedCategoryId}, buscando categoryType: ${categoryType}, isActive: ${s.isActive}`)
      }
    }
    
    return matches
  })
  
  console.log(`✅ Servicios filtrados para categoría "${category?.name}" (categoryId: ${normalizedCategoryId}):`, filtered.length)
  console.log('✅ Servicios filtrados (detalles):', filtered.map(s => ({ 
    id: s.id, 
    type: s.type, 
    name: getServiceTypeLabel(s.type),
    servicecategoryId: s.servicecategoryId,
    isActive: s.isActive
  })))
  
  // Si es LAVADO y solo hay un servicio, verificar si hay más servicios en la base de datos
  if (category?.categoryType === 'LAVADO' && filtered.length === 1) {
    console.warn('⚠️ Solo se encontró 1 servicio para LAVADO. Verificando si hay más servicios en la base de datos...')
    console.log('📋 Servicio encontrado:', filtered[0].type)
  }
  
  return filtered
}

const getCategoryUnit = (categoryId: number): string => {
  const category = categories.value.find(c => c.id === categoryId)
  if (!category) return ''
  
  const unitMap: Record<string, string> = {
    'KILOGRAM': 'Kg',
    'UNIT': 'Unidades',
    'PAIR': 'Par',
    'METER': 'Metros'
  }
  
  return unitMap[category.unit] || category.unit
}

const isCategoryByUnit = (categoryId: number): boolean => {
  const category = categories.value.find(c => c.id === categoryId)
  if (!category) return false
  
  // Categorías que se miden por unidad (no por peso)
  const unitBasedCategories = ['LAVADO_ESPECIAL', 'LAVADO_EN_SECO', 'PLANCHADO', 'FRAZADAS', 'EDREDONES', 'ZAPATILLAS', 'ALFOMBRAS', 'CORTINAS']
  return unitBasedCategories.includes(category.categoryType)
}

const getServiceTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'GENERAL': 'General',
    'ABRIGO': 'Abrigo',
    'FRAZADA': 'Frazada',
    'EN_SECO': 'En Seco',
    'CAMISA': 'Camisa',
    'PANTALON': 'Pantalón',
    'JEAN': 'Jean',
    'CHOMPA': 'Chompa',
    'CASACA': 'Casaca',
    'TERNO': 'Terno',
    'CORBATA': 'Corbata',
    'UNO_PLAZA': 'Una Plaza',
    'UNO_MEDIO_PLAZA': 'Una Plaza y Media',
    'DOS_PLAZAS': 'Dos Plazas',
    'QUEEN': 'Queen',
    'KING': 'King',
    'OTROS': 'Otros'
  }
  return labels[type] || type
}

const getSelectedServiceType = (serviceId: number): string => {
  const service = services.value.find(s => s.id === serviceId)
  return service?.type || ''
}

const onCategoryChange = async (index: number) => {
  serviceItems.value[index].serviceId = 0
  serviceItems.value[index].unitPrice = 0
  serviceItems.value[index].subtotal = 0
  serviceItems.value[index].discount = 0
  serviceItems.value[index].subtotalWithDiscount = 0
  
  // Verificar si hay servicios disponibles para esta categoría
  const categoryId = serviceItems.value[index].categoryId
  if (categoryId) {
    const availableServices = services.value.filter(s => s.servicecategoryId === categoryId)
    
    if (availableServices.length === 0) {
      // No hay servicios disponibles para esta categoría
      const category = categories.value.find(c => c.id === categoryId)
      const categoryName = category?.name || 'esta categoría'
      
      alert(`⚠️ Servicio no disponible\n\nNo hay tipos de servicio configurados para "${categoryName}". Por favor, seleccione otra categoría.`)
      
      // Limpiar la selección
      serviceItems.value[index].categoryId = 0
      
      // Si viene desde la selección de categoría (locked), regresar a la pantalla de selección
      if (categoryLocked.value) {
        console.log('🔙 Regresando a selección de categoría porque no hay servicios disponibles')
        router.push({ name: 'select-category' })
      }
      
      return
    }
  }
  
  // Si cambia a servicio por unidad y ya hay cantidad, igualar las piezas
  const item = serviceItems.value[index]
  if (isCategoryByUnit(item.categoryId) && item.quantity > 0) {
    item.numberpieces = Math.round(item.quantity)
  }
}

// Función para cuando cambia el punto de venta (ADMIN)
const onPointSaleChange = async () => {
  if (userRole.value === 'ADMIN' && selectedPointSaleId.value) {
    console.log('🔄 Punto de venta cambiado a:', selectedPointSaleId.value)
    
    // Limpiar servicios y items actuales
    services.value = []
    serviceItems.value.forEach(item => {
      item.serviceId = 0
      item.unitPrice = 0
      item.subtotal = 0
      item.subtotalWithDiscount = 0
    })
    
    // Cargar servicios del nuevo punto de venta
    await loadServicesForPointSale(Number(selectedPointSaleId.value))
  }
}

// Watcher para cuando cambia el punto de venta (ADMIN)
watch(() => selectedPointSaleId.value, async (newPointSaleId, oldPointSaleId) => {
  // Solo para ADMIN y si realmente cambió
  if (userRole.value === 'ADMIN' && newPointSaleId && newPointSaleId !== oldPointSaleId) {
    console.log('🔄 Watcher: Punto de venta cambiado de', oldPointSaleId, 'a', newPointSaleId)
    
    // Limpiar servicios y items actuales
    services.value = []
    serviceItems.value.forEach(item => {
      item.serviceId = 0
      item.unitPrice = 0
      item.subtotal = 0
      item.subtotalWithDiscount = 0
    })
    
    // Cargar servicios del nuevo punto de venta
    await loadServicesForPointSale(Number(newPointSaleId))
  }
})

const onServiceChange = (index: number) => {
  const service = services.value.find(s => s.id === serviceItems.value[index].serviceId)
  if (service) {
    // Para ADMIN: validar que el servicio pertenezca al punto de venta seleccionado
    if (userRole.value === 'ADMIN' && selectedPointSaleId.value) {
      const pointsaleId = Number(selectedPointSaleId.value)
      
      // Verificar que el servicio tenga el pointsaleId correcto
      if (service.pointsaleId && service.pointsaleId !== pointsaleId) {
        const pointsaleName = pointsales.value.find(ps => ps.id === pointsaleId)?.name || 'seleccionado'
        alert(`⚠️ El servicio seleccionado no está disponible en el punto de venta "${pointsaleName}". Por favor, seleccione otro servicio.`)
        serviceItems.value[index].serviceId = 0
        serviceItems.value[index].unitPrice = 0
        calculateSubtotal(index)
        return
      }
    }
    
    serviceItems.value[index].unitPrice = Number(service.basePrice)
    calculateSubtotal(index)
  }
}

const calculateSubtotal = (index: number) => {
  const item = serviceItems.value[index]
  item.subtotal = item.quantity * item.unitPrice
  
  // Calcular subtotal con descuento
  calculateSubtotalWithDiscount(index)
  
  // Si es servicio por unidad, igualar cantidad de piezas a cantidad
  if (isCategoryByUnit(item.categoryId)) {
    item.numberpieces = Math.round(item.quantity)
    console.log('✅ Servicio por unidad: Cantidad de piezas igualada a cantidad:', item.numberpieces)
  }
}

const calculateSubtotalWithDiscount = (index: number) => {
  const item = serviceItems.value[index]
  const discount = item.discount || 0
  const maxDiscount = item.subtotal
  
  // Asegurar que el descuento no sea mayor que el subtotal
  if (discount > maxDiscount) {
    item.discount = maxDiscount
  }
  
  // Calcular subtotal con descuento (no puede ser negativo)
  item.subtotalWithDiscount = Math.max(0, item.subtotal - (item.discount || 0))
}

const addItem = () => {
  serviceItems.value.push({
    categoryId: 0,
    serviceId: 0,
    quantity: 0,
    unitPrice: 0,
    subtotal: 0,
    discount: 0,
    subtotalWithDiscount: 0,
    numberpieces: 0,
    observations: ''
  })
}

const removeItem = (index: number) => {
  serviceItems.value.splice(index, 1)
}

const formatPrice = (price: number): string => {
  return Number(price).toFixed(2)
}

const handleSubmit = async () => {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true

  try {
    // Obtener el punto de venta según el rol
    const pointsaleId = effectivePointSaleId.value
    if (!pointsaleId) {
      alert('No se pudo obtener el punto de venta')
      submitting.value = false
      return
    }
    
    // Obtener información del punto de venta
    let pointsaleInfo
    if (userRole.value === 'COLABORADOR') {
      pointsaleInfo = assignedPointSale.value
    } else {
      pointsaleInfo = pointsales.value.find(ps => ps.id === pointsaleId)
    }
    
    if (!pointsaleInfo) {
      alert('No se encontró información del punto de venta')
      submitting.value = false
      return
    }
    
    // Preparar los nuevos items
    const newItems = serviceItems.value.map(item => {
      const category = categories.value.find(c => c.id === item.categoryId)
      const service = services.value.find(s => s.id === item.serviceId)
      return {
        listserviceId: item.serviceId,
        categoryName: category?.name || '',
        serviceName: getServiceTypeLabel(service?.type || ''),
        unit: getCategoryUnit(item.categoryId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        numberpieces: item.numberpieces,
        subtotal: item.subtotal,
        discount: item.discount || 0,
        subtotalWithDiscount: item.subtotalWithDiscount,
        observations: item.observations || ''
      }
    })
    
    // Combinar items existentes con nuevos items
    const allItems = existingOrderData.value 
      ? [...existingItems.value, ...newItems]
      : newItems
    
    // Calcular el total combinado usando subtotalWithDiscount (valor final)
    const totalAmount = allItems.reduce((sum, item) => sum + (item.subtotalWithDiscount || item.subtotal), 0)
    
    // Preparar los datos completos con información detallada para mostrar
    const orderPreview = {
      client: {
        id: selectedClient.value!.id,
        name: `${selectedClient.value!.firstname} ${selectedClient.value!.lastname}`,
        phone: selectedClient.value!.phone,
        email: selectedClient.value!.email
      },
      pointsale: {
        id: pointsaleInfo.id,
        name: pointsaleInfo.name,
        address: pointsaleInfo.address
      },
      items: allItems,
      total: totalAmount,
      servicedeadline: existingOrderData.value?.servicedeadline || '' // Dejar vacío para que el usuario seleccione
    }
    
    console.log('📋 Vista previa de orden:', orderPreview)
    console.log('👤 Rol del usuario:', userRole.value)
    console.log('🏪 Punto de venta ID:', pointsaleId)
    console.log('📦 Total de items:', allItems.length, '(existentes:', existingItems.value.length, '+ nuevos:', newItems.length, ')')
    
    // Guardar la vista previa en sessionStorage
    sessionStorage.setItem('orderPreview', JSON.stringify(orderPreview))
    
    // Navegar a la vista de lista/confirmación SIN crear en BD
    router.push({ 
      name: 'order-service-list',
      query: { preview: 'true' }
    })
  } catch (error: any) {
    console.error('Error preparando orden:', error)
    alert(error.response?.data?.message || 'Error al preparar la orden de servicio')
  } finally {
    submitting.value = false
  }
}

// Lifecycle
onMounted(async () => {
  loading.value = true
  try {
    // Guardar si viene con una categoría preseleccionada
    const preselectedCategory = route.query.category as string
    if (preselectedCategory) {
      console.log('🎯 Categoría preseleccionada:', preselectedCategory)
      categoryLocked.value = true
    }
    
    // Verificar si viene de una orden existente (agregar más items)
    console.log('🔍 Verificando sessionStorage...')
    console.log('🔍 Todas las claves en sessionStorage:', Object.keys(sessionStorage))
    const existingOrderJson = sessionStorage.getItem('existingOrder')
    console.log('🔍 existingOrderJson:', existingOrderJson)
    const hasExistingOrder = !!existingOrderJson
    console.log('🔍 hasExistingOrder:', hasExistingOrder)
    
    if (hasExistingOrder) {
      const existingOrder = JSON.parse(existingOrderJson!)
      console.log('📦 Orden existente detectada desde sessionStorage:', existingOrder)
      existingOrderData.value = existingOrder
      existingItems.value = existingOrder.items || []
      
      // Pre-llenar cliente INMEDIATAMENTE
      const clientName = existingOrder.client.name
      const nameParts = clientName.split(' ')
      selectedClient.value = {
        id: existingOrder.client.id,
        firstname: nameParts[0] || '',
        lastname: nameParts.slice(1).join(' ') || '',
        phone: existingOrder.client.phone,
        email: existingOrder.client.email
      }
      searchClient.value = clientName
      
      console.log('✅ Cliente pre-llenado:', selectedClient.value)
      console.log('📋 Items existentes:', existingItems.value.length)
      
      // Limpiar sessionStorage después de leer
      sessionStorage.removeItem('existingOrder')
    }
    
    // Verificar si hay un cliente recién creado desde el formulario de creación de cliente
    const newlyCreatedClientJson = sessionStorage.getItem('newlyCreatedClient')
    if (newlyCreatedClientJson && !hasExistingOrder) {
      try {
        const newlyCreatedClient = JSON.parse(newlyCreatedClientJson)
        console.log('👤 Cliente recién creado detectado:', newlyCreatedClient)
        
        // Seleccionar el cliente recién creado
        selectedClient.value = {
          id: newlyCreatedClient.id,
          firstname: newlyCreatedClient.firstname,
          lastname: newlyCreatedClient.lastname,
          phone: newlyCreatedClient.phone,
          email: newlyCreatedClient.email || ''
        }
        searchClient.value = `${newlyCreatedClient.firstname} ${newlyCreatedClient.lastname}`
        
        console.log('✅ Cliente recién creado seleccionado:', selectedClient.value)
        
        // Limpiar sessionStorage después de usar
        sessionStorage.removeItem('newlyCreatedClient')
      } catch (error) {
        console.error('❌ Error al procesar cliente recién creado:', error)
        sessionStorage.removeItem('newlyCreatedClient')
      }
    }
    
    // Verificar si hay estado del formulario guardado (cuando se fue a crear cliente)
    let savedFormState: any = null
    const formStateJson = sessionStorage.getItem('serviceOrderFormState')
    if (formStateJson) {
      try {
        savedFormState = JSON.parse(formStateJson)
        console.log('💾 Estado del formulario guardado detectado:', savedFormState)
      } catch (error) {
        console.error('❌ Error al parsear estado del formulario:', error)
        sessionStorage.removeItem('serviceOrderFormState')
      }
    }
    
    console.log('👤 Rol del usuario:', userRole.value)
    
    // Cargar datos según el rol
    if (userRole.value === 'SUPERADMIN') {
      await loadBusinesses()
      
      // Si hay orden existente, pre-cargar el negocio y punto de venta
      if (hasExistingOrder) {
        const pointsale = existingOrderData.value.pointsale
        if (pointsale) {
          // Buscar el negocio que contiene este punto de venta
          const { data: allPointsales } = await lavanderiaApi.get('/pointsale')
          const targetPointsale = allPointsales.find((ps: any) => ps.id === pointsale.id)
          if (targetPointsale) {
            selectedBusinessId.value = targetPointsale.businesId
            console.log('📦 Negocio pre-seleccionado:', selectedBusinessId.value)
            
            // Cargar puntos de venta del negocio
            await loadPointSalesByBusiness()
            
            // DESPUÉS de cargar, pre-seleccionar el punto de venta
            selectedPointSaleId.value = pointsale.id
            console.log('🏪 Punto de venta pre-seleccionado:', selectedPointSaleId.value)
          }
        }
      } else if (savedFormState && savedFormState.selectedBusinessId) {
        // Restaurar negocio seleccionado
        selectedBusinessId.value = savedFormState.selectedBusinessId
        console.log('📦 Restaurando negocio seleccionado:', selectedBusinessId.value)
        
        // Cargar puntos de venta del negocio
        await loadPointSalesByBusiness()
        
        // Restaurar punto de venta DESPUÉS de cargar
        if (savedFormState.selectedPointSaleId) {
          selectedPointSaleId.value = savedFormState.selectedPointSaleId
          console.log('🏪 Restaurando punto de venta seleccionado:', selectedPointSaleId.value)
        }
        
        // Cargar categorías y servicios del negocio seleccionado
        await loadCategoriesAndServices(Number(savedFormState.selectedBusinessId))
      } else if (preselectedCategory && businesses.value.length > 0) {
        // Si viene con categoría preseleccionada, cargar servicios del primer negocio
        const firstBusinessId = businesses.value[0].id
        await loadCategoriesAndServices(firstBusinessId)
      }
    } else if (userRole.value === 'ADMIN') {
      await loadPointSalesForAdmin()
      
      // Si hay orden existente, pre-seleccionar el punto de venta DESPUÉS de cargar
      if (hasExistingOrder && pointsales.value.length > 0) {
        selectedPointSaleId.value = existingOrderData.value.pointsale.id
        console.log('🏪 Punto de venta pre-seleccionado (ADMIN):', selectedPointSaleId.value)
        // Cargar servicios del punto de venta
        await loadServicesForPointSale(Number(selectedPointSaleId.value))
      } else if (savedFormState && savedFormState.selectedPointSaleId) {
        // Restaurar punto de venta seleccionado
        selectedPointSaleId.value = savedFormState.selectedPointSaleId
        console.log('🏪 Restaurando punto de venta seleccionado (ADMIN):', selectedPointSaleId.value)
        // Cargar servicios del punto de venta restaurado
        await loadServicesForPointSale(Number(selectedPointSaleId.value))
      } else if (selectedPointSaleId.value) {
        // Si ya hay un punto de venta seleccionado (por ejemplo, si tiene solo uno), cargar servicios
        await loadServicesForPointSale(Number(selectedPointSaleId.value))
      } else if (preselectedCategory) {
        // Si viene con categoría preseleccionada, seleccionar el primer punto de venta y cargar servicios
        if (pointsales.value.length === 1) {
          selectedPointSaleId.value = pointsales.value[0].id
          console.log('🏪 Punto de venta auto-seleccionado (ADMIN con categoría preseleccionada, 1 punto de venta):', selectedPointSaleId.value)
          await loadServicesForPointSale(Number(selectedPointSaleId.value))
        } else if (pointsales.value.length > 1) {
          // Si tiene múltiples puntos de venta, seleccionar el primero automáticamente cuando viene con categoría preseleccionada
          selectedPointSaleId.value = pointsales.value[0].id
          console.log('🏪 Punto de venta auto-seleccionado (ADMIN con categoría preseleccionada, múltiples puntos de venta):', selectedPointSaleId.value)
          await loadServicesForPointSale(Number(selectedPointSaleId.value))
        }
      }
    } else if (userRole.value === 'COLABORADOR') {
      await loadAssignedPointSale()
      // COLABORADOR: El punto de venta asignado ya se carga automáticamente
      console.log('🏪 Punto de venta asignado (COLABORADOR):', assignedPointSale.value)
      
      // Cargar categorías y servicios del negocio del colaborador
      if (assignedPointSale.value?.businesId) {
        await loadCategoriesAndServices(assignedPointSale.value.businesId)
      }
    }
    
    // Si viene con categoría preseleccionada, pre-seleccionarla en el primer item
    if (preselectedCategory) {
      // Para ADMIN: asegurarse de que las categorías estén cargadas
      if (userRole.value === 'ADMIN' && categories.value.length === 0 && selectedBusinessId.value) {
        console.log('🔄 Cargando categorías para ADMIN con categoría preseleccionada...')
        await loadCategoriesForBusiness(Number(selectedBusinessId.value))
      }
      
      // Verificar que las categorías estén cargadas
      if (categories.value.length === 0) {
        console.warn('⚠️ No se pudieron cargar las categorías')
        return
      }
      
      const category = categories.value.find(c => c.categoryType === preselectedCategory)
      if (category && serviceItems.value.length > 0) {
        // Para ADMIN: asegurarse de que los servicios estén cargados
        if (userRole.value === 'ADMIN' && selectedPointSaleId.value && services.value.length === 0) {
          console.log('🔄 Cargando servicios del punto de venta antes de verificar categoría...')
          await loadServicesForPointSale(Number(selectedPointSaleId.value))
        }
        
        // Verificar primero si la categoría tiene servicios disponibles
        const availableServices = services.value.filter(s => s.servicecategoryId === category.id)
        
        if (availableServices.length === 0) {
          console.warn('⚠️ La categoría preseleccionada no tiene servicios disponibles')
          const pointsaleName = userRole.value === 'ADMIN' && selectedPointSaleId.value 
            ? ` en el punto de venta "${pointsales.value.find(ps => ps.id === Number(selectedPointSaleId.value))?.name || ''}"`
            : ''
          alert(`⚠️ Servicio no disponible\n\nNo hay tipos de servicio configurados para "${category.name}"${pointsaleName}. Por favor, seleccione otra categoría o punto de venta.`)
          router.push({ name: 'select-category' })
          return
        }
        
        serviceItems.value[0].categoryId = category.id
        console.log('✅ Categoría pre-seleccionada en el item:', category.name)
        
        // Disparar el evento de cambio de categoría para cargar los servicios correspondientes
        await onCategoryChange(0)
      } else if (!category) {
        console.warn('⚠️ Categoría preseleccionada no encontrada:', preselectedCategory)
        console.log('📋 Categorías disponibles:', categories.value.map(c => c.categoryType))
      }
    } else if (savedFormState && savedFormState.categoryId && categories.value.length > 0) {
      // Restaurar categoría seleccionada desde el estado guardado
      const categoryId = Number(savedFormState.categoryId)
      const category = categories.value.find(c => c.id === categoryId)
      
      if (category && serviceItems.value.length > 0) {
        // Verificar primero si la categoría tiene servicios disponibles
        const availableServices = services.value.filter(s => s.servicecategoryId === category.id)
        
        if (availableServices.length > 0) {
          serviceItems.value[0].categoryId = categoryId
          console.log('✅ Restaurando categoría seleccionada en el item:', category.name)
          
          // Disparar el evento de cambio de categoría para cargar los servicios correspondientes
          await onCategoryChange(0)
        } else {
          console.warn('⚠️ La categoría guardada no tiene servicios disponibles')
        }
      }
    }
    
    // Limpiar el estado guardado después de restaurarlo completamente
    if (savedFormState) {
      sessionStorage.removeItem('serviceOrderFormState')
      console.log('🗑️ Estado del formulario limpiado después de restaurar')
    }
    
  } catch (error) {
    console.error('Error al cargar datos iniciales:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style>
/* Estilos globales para sobrescribir el body solo en esta vista */
body:has(.create-service-container) {
  display: block !important;
  place-items: unset !important;
  padding: 0 !important;
  margin: 0 !important;
}
</style>

<style scoped>
.create-service-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* Header */
.service-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.back-button {
  background: none;
  border: none;
  padding: 8px;
  margin-right: 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button:hover {
  background-color: #f5f5f5;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

/* Content */
.content {
  padding-bottom: 40px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
  text-align: center;
}

/* Form Elements */
.form-group {
  margin-bottom: 16px;
  position: relative;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.search-input-container {
  position: relative;
}

.search-input,
.form-input,
.form-select {
  width: 100%;
  padding: 12px 40px 12px 12px;
  background-color: #ffe8d9;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  color: #1a1a1a;
}

.form-input:focus,
.form-select:focus {
  outline: 2px solid #ff6b35;
  outline-offset: 2px;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  background-color: #ffe8d9;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  color: #1a1a1a;
  resize: vertical;
  min-height: 80px;
}

.form-textarea:focus {
  outline: 2px solid #ff6b35;
  outline-offset: 2px;
}

.form-textarea::placeholder {
  color: #999;
  font-style: italic;
}

.readonly-input {
  background-color: #f0f0f0 !important;
  cursor: not-allowed;
  color: #666;
}

.select-locked {
  background-color: #e8f5e9 !important;
  cursor: not-allowed;
  opacity: 0.8;
  border: 2px solid #4caf50 !important;
}

.info-text {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  font-style: italic;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-display-price.discount-applied {
  color: #28a745;
  font-weight: 700;
}

.form-display-price {
  background-color: #ffe8d9;
  padding: 12px;
  border-radius: 8px;
  font-size: 15px;
  color: #1a1a1a;
  text-align: center;
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Search Results */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.search-result-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background-color: #ffe8d9;
}

.client-result-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.client-result-phone {
  font-size: 13px;
  color: #666;
}

.no-results {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-top: 4px;
}

/* Buttons */
.btn-create-client {
  width: 100%;
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-create-client:hover {
  background-color: #e55a2b;
}

/* Service Items */
.service-item-block {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.btn-add-item {
  width: 100%;
  background-color: #f8f9fa;
  color: #ff6b35;
  border: 2px dashed #ff6b35;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-item:hover {
  background-color: #ffe8d9;
}

.btn-remove-item {
  width: 100%;
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 12px;
}

.btn-remove-item:hover {
  background-color: #c82333;
}

/* Save Button */
.btn-save {
  width: 100%;
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 24px;
}

.btn-save:hover:not(:disabled) {
  background-color: #e55a2b;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  color: white;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Info Box (para COLABORADOR) */
.info-box {
  background-color: #f0f8ff;
  border: 1px solid #b3d9ff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.info-box p {
  margin: 8px 0;
  color: #333;
  font-size: 14px;
}

.info-box strong {
  color: #ff6b35;
  font-weight: 600;
}

/* Alerta de Orden Existente */
.existing-order-alert {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.existing-order-alert p {
  margin: 4px 0;
  font-size: 14px;
}

.existing-order-alert strong {
  font-size: 16px;
  display: block;
  margin-bottom: 8px;
}

.alert-detail {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.5;
}

/* Responsive */
/* Content - Mobile: Centered with max-width */
.content {
  max-width: 480px;
  margin: 0 auto;
}

/* Service Header - Mobile: Centered with max-width */
.service-header {
  max-width: 480px;
  margin: 0 auto 24px;
}

@media (min-width: 768px) {
  .create-service-container {
    padding: 2rem;
    width: 100%;
    max-width: 100%;
  }

  .content {
    max-width: 100%;
    margin: 0;
  }

  .service-header {
    max-width: 100%;
    margin-bottom: 24px;
  }

  .title {
    font-size: 24px;
  }

  .section-title {
    font-size: 18px;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .create-service-container {
    padding: 2rem 3rem;
  }

  .content {
    max-width: 100%;
    width: 100%;
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 2rem;
    align-items: start;
    margin: 0;
  }

  .service-header {
    grid-column: 1 / -1;
    padding: 1rem 0;
    margin-bottom: 1rem;
    background: white;
    padding: 1.5rem 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .existing-order-alert {
    grid-column: 1 / -1;
    grid-row: 3;
    margin-bottom: 1.5rem;
  }

  /* Columna izquierda: Punto de Venta y Cliente - están al inicio */
  .content > .section:nth-of-type(1) {
    grid-column: 1;
    grid-row: 1;
    margin-bottom: 1.5rem;
  }

  .content > .section:nth-of-type(2) {
    grid-column: 1;
    grid-row: 2;
  }

  /* Columna derecha: Datos del Servicio */
  .content > .section:nth-of-type(3) {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  /* Botón Guardar ocupa toda la columna derecha */
  .btn-save {
    grid-column: 2;
    width: 100%;
    max-width: none;
    margin: 0;
    font-size: 18px;
    padding: 1rem 2rem;
  }

  .section {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    margin-bottom: 0;
  }

  .section-title {
    font-size: 18px;
    text-align: left;
    border-bottom: 2px solid #ff6b35;
    padding-bottom: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .item-card {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    border: 1px solid #e9ecef;
  }

  .item-title {
    font-size: 16px;
  }

  .btn-add-item {
    width: 100%;
    margin: 0;
  }

  .btn-remove-item {
    width: 100%;
    margin-top: 1rem;
  }

  .form-input,
  .form-select,
  .form-textarea {
    font-size: 15px;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }
}

@media (min-width: 1280px) {
  .create-service-container {
    padding: 2rem 4rem;
  }

  .content {
    max-width: 100%;
    width: 100%;
    grid-template-columns: 450px 1fr;
    gap: 2.5rem;
  }

  .section {
    padding: 2rem;
  }

  .section-title {
    font-size: 20px;
  }

  .item-card {
    padding: 2rem;
  }

  .item-title {
    font-size: 18px;
  }

  .form-input,
  .form-select,
  .form-textarea {
    font-size: 16px;
  }
}

@media (min-width: 1600px) {
  .create-service-container {
    padding: 2rem 5rem;
  }

  .content {
    max-width: 100%;
    width: 100%;
    grid-template-columns: 500px 1fr;
    gap: 3rem;
  }

  .section {
    padding: 2.5rem;
  }
}
</style>
