<template>
  <div class="plans-main-container">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goToDashboard">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Vigencia de Planes</h1>
    </header>

    <!-- Menu Options Grid -->
    <div class="menu-options-grid">
      <!-- SUPERADMIN Options -->
      <template v-if="authStore.user?.role === 'SUPERADMIN'">
        <!-- Configuración de Planes -->
        <button class="menu-option-card" @click="navigateTo('/vigencia-planes/configure')">
          <div class="card-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
            </svg>
          </div>
          <h3 class="card-title">Configuración de Planes</h3>
          <p class="card-description">Gestionar planes disponibles, editar costos, crear nuevos planes</p>
        </button>

        <!-- Registro de Pagos -->
        <button class="menu-option-card" @click="navigateTo('/vigencia-planes/register-payment')">
          <div class="card-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h3 class="card-title">Registro de Pagos</h3>
          <p class="card-description">Registrar pagos de planes y activar negocios</p>
        </button>

        <!-- Actualización de Vigencias -->
        <button class="menu-option-card" @click="navigateTo('/vigencia-planes/update-validity')">
          <div class="card-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12,6 12,12 16,14"></polyline>
            </svg>
          </div>
          <h3 class="card-title">Actualización de Vigencias</h3>
          <p class="card-description">Gestionar vigencias, renovar planes, suspender/reactivar</p>
        </button>

        <!-- Lista de Planes y Vigencias -->
        <button class="menu-option-card" @click="navigateTo('/vigencia-planes/validity-list')">
          <div class="card-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </div>
          <h3 class="card-title">Lista de Planes y Vigencias</h3>
          <p class="card-description">Ver todos los planes activos, vencidos, próximos a vencer</p>
        </button>
      </template>

      <!-- ADMIN Options -->
      <template v-if="authStore.user?.role === 'ADMIN'">
        <!-- Mi Plan -->
        <button class="menu-option-card" @click="navigateToMyPlan">
          <div class="card-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h3 class="card-title">Mi Plan</h3>
          <p class="card-description">Ver detalles de mi plan, estado de vigencia, días restantes</p>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { getBusinessData } from '@/api/lavanderiaApi'
import { ref, onMounted } from 'vue'

const router = useRouter()
const authStore = useAuthStore()
const userBusinessId = ref<number | null>(null)

const goToDashboard = () => {
  router.push({ name: 'dashboard' })
}

const navigateTo = (path: string) => {
  router.push(path)
}

const navigateToMyPlan = () => {
  if (userBusinessId.value) {
    router.push(`/vigencia-planes/business/${userBusinessId.value}`)
  } else {
    alert('No se encontró información del negocio')
  }
}

const loadUserBusiness = async () => {
  if (authStore.user?.role === 'ADMIN') {
    try {
      const businesses = await getBusinessData()
      const userBusiness = businesses.find((b: any) => b.userId === authStore.user?.id)
      if (userBusiness) {
        userBusinessId.value = userBusiness.id
      }
    } catch (error) {
      console.error('Error cargando información del negocio:', error)
    }
  }
}

onMounted(() => {
  loadUserBusiness()
})
</script>

<style scoped>
.plans-main-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.back-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button:hover {
  background-color: #f0f0f0;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.menu-options-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .menu-options-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .menu-options-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.menu-option-card {
  background: white;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  padding: 32px 24px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.menu-option-card:hover {
  border-color: #ff6b35;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(255, 107, 53, 0.2);
}

.card-icon {
  color: #ff6b35;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.card-description {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

@media (min-width: 768px) {
  .plans-main-container {
    padding: 32px;
  }

  .title {
    font-size: 32px;
  }
}

@media (min-width: 1024px) {
  .plans-main-container {
    padding: 40px;
  }
}
</style>

