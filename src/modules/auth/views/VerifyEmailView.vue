<template>
  <div class="verify-email-container">
    <div class="verify-email-card">
      <div class="card-header">
        <h1 class="title">Verificación de Email</h1>
        <div class="icon">📧</div>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Verificando tu email...</p>
      </div>

      <div v-else-if="success" class="success">
        <div class="success-icon">✅</div>
        <h2>¡Email Verificado!</h2>
        <p>{{ message }}</p>
        <router-link to="/auth/login" class="btn-primary">
          Ir al Login
        </router-link>
      </div>

      <div v-else-if="error" class="error">
        <div class="error-icon">❌</div>
        <h2>Error de Verificación</h2>
        <p>{{ errorMessage }}</p>
        <div class="actions">
          <button @click="resendVerification" class="btn-secondary" :disabled="resendLoading">
            {{ resendLoading ? 'Enviando...' : 'Reenviar Email' }}
          </button>
          <router-link to="/auth/login" class="btn-primary">
            Ir al Login
          </router-link>
        </div>
      </div>

      <div v-else class="default">
        <p>Procesando verificación...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { lavanderiaApi } from '@/api/lavanderiaApi'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const success = ref(false)
const error = ref(false)
const message = ref('')
const errorMessage = ref('')
const resendLoading = ref(false)

const verifyEmail = async (token: string) => {
  try {
    loading.value = true
    const response = await lavanderiaApi.verifyEmail(token)
    success.value = true
    message.value = response.message
  } catch (err: any) {
    error.value = true
    errorMessage.value = err.response?.data?.message || 'Error al verificar el email'
  } finally {
    loading.value = false
  }
}

const resendVerification = async () => {
  try {
    resendLoading.value = true
    // Aquí necesitarías el email del usuario, podrías guardarlo en localStorage durante el registro
    const email = localStorage.getItem('pendingVerificationEmail')
    if (!email) {
      errorMessage.value = 'No se encontró el email para reenviar. Por favor regístrate nuevamente.'
      return
    }

    await lavanderiaApi.resendVerificationEmail(email)
    errorMessage.value = 'Email de verificación reenviado. Revisa tu bandeja de entrada.'
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || 'Error al reenviar el email'
  } finally {
    resendLoading.value = false
  }
}

onMounted(() => {
  const token = route.query.token as string
  if (!token) {
    error.value = true
    errorMessage.value = 'Token de verificación no encontrado'
    loading.value = false
    return
  }

  verifyEmail(token)
})
</script>

<style scoped>
.verify-email-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.verify-email-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.card-header {
  margin-bottom: 2rem;
}

.title {
  font-size: 1.8rem;
  color: #333;
  margin-bottom: 1rem;
}

.icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.loading {
  padding: 2rem 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #ff7a2f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.success {
  padding: 2rem 0;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.success h2 {
  color: #28a745;
  margin-bottom: 1rem;
}

.error {
  padding: 2rem 0;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.error h2 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-primary, .btn-secondary {
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #ff7a2f;
  color: white;
}

.btn-primary:hover {
  background: #ff944d;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

p {
  color: #666;
  line-height: 1.5;
  margin-bottom: 1rem;
}
</style>
