<template>
  <div class="dashboard-client">
    <h1>Dashboard Cliente/Colaborador</h1>
    <div class="dashboard-content">
      <p>Bienvenido, {{ authStore.user?.firstname }} {{ authStore.user?.lastname }}</p>
      <p>Rol: {{ authStore.user?.role }}</p>
      
      <div class="actions">
        <router-link to="/simulation" class="btn btn-primary" v-if="authStore.user?.role === 'CLIENT'">
          Crear Simulación
        </router-link>
        <router-link to="/quotation" class="btn btn-secondary" v-if="authStore.user?.role === 'CLIENT'">
          Ver Cotizaciones
        </router-link>
        <router-link to="/listservice" class="btn btn-info" v-if="authStore.user?.role === 'COLABORADOR'">
          Gestionar Servicios
        </router-link>
      </div>
      
      <div class="logout-section">
        <button @click="handleLogout" class="btn btn-danger">
          Cerrar Sesión
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  console.log('Dashboard cliente cargado para usuario:', authStore.user)
})

const handleLogout = () => {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.dashboard-client {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-content {
  margin-top: 2rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.logout-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #dee2e6;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn:hover {
  opacity: 0.8;
  transform: translateY(-2px);
}
</style>

