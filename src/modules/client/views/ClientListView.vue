<template>
  <div class="client-list-container" :style="{ width: '100vw', maxWidth: '100vw', margin: 0, padding: 0 }">
    <div class="main-layout" :style="{ width: '100vw', maxWidth: '100vw' }">
      <!-- Sidebar izquierdo -->
      <aside class="sidebar">
        <!-- Header -->
        <header class="client-list-header">
          <button class="back-button" @click="goBack" title="Volver">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
            </svg>
          </button>
          <h1 class="title">Clientes</h1>
        </header>

        <!-- Search and Filter Bar -->
        <div class="search-filter-container">
          <div class="search-input-container">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar Cliente"
              class="search-input"
              @input="filterClients"
            />
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#666" stroke-width="2"/>
              <path d="m21 21-4.35-4.35" stroke="#666" stroke-width="2"/>
            </svg>
          </div>
          <button class="filter-button" @click="toggleFilterModal" title="Filtros">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="#666" stroke-width="2" fill="none"/>
            </svg>
          </button>
        </div>

        <!-- Status Tabs -->
        <div class="status-tabs">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            :class="['tab-button', { active: activeTab === tab.value }]"
            @click="setActiveTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Create New Client Button -->
        <div class="create-button-container">
          <button class="create-client-btn" @click="createNewClient">
            Crear Nuevo Cliente
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Cargando clientes...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredClients.length === 0" class="empty-state">
          <svg class="empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#ccc" stroke-width="2"/>
            <circle cx="12" cy="7" r="4" stroke="#ccc" stroke-width="2"/>
          </svg>
          <h3>Sin clientes registrados</h3>
          <p v-if="searchQuery">No se encontraron clientes que coincidan con "{{ searchQuery }}"</p>
          <p v-else-if="activeTab === 'inactive'">No hay clientes inactivos</p>
          <p v-else-if="activeTab === 'received'">No hay clientes activos</p>
          <p v-else-if="clients.length === 0">No tienes clientes registrados. Comienza creando tu primer cliente.</p>
          <p v-else>No hay clientes que coincidan con los filtros aplicados</p>
        </div>

        <!-- Client List -->
        <div v-else class="client-list">
          <div
            v-for="client in filteredClients"
            :key="client.id"
            class="client-card"
            :class="{ 'selected': selectedClient?.id === client.id }"
            @click="selectClient(client)"
          >
            <div class="client-info">
              <h3 class="client-name">{{ client.firstname }} {{ client.lastname }}</h3>
              <p class="client-phone">{{ client.phone }}</p>
              <p class="last-service">
                Último Servicio: {{ formatDate(client.lastServiceDate) }}
              </p>
            </div>
            <div class="client-status">
              <span :class="['status-tag', client.isActive ? 'active' : 'inactive']">
                {{ client.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Panel de detalles del cliente seleccionado -->
      <aside v-if="selectedClient && clientDetails" class="client-details-panel">
        <div class="details-header">
          <h2>Detalles del Cliente</h2>
          <button class="close-details-btn" @click="closeDetails" title="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#666" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <div v-if="loadingDetails" class="loading-details">
          <div class="loading-spinner"></div>
          <p>Cargando detalles...</p>
        </div>

        <div v-else class="details-content">
          <form @submit.prevent="handleUpdateClient" class="client-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nombres</label>
                <input
                  v-model="clientForm.firstname"
                  type="text"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos</label>
                <input
                  v-model="clientForm.lastname"
                  type="text"
                  class="form-input"
                  required
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input
                  v-model="clientForm.phone"
                  type="tel"
                  class="form-input"
                  maxlength="9"
                  pattern="[0-9]{9}"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">DNI</label>
                <input
                  v-model="clientForm.dni"
                  type="text"
                  class="form-input"
                  maxlength="8"
                  pattern="[0-9]{8}"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <input
                v-model="clientForm.email"
                type="email"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Estado</label>
              <select v-model="clientForm.isActive" class="form-input">
                <option :value="true">Activo</option>
                <option :value="false">Inactivo</option>
              </select>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-cancel" @click="closeDetails">
                Cancelar
              </button>
              <button type="submit" class="btn-save" :disabled="savingClient">
                {{ savingClient ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>

    <!-- Filter Modal -->
    <div v-if="showFilterModal" class="modal-overlay" @click="closeFilterModal">
      <div class="filter-modal" @click.stop>
        <div class="modal-header">
          <h3>Filtros</h3>
          <button class="close-button" @click="closeFilterModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#666" stroke-width="2"/>
            </svg>
          </button>
        </div>
        <div class="modal-content">
          <div class="filter-group">
            <label class="filter-label">Estado</label>
            <select v-model="filterStatus" class="filter-select">
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Fecha de último servicio</label>
            <select v-model="filterDateRange" class="filter-select">
              <option value="">Cualquier fecha</option>
              <option value="last-week">Última semana</option>
              <option value="last-month">Último mes</option>
              <option value="last-3-months">Últimos 3 meses</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="clear-filters-btn" @click="clearFilters">Limpiar</button>
          <button class="apply-filters-btn" @click="applyFilters">Aplicar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { getClients, getClientById, updateClient } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

// Interfaces
interface Client {
  id: number
  firstname: string
  lastname: string
  phone: string
  lastServiceDate: string
  isActive: boolean
}

interface StatusTab {
  value: string
  label: string
}

const router = useRouter()
const authStore = useAuthStore()

// Reactive data
const loading = ref(false)
const searchQuery = ref('')
const activeTab = ref('received')
const showFilterModal = ref(false)
const filterStatus = ref('')
const filterDateRange = ref('')

// Client data
const clients = ref<Client[]>([])

// Selected client and details
const selectedClient = ref<Client | null>(null)
const clientDetails = ref<any>(null)
const loadingDetails = ref(false)
const savingClient = ref(false)

// Form data for editing client
const clientForm = reactive({
  firstname: '',
  lastname: '',
  phone: '',
  dni: '',
  email: '',
  isActive: true
})

// Status tabs configuration
const statusTabs: StatusTab[] = [
  { value: 'received', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'all', label: 'Todos' }
]

// Computed properties
const filteredClients = computed(() => {
  // Asegurar que siempre trabajemos con un array
  let filtered = Array.isArray(clients.value) ? clients.value : []

  console.log('🔍 filteredClients computed - clients.value:', clients.value)
  console.log('🔍 filteredClients computed - filtered inicial:', filtered)

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(client => 
      client.firstname?.toLowerCase().includes(query) ||
      client.lastname?.toLowerCase().includes(query) ||
      client.phone?.includes(query)
    )
    console.log('🔍 Después de filtro de búsqueda:', filtered.length)
  }

  // Filter by active tab
  switch (activeTab.value) {
    case 'received':
      filtered = filtered.filter(client => client.isActive === true)
      break
    case 'inactive':
      filtered = filtered.filter(client => client.isActive === false)
      break
    case 'all':
      // No additional filtering
      break
  }
  console.log('🔍 Después de filtro de pestaña:', filtered.length)

  // Filter by status (from modal)
  if (filterStatus.value) {
    const isActive = filterStatus.value === 'active'
    filtered = filtered.filter(client => client.isActive === isActive)
    console.log('🔍 Después de filtro de estado:', filtered.length)
  }

  // Filter by date range (from modal)
  if (filterDateRange.value) {
    const now = new Date()
    
    filtered = filtered.filter(client => {
      if (!client.lastServiceDate) return false
      
      const clientDate = new Date(client.lastServiceDate)
      
      switch (filterDateRange.value) {
        case 'last-week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return clientDate >= weekAgo
        case 'last-month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return clientDate >= monthAgo
        case 'last-3-months':
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          return clientDate >= threeMonthsAgo
        default:
          return true
      }
    })
    console.log('🔍 Después de filtro de fecha:', filtered.length)
  }

  console.log('🔍 filteredClients final:', filtered.length, 'clientes')
  return filtered
})

// Methods
function goBack() {
  router.push({ name: 'dashboard' })
}

function setActiveTab(tab: string) {
  activeTab.value = tab
}

function createNewClient() {
  router.push({ name: 'client-create' })
}

function selectClient(client: Client) {
  selectedClient.value = client
  loadClientDetails(client.id)
}

async function loadClientDetails(clientId: number) {
  try {
    loadingDetails.value = true
    const details = await getClientById(clientId)
    clientDetails.value = details
    
    // Llenar el formulario con los datos del cliente
    clientForm.firstname = details.firstname || ''
    clientForm.lastname = details.lastname || ''
    clientForm.phone = details.phone || ''
    clientForm.dni = details.dni || ''
    clientForm.email = details.email || ''
    clientForm.isActive = details.isActive !== undefined ? details.isActive : true
  } catch (error) {
    console.error('Error cargando detalles del cliente:', error)
    alert('Error al cargar los detalles del cliente')
    closeDetails()
  } finally {
    loadingDetails.value = false
  }
}

function closeDetails() {
  selectedClient.value = null
  clientDetails.value = null
  // Resetear formulario
  clientForm.firstname = ''
  clientForm.lastname = ''
  clientForm.phone = ''
  clientForm.dni = ''
  clientForm.email = ''
  clientForm.isActive = true
}

async function handleUpdateClient() {
  if (!selectedClient.value) return

  // Validaciones
  if (clientForm.phone.length !== 9 || !/^\d+$/.test(clientForm.phone)) {
    alert('El número de teléfono debe tener 9 dígitos numéricos.')
    return
  }

  if (!clientForm.dni || clientForm.dni.length !== 8 || !/^\d+$/.test(clientForm.dni)) {
    alert('El DNI es obligatorio y debe tener 8 dígitos numéricos.')
    return
  }

  try {
    savingClient.value = true
    
    const payload = {
      firstname: clientForm.firstname.trim(),
      lastname: clientForm.lastname.trim(),
      phone: clientForm.phone,
      dni: clientForm.dni,
      email: clientForm.email.trim().toLowerCase(),
      isActive: clientForm.isActive
    }

    console.log('🔄 Actualizando cliente:', selectedClient.value.id, payload)

    await updateClient(selectedClient.value.id, payload)

    alert('✅ Cliente actualizado exitosamente')
    
    // Recargar la lista de clientes
    await loadClients()
    
    // Recargar los detalles del cliente actualizado
    await loadClientDetails(selectedClient.value.id)
    
  } catch (error: any) {
    console.error('❌ Error actualizando cliente:', error)
    const errorMessage = error.response?.data?.message || 'Error al actualizar el cliente'
    alert(`Error al actualizar cliente: ${errorMessage}`)
  } finally {
    savingClient.value = false
  }
}

function viewClientDetails(client: Client) {
  // Esta función ya no navega, ahora selecciona el cliente
  selectClient(client)
}

function filterClients() {
  // The computed property will automatically update
  console.log('Filtrando clientes con query:', searchQuery.value)
}

function toggleFilterModal() {
  showFilterModal.value = !showFilterModal.value
}

function closeFilterModal() {
  showFilterModal.value = false
}

function clearFilters() {
  filterStatus.value = ''
  filterDateRange.value = ''
}

function applyFilters() {
  closeFilterModal()
  console.log('Aplicando filtros:', { filterStatus: filterStatus.value, filterDateRange: filterDateRange.value })
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

async function loadClients() {
  try {
    loading.value = true
    console.log('🔄 Cargando clientes...')
    
    // El backend obtendrá automáticamente el businesId del usuario logueado
    const response = await getClients()
    console.log('📡 Respuesta de la API:', response)
    
    // Asegurar que siempre sea un array
    if (Array.isArray(response)) {
      clients.value = response
    } else if (response && Array.isArray(response.data)) {
      clients.value = response.data
    } else if (response && Array.isArray(response.clients)) {
      clients.value = response.clients
    } else {
      console.log('⚠️ Formato de respuesta inesperado, usando array vacío')
      clients.value = []
    }
    
    console.log('✅ Clientes cargados:', clients.value.length)
    console.log('📋 Datos de clientes procesados:', clients.value)
    
    // Validar que cada cliente tenga las propiedades necesarias
    clients.value = clients.value.map(client => ({
      id: client.id || 0,
      firstname: client.firstname || '',
      lastname: client.lastname || '',
      phone: client.phone || '',
      // Usar createdAt como lastServiceDate si no existe
      lastServiceDate: client.lastServiceDate || client.createdAt || new Date().toISOString().split('T')[0],
      isActive: client.isActive !== undefined ? client.isActive : true
    }))
    
  } catch (error) {
    console.error('❌ Error cargando clientes:', error)
    clients.value = []
    
    // Mostrar datos mock en caso de error para desarrollo
    if ((import.meta as any).env?.DEV) {
      console.log('🔄 Usando datos mock para desarrollo...')
      clients.value = [
        {
          id: 1,
          firstname: 'Jesus',
          lastname: 'Flores',
          phone: '999888777',
          lastServiceDate: '2024-01-01',
          isActive: true
        },
        {
          id: 2,
          firstname: 'Maria',
          lastname: 'Gonzalez',
          phone: '987654321',
          lastServiceDate: '2024-01-15',
          isActive: true
        },
        {
          id: 3,
          firstname: 'Carlos',
          lastname: 'Rodriguez',
          phone: '912345678',
          lastServiceDate: '2023-12-20',
          isActive: false
        },
        {
          id: 4,
          firstname: 'Ana',
          lastname: 'Martinez',
          phone: '955566677',
          lastServiceDate: '2024-01-10',
          isActive: true
        },
        {
          id: 5,
          firstname: 'Luis',
          lastname: 'Perez',
          phone: '933344455',
          lastServiceDate: '2023-11-30',
          isActive: true
        }
      ] as Client[]
    }
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Aplicar estilos directamente al body y #app para usar todo el ancho
  const body = document.body
  const app = document.getElementById('app')
  
  if (body) {
    body.style.display = 'block'
    body.style.width = '100vw'
    body.style.maxWidth = '100vw'
    body.style.margin = '0'
    body.style.padding = '0'
    body.style.overflowX = 'hidden'
  }
  
  if (app) {
    app.style.width = '100vw'
    app.style.maxWidth = '100vw'
    app.style.margin = '0'
    app.style.padding = '0'
    app.style.display = 'block'
  }
  
  loadClients()
})
</script>

<style>
/* Estilos globales para sobrescribir el body solo en esta vista */
body:has(.client-list-container) {
  display: block !important;
  place-items: unset !important;
  align-items: unset !important;
  justify-content: unset !important;
  padding: 0 !important;
  margin: 0 !important;
  width: 100vw !important;
  max-width: 100vw !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}

body:has(.client-list-container) #app {
  width: 100vw !important;
  max-width: 100vw !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
  min-width: 100vw !important;
}

body:has(.client-list-container) #app > * {
  width: 100vw !important;
  max-width: 100vw !important;
  box-sizing: border-box !important;
}

/* Router-view específico */
body:has(.client-list-container) router-view {
  width: 100vw !important;
  max-width: 100vw !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  min-width: 100vw !important;
}

/* Aplicar directamente a cualquier elemento hijo de #app */
body:has(.client-list-container) #app > router-view,
body:has(.client-list-container) #app > * {
  width: 100vw !important;
  max-width: 100vw !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>

<style scoped>
.client-list-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 100vh;
  width: 100vw !important;
  max-width: 100vw !important;
  background-color: #f8f9fa;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  overflow: hidden;
  z-index: 1;
}

/* Layout principal - Una sola columna que ocupa toda la pantalla */
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw !important;
  max-width: 100vw !important;
  overflow: hidden;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* Sidebar - Ocupa toda la pantalla o se ajusta cuando hay panel de detalles */
.sidebar {
  background-color: #fff;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}

/* Header */
.client-list-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.back-button {
  background: none;
  border: none;
  padding: 8px;
  margin-right: 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #f0f0f0;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

/* Search and Filter */
.search-filter-container {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input-container {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  background-color: #fff;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.filter-button {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.filter-button:hover {
  background-color: #e8e8e8;
}

/* Status Tabs */
.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background-color: #f5f5f5;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button.active {
  background-color: #333;
  color: white;
}

.tab-button:hover:not(.active) {
  background-color: #e8e8e8;
}

/* Create Button */
.create-button-container {
  margin-bottom: 24px;
}

.create-client-btn {
  width: 100%;
  background-color: #ff6b35;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.create-client-btn:hover {
  background-color: #e55a2b;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #ff6b35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.empty-icon {
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Client card selected state */
.client-card.selected {
  border: 2px solid #ff6b35;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
}

/* Client List */
.client-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.client-list::-webkit-scrollbar {
  width: 6px;
}

.client-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.client-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 10px;
}

.client-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.client-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e0e0e0;
}

.client-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.client-info {
  flex: 1;
}

.client-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.client-phone {
  font-size: 14px;
  color: #666;
  margin: 0 0 4px 0;
}

.last-service {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.client-status {
  margin-left: 16px;
}

.status-tag {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-tag.active {
  background-color: #dc3545;
  color: white;
}

.status-tag.inactive {
  background-color: #6c757d;
  color: white;
}

/* Client Details Panel */
.client-details-panel {
  background-color: #fff;
  width: 400px;
  flex-shrink: 0;
  border-left: 1px solid #e0e0e0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
  display: none; /* Oculto por defecto en mobile */
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.details-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.close-details-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-details-btn:hover {
  background-color: #f0f0f0;
}

.loading-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.loading-details .loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #ff6b35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.details-content {
  flex: 1;
}

.client-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background-color: #fff;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background-color: #f5f5f5;
}

.btn-save {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background-color: #ff6b35;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-save:hover:not(:disabled) {
  background-color: #e55a2b;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Filter Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.filter-modal {
  background-color: white;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
}

.close-button:hover {
  background-color: #f0f0f0;
}

.modal-content {
  padding: 20px;
}

.filter-group {
  margin-bottom: 20px;
}

.filter-label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.filter-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background-color: white;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.clear-filters-btn {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: white;
  color: #666;
  font-weight: 500;
  cursor: pointer;
}

.apply-filters-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background-color: #ff6b35;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

/* Responsive */
@media (min-width: 768px) {
  .client-list-container {
    width: 100vw;
    left: 0;
    right: 0;
  }

  .main-layout {
    flex-direction: row; /* Dos columnas cuando hay cliente seleccionado */
    width: 100vw !important;
    max-width: 100vw !important;
  }
  
  .sidebar {
    width: 100%;
    padding: 24px;
    flex: 1;
    min-width: 0;
  }
  
  /* Cuando hay cliente seleccionado, ajustar el sidebar */
  .main-layout:has(.client-details-panel) .sidebar {
    width: calc(100vw - 400px);
  }
  
  .client-list {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
  }
  
  .client-details-panel {
    display: flex;
  }
}

@media (min-width: 1024px) {
  .sidebar {
    padding: 32px;
  }
  
  /* Cuando hay cliente seleccionado, ajustar el sidebar */
  .main-layout:has(.client-details-panel) .sidebar {
    max-width: none;
    margin: 0;
  }
  
  .client-list {
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 24px;
  }
  
  .client-details-panel {
    width: 450px;
  }
  
  .main-layout:has(.client-details-panel) .sidebar {
    width: calc(100vw - 450px);
  }
}

@media (min-width: 1280px) {
  .sidebar {
    padding: 40px;
  }
  
  .client-list {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 24px;
  }
  
  .client-details-panel {
    width: 500px;
    padding: 24px;
  }
  
  .main-layout:has(.client-details-panel) .sidebar {
    width: calc(100vw - 500px);
  }
}

@media (min-width: 1600px) {
  .client-list {
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  }
}

@media (max-width: 767px) {
  .client-list-container {
    position: relative;
    padding: 0;
  }
  
  .sidebar {
    height: auto;
    min-height: 100vh;
    padding: 16px;
  }
  
  .search-filter-container {
    flex-direction: column;
  }
  
  .status-tabs {
    flex-wrap: wrap;
  }
  
  .client-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .client-status {
    margin-left: 0;
    align-self: flex-end;
  }
  
  .client-list-header {
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  
  .title {
    font-size: 20px;
  }
  
  /* Panel de detalles como modal en mobile */
  .client-details-panel {
    display: flex !important; /* Mostrar el panel en mobile cuando está visible */
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    z-index: 1000;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
    flex-direction: column;
    background-color: #fff;
    padding: 20px;
    box-sizing: border-box;
    overflow-y: auto;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
