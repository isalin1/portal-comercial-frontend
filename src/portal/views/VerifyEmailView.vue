<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

const route = useRoute()
const error = ref('')
const message = ref('')
const loading = ref(true)

onMounted(async () => {
  const token = String(route.query.token || '').trim()
  if (!token) {
    error.value = 'El enlace no es válido. Solicita uno nuevo desde el inicio de sesión.'
    loading.value = false
    return
  }
  try {
    const { data } = await http.post<{ message: string }>('/auth/verificar-correo', { token })
    message.value = data.message
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <ScreenFrame storefront back>
    <div class="wrap">
      <h2>Verificar correo</h2>
      <p v-if="loading" class="lead">Estamos confirmando tu correo.</p>
      <p v-else-if="message" class="ok">{{ message }}</p>
      <p v-else class="error">{{ error }}</p>
      <p v-if="!loading" class="login-link">
        <router-link :to="{ name: 'login' }">Ir a iniciar sesión</router-link>
      </p>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.wrap {
  font-family: var(--font-ui);
  text-align: center;
}

h2 {
  margin: 8px 0 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
}

.lead,
.ok,
.error {
  margin: 12px auto 0;
  max-width: 300px;
  font-size: 14px;
  line-height: 20px;
}

.lead {
  color: #5c5e65;
}

.ok {
  color: #157347;
  font-weight: 700;
}

.login-link {
  margin: 18px 0 0;
}

.login-link a {
  color: var(--color-brand);
  font-size: 14px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
