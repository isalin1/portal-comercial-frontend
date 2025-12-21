<template>
  <div class="profile-container">
    <!-- Header -->
    <header class="profile-header">
      <button class="back-button" @click="goBack" title="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Mi Perfil</h1>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <p>Cargando información...</p>
    </div>

    <!-- Content -->
    <div v-else class="content">
      <!-- 1. Información Personal -->
      <section class="section">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="section-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#ff6b35" stroke-width="2"/>
            <circle cx="12" cy="7" r="4" stroke="#ff6b35" stroke-width="2"/>
          </svg>
          <h2 class="section-title">Información Personal</h2>
        </div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Nombre completo:</span>
            <span class="info-value">{{ userInfo.firstname }} {{ userInfo.lastname }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">{{ userInfo.email }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Teléfono:</span>
            <span class="info-value">{{ userInfo.phone || 'No registrado' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">DNI:</span>
            <span class="info-value">{{ userInfo.dni || 'No registrado' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Rol:</span>
            <span class="info-value" :class="getRoleClass(userInfo.role)">{{ getRoleLabel(userInfo.role) }}</span>
          </div>
        </div>
      </section>

      <!-- 2. Seguridad -->
      <section class="section">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="section-icon">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#ff6b35" stroke-width="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#ff6b35" stroke-width="2"/>
          </svg>
          <h2 class="section-title">Seguridad</h2>
        </div>
        
        <div class="security-card">
          <div v-if="!showPasswordForm" class="security-info">
            <p class="security-message">Mantén tu cuenta segura actualizando tu contraseña regularmente.</p>
            <button @click="showPasswordForm = true" class="btn-change-password">
              Cambiar Contraseña
            </button>
          </div>
          
          <form v-else @submit.prevent="handleChangePassword" class="password-form">
            <div class="form-group">
              <label for="currentPassword" class="form-label">Contraseña Actual *</label>
              <input
                id="currentPassword"
                v-model="passwordForm.currentPassword"
                type="password"
                class="form-input"
                placeholder="Ingresa tu contraseña actual"
                required
              >
            </div>
            
            <div class="form-group">
              <label for="newPassword" class="form-label">Nueva Contraseña *</label>
              <input
                id="newPassword"
                v-model="passwordForm.newPassword"
                type="password"
                class="form-input"
                placeholder="Mínimo 6 caracteres"
                minlength="6"
                required
              >
            </div>
            
            <div class="form-group">
              <label for="confirmPassword" class="form-label">Confirmar Nueva Contraseña *</label>
              <input
                id="confirmPassword"
                v-model="passwordForm.confirmPassword"
                type="password"
                class="form-input"
                placeholder="Repite la nueva contraseña"
                required
              >
            </div>
            
            <div v-if="passwordError" class="error-message">
              {{ passwordError }}
            </div>
            
            <div v-if="passwordSuccess" class="success-message">
              {{ passwordSuccess }}
            </div>
            
            <div class="form-actions">
              <button type="button" @click="cancelPasswordChange" class="btn-cancel">
                Cancelar
              </button>
              <button type="submit" class="btn-save" :disabled="savingPassword">
                {{ savingPassword ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- 3. Información del Negocio -->
      <section class="section" v-if="businessInfo">
        <div class="section-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="section-icon">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#ff6b35" stroke-width="2"/>
          </svg>
          <h2 class="section-title">Información del Negocio</h2>
        </div>
        
        <div class="info-card">
          <div v-if="userInfo.role === 'SUPERADMIN'" class="superadmin-message">
            <p>Como SUPERADMIN, tienes acceso a todos los negocios del sistema.</p>
          </div>
          
          <div v-else-if="userInfo.role === 'ADMIN'">
            <div class="info-row">
              <span class="info-label">Negocio:</span>
              <span class="info-value">{{ businessInfo.name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nombre comercial:</span>
              <span class="info-value">{{ businessInfo.comercialname || 'No registrado' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Puntos de venta:</span>
              <div class="pointsales-list">
                <span v-for="ps in businessInfo.pointsales" :key="ps.id" class="pointsale-tag">
                  {{ ps.name }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else-if="userInfo.role === 'COLABORADOR' && pointsaleInfo">
            <div class="info-row">
              <span class="info-label">Negocio:</span>
              <span class="info-value">{{ pointsaleInfo.business.name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Punto de venta asignado:</span>
              <span class="info-value">{{ pointsaleInfo.name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Dirección:</span>
              <span class="info-value">{{ pointsaleInfo.address }}</span>
            </div>
          </div>
          
          <div v-else-if="userInfo.role === 'CLIENT' && clientBusinessInfo">
            <div class="info-row">
              <span class="info-label">Cliente de:</span>
              <span class="info-value">{{ clientBusinessInfo.name }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { lavanderiaApi, changePassword } from '@/api/lavanderiaApi'

const router = useRouter()
const authStore = useAuthStore()

// Estado
const loading = ref(false)
const showPasswordForm = ref(false)
const savingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

// Información del usuario
const userInfo = ref({
  firstname: '',
  lastname: '',
  email: '',
  phone: '',
  dni: '',
  role: ''
})

// Información del negocio
const businessInfo = ref<any>(null)
const pointsaleInfo = ref<any>(null)
const clientBusinessInfo = ref<any>(null)

// Formulario de cambio de contraseña
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Métodos
const goBack = () => {
  router.push({ name: 'dashboard' })
}

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    'SUPERADMIN': 'Super Administrador',
    'ADMIN': 'Administrador',
    'COLABORADOR': 'Colaborador',
    'CLIENT': 'Cliente'
  }
  return labels[role] || role
}

const getRoleClass = (role: string) => {
  return `role-${role.toLowerCase()}`
}

const loadUserInfo = async () => {
  try {
    loading.value = true
    
    // Obtener información del usuario actual
    const user = authStore.user
    if (!user) {
      router.push({ name: 'login' })
      return
    }
    
    userInfo.value = {
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      email: user.email || '',
      phone: user.phone || '',
      dni: user.dni || '',
      role: user.role || ''
    }
    
    // Cargar información del negocio según el rol
    if (user.role === 'ADMIN') {
      const { data } = await lavanderiaApi.get('/busines')
      const userBusiness = data.find((b: any) => b.userId === user.id)
      if (userBusiness) {
        businessInfo.value = userBusiness
      }
    } else if (user.role === 'COLABORADOR') {
      const { data: pointsales } = await lavanderiaApi.get('/pointsale')
      const userPointsale = pointsales.find((ps: any) => ps.userId === user.id)
      if (userPointsale) {
        pointsaleInfo.value = userPointsale
      }
    } else if (user.role === 'CLIENT') {
      // Obtener información del negocio del cliente
      const { data: userData } = await lavanderiaApi.get(`/user`)
      const currentUser = userData.find((u: any) => u.id === user.id)
      if (currentUser && currentUser.clientBusines) {
        clientBusinessInfo.value = currentUser.clientBusines
      }
    }
    
  } catch (error) {
    console.error('Error cargando información del usuario:', error)
  } finally {
    loading.value = false
  }
}

const handleChangePassword = async () => {
  passwordError.value = ''
  passwordSuccess.value = ''
  
  // Validaciones
  if (passwordForm.value.newPassword.length < 6) {
    passwordError.value = 'La nueva contraseña debe tener al menos 6 caracteres'
    return
  }
  
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = 'Las contraseñas no coinciden'
    return
  }
  
  if (passwordForm.value.currentPassword === passwordForm.value.newPassword) {
    passwordError.value = 'La nueva contraseña debe ser diferente a la actual'
    return
  }
  
  try {
    savingPassword.value = true
    
    await changePassword(passwordForm.value.currentPassword, passwordForm.value.newPassword)
    
    passwordSuccess.value = 'Contraseña actualizada correctamente'
    
    // Limpiar formulario
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    
    // Ocultar formulario después de 2 segundos
    setTimeout(() => {
      showPasswordForm.value = false
      passwordSuccess.value = ''
    }, 2000)
    
  } catch (error: any) {
    console.error('Error cambiando contraseña:', error)
    passwordError.value = error.response?.data?.message || 'Error al cambiar la contraseña. Verifica tu contraseña actual.'
  } finally {
    savingPassword.value = false
  }
}

const cancelPasswordChange = () => {
  showPasswordForm.value = false
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  passwordError.value = ''
  passwordSuccess.value = ''
}

onMounted(() => {
  loadUserInfo()
})
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding-bottom: 2rem;
  width: 100%;
  box-sizing: border-box;
}

/* Header */
.profile-header {
  background-color: #fff;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  box-sizing: border-box;
}

.back-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: transform 0.2s;
}

.back-button:hover {
  transform: translateX(-3px);
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

/* Loading */
.loading-container {
  padding: 2rem;
  text-align: center;
  color: #666;
}

/* Content */
.content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-sizing: border-box;
}

/* Section */
.section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #f0f0f0;
}

.section-icon {
  flex-shrink: 0;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

/* Info Card */
.info-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.info-value {
  font-size: 1rem;
  color: #333;
  font-weight: 600;
}

.role-superadmin {
  color: #dc3545;
}

.role-admin {
  color: #ff6b35;
}

.role-colaborador {
  color: #007bff;
}

.role-client {
  color: #28a745;
}

/* Security Card */
.security-card {
  padding: 1rem;
}

.security-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  text-align: center;
}

.security-message {
  color: #666;
  margin: 0;
}

.btn-change-password {
  padding: 0.75rem 2rem;
  background: #ff6b35;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-change-password:hover {
  background: #ff8c5a;
}

/* Password Form */
.password-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.form-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.error-message {
  padding: 0.75rem;
  background: #fee;
  border-left: 4px solid #dc3545;
  color: #dc3545;
  border-radius: 4px;
  font-size: 0.875rem;
}

.success-message {
  padding: 0.75rem;
  background: #d4edda;
  border-left: 4px solid #28a745;
  color: #28a745;
  border-radius: 4px;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn-cancel {
  flex: 1;
  padding: 0.75rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: #5a6268;
}

.btn-save {
  flex: 1;
  padding: 0.75rem;
  background: #ff6b35;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: #ff8c5a;
}

.btn-save:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Business Info */
.superadmin-message {
  padding: 1rem;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
}

.superadmin-message p {
  margin: 0;
  color: #856404;
}

.pointsales-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.pointsale-tag {
  padding: 0.4rem 0.8rem;
  background: #e7f3ff;
  color: #007bff;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Responsive */
@media (min-width: 769px) {
  .profile-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .profile-header {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 2rem;
  }

  .content {
    padding: 2rem;
    gap: 2rem;
  }

  .section {
    padding: 2rem;
  }

  .info-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
  }

  .info-label {
    font-size: 1rem;
    min-width: 200px;
  }

  .info-value {
    font-size: 1.125rem;
    text-align: right;
    flex: 1;
  }
}

@media (min-width: 1024px) {
  .content {
    padding: 2.5rem 3rem;
    max-width: 1000px;
  }

  .section {
    padding: 2.5rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .info-row {
    padding: 1.25rem 2rem;
  }

  .info-label {
    min-width: 220px;
  }
}

@media (min-width: 1280px) {
  .content {
    padding: 3rem 4rem;
    max-width: 1200px;
  }

  .section {
    padding: 3rem;
  }

  .info-row {
    padding: 1.5rem 2.5rem;
  }

  .info-label {
    min-width: 250px;
    font-size: 1.125rem;
  }

  .info-value {
    font-size: 1.25rem;
  }
}

@media (max-width: 768px) {
  .content {
    padding: 1rem;
  }
  
  .section {
    padding: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .info-value {
    text-align: left;
  }
}
</style>

<style>
/* Estilos globales para asegurar que la vista use todo el ancho */
body:has(.profile-container) {
  display: block !important;
  place-items: unset !important;
  width: 100% !important;
  max-width: 100% !important;
}

#app:has(.profile-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
}

router-view:has(.profile-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
}
</style>

