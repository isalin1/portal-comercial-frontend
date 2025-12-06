<template>
  <div class="colaborador-services-container">
    <!-- Header -->
    <header class="services-header">
      <button class="back-button" @click="goBack">
        <i class="fas fa-arrow-left"></i>
      </button>
      <h1 class="title">Mis Servicios - {{ pointSaleName }}</h1>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">🔄</div>
      <p>Cargando servicios...</p>
    </div>

    <!-- Servicios del PointSale -->
    <div v-else-if="pointSaleServices.length > 0" class="services-list">
      <div class="service-item" v-for="service in pointSaleServices" :key="service.id">
        <div class="service-info">
          <h3 class="service-name">{{ service.listservice.type }}</h3>
          <p class="service-category">{{ service.listservice.servicecategory.name }}</p>
        </div>

        <div class="service-price-section">
          <div class="price-input-container">
            <label class="price-label">Precio:</label>
            <input
              v-model="service.price"
              type="number"
              step="0.01"
              min="0"
              class="price-input"
              @blur="updatePrice(service.id, service.price)"
              :disabled="updatingPrice === service.id"
            />
            <span class="currency">S/.</span>
          </div>
        </div>

        <div class="service-actions">
          <button
            class="toggle-btn"
            :class="{ active: service.isActive }"
            @click="toggleService(service.id)"
            :disabled="updatingToggle === service.id"
            :title="service.isActive ? 'Desactivar' : 'Activar'"
          >
            {{ service.isActive ? '🔘' : '⚪' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Sin servicios -->
    <div v-else class="no-services-message">
      <div class="no-services-card">
        <h3 class="no-services-title">Sin servicios asignados</h3>
        <p class="no-services-description">
          No hay servicios asignados a este punto de venta.
          Contacta al administrador para que asigne servicios.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPointSaleServices, updatePointSaleServicePrice, togglePointSaleServiceActive } from '@/api/lavanderiaApi'

const router = useRouter()
const loading = ref(false)
const updatingPrice = ref<number | null>(null)
const updatingToggle = ref<number | null>(null)

const pointSaleServices = ref([])
const pointSaleName = ref('Mi Punto de Venta')

function goBack() {
  router.push({ name: 'dashboard' })
}

async function loadServices() {
  try {
    loading.value = true
    // Por ahora usar pointsaleId = 1, después se obtendrá del usuario logueado
    const pointsaleId = 1
    const services = await getPointSaleServices(pointsaleId)
    pointSaleServices.value = services
    console.log('Servicios cargados:', services)
  } catch (error) {
    console.error('Error cargando servicios:', error)
    pointSaleServices.value = []
  } finally {
    loading.value = false
  }
}

async function updatePrice(serviceId: number, price: number) {
  try {
    updatingPrice.value = serviceId
    await updatePointSaleServicePrice(serviceId, price)
    console.log('Precio actualizado:', serviceId, price)
  } catch (error) {
    console.error('Error actualizando precio:', error)
    alert('Error al actualizar el precio')
  } finally {
    updatingPrice.value = null
  }
}

async function toggleService(serviceId: number) {
  try {
    updatingToggle.value = serviceId
    await togglePointSaleServiceActive(serviceId)
    console.log('Estado actualizado:', serviceId)
    // Recargar servicios para obtener el estado actualizado
    await loadServices()
  } catch (error) {
    console.error('Error actualizando estado:', error)
    alert('Error al actualizar el estado del servicio')
  } finally {
    updatingToggle.value = null
  }
}

onMounted(() => {
  console.log('ColaboradorServicesView montado')
  loadServices()
})
</script>

<style scoped>
.colaborador-services-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.services-header {
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

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.loading-spinner {
  font-size: 48px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.services-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.service-item {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 20px;
}

.service-info {
  flex: 1;
}

.service-name {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.service-category {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.service-price-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.price-input-container {
  display: flex;
  align-items: center;
  gap: 5px;
}

.price-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.price-input {
  width: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  text-align: right;
}

.price-input:focus {
  outline: none;
  border-color: #ff6b35;
}

.price-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.currency {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.service-actions {
  display: flex;
  gap: 10px;
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.toggle-btn:hover:not(:disabled) {
  transform: scale(1.1);
  background-color: #fff5f0;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-btn.active {
  color: #28a745;
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
</style>
