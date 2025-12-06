<template>
  <div v-if="planStatus && planStatus.isExpiringSoon" class="plan-expiration-banner">
    <div class="banner-content">
      <div class="banner-icon">⚠️</div>
      <div class="banner-text">
        <strong>Advertencia:</strong> Tu plan vence en 
        <strong>{{ planStatus.daysRemaining }} {{ planStatus.daysRemaining === 1 ? 'día' : 'días' }}</strong>.
        {{ planStatus.daysRemaining === 1 ? 'Serás desactivado mañana' : 'Serás desactivado cuando el plan venza' }}.
        Contacta al administrador para renovar tu plan.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { getBusinessPlanStatus } from '@/api/lavanderiaApi'
import { getBusinessData } from '@/api/lavanderiaApi'

const authStore = useAuthStore()
const planStatus = ref<any>(null)

const loadPlanStatus = async () => {
  // Solo para ADMIN, verificar estado del plan
  if (authStore.user?.role !== 'ADMIN') {
    return
  }

  try {
    // Obtener el businessId del usuario ADMIN
    const businesses = await getBusinessData()
    const userBusiness = businesses.find((b: any) => b.userId === authStore.user?.id)
    
    if (userBusiness) {
      const status = await getBusinessPlanStatus(userBusiness.id)
      planStatus.value = status
    }
  } catch (error: any) {
    // Si no tiene plan activo, no mostrar banner
    if (error.response?.status !== 404) {
      console.error('Error cargando estado del plan:', error)
    }
    planStatus.value = null
  }
}

onMounted(() => {
  loadPlanStatus()
})
</script>

<style scoped>
.plan-expiration-banner {
  background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
  border-left: 4px solid #ffc107;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  color: #856404;
  font-size: 14px;
  line-height: 1.5;
}

.banner-text strong {
  font-weight: 600;
  color: #664d03;
}

@media (min-width: 768px) {
  .plan-expiration-banner {
    padding: 20px 24px;
  }

  .banner-text {
    font-size: 15px;
  }
}
</style>



