<template>
  <div class="login-container">
    <!-- Botón de regreso -->
    <button class="back-button" @click="goBack" title="Volver">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
      </svg>
    </button>
    
    <div class="logo-box">LAVANDERIAS</div>
    <h2>Iniciar Sesion</h2>
    <form class="login-form" @submit.prevent="onLogin">
      <label for="usuario">Usuario</label>
      <input
        id="usuario"
        v-model="email"
        type="text"
        placeholder="Ingresar usuario"
        class="input"
        autocomplete="username"
      />

      <label for="password">Contraseña</label>
      <input
        id="password"
        v-model="password"
        type="password"
        placeholder="Ingresar contraseña"
        class="input"
        autocomplete="current-password"
      />

      <button type="submit" class="btn-ingresar">Ingresar</button>
      <div v-if="error" style="color: red; margin-top: 10px">{{ error }}</div>
    </form>
    <p class="description">
      Encuentra todas las herramientas que requieres en un solo lugar
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useRouter } from 'vue-router'
import { Roles } from '../interfaces/role.enum'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')

const goBack = () => {
  router.push({ name: 'auth-presentation' })
}

const onLogin = async () => {
  error.value = ''
  const result = await authStore.login(email.value, password.value)
  if (result === true) {
    // Redirección basada en el rol del usuario
    const userRole = authStore.user?.role
    console.log('Rol del usuario logueado:', userRole)

    if (userRole === Roles.ADMIN || userRole === Roles.SUPERADMIN || userRole === Roles.COLABORADOR) {
      // ADMIN, SUPERADMIN y COLABORADOR van al dashboard principal
      router.push({ name: 'dashboard' })
    } else if (userRole === Roles.CLIENT) {
      // Solo los clientes van al dashboard de clientes
      router.push({ name: 'dashboard-client' })
    } else {
      // Fallback por si acaso
      console.warn('Rol no reconocido, redirigiendo a dashboard por defecto')
      router.push({ name: 'dashboard' })
    }
  } else if (typeof result === 'string') {
    error.value = result
  } else {
    error.value = 'Usuario o contraseña incorrectos'
  }
}
</script>

<style scoped>
.login-container {
  position: relative;
  border-radius: 0.5rem;
  padding: 2rem 1rem 1.5rem 1rem;
  max-width: 350px;
  width: 100%;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.logo-box {
  background: #000;
  color: #fff;
  font-weight: 500;
  font-size: 1.2rem;
  padding: 0.5rem 2.5rem;
  border-radius: 4px;
  margin-bottom: 2rem;
  text-align: center;
}

h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

label {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.2rem;
}

.input {
  width: 100%;
  padding: 0.7rem;
  border: none;
  border-radius: 6px;
  background: #ffe5e5;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  outline: none;
  box-sizing: border-box;
}

.btn-ingresar {
  width: 100%;
  padding: 0.8rem 0;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  background: #ff7a2f;
  color: #fff;
  font-weight: 600;
  margin-top: 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-ingresar:hover {
  background: #ff944d;
}

.description {
  margin-top: 2rem;
  color: #222;
  font-size: 1rem;
  text-align: center;
  line-height: 1.4;
  max-width: 280px;
}

.back-button {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  z-index: 10;
}

.back-button:hover {
  transform: translateX(-3px);
}

.back-button:active {
  transform: translateX(-5px);
}

/* Tablet */
@media (min-width: 768px) {
  .login-container {
    max-width: 450px;
    padding: 2.5rem 2rem;
    margin: 0 auto;
  }

  .logo-box {
    font-size: 1.3rem;
    padding: 0.6rem 3rem;
    margin-bottom: 2.5rem;
  }

  h2 {
    font-size: 1.4rem;
    margin-bottom: 2rem;
  }

  .login-form {
    gap: 0.9rem;
  }

  label {
    font-size: 1rem;
  }

  .input {
    padding: 0.85rem;
    font-size: 1.05rem;
  }

  .btn-ingresar {
    padding: 0.9rem 0;
    font-size: 1.05rem;
  }

  .description {
    font-size: 1.05rem;
    margin-top: 3rem;
  }

  .back-button {
    top: 1.5rem;
    left: 1.5rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .login-container {
    max-width: 500px;
    padding: 2.5rem 2rem;
    margin: 0 auto;
    min-height: auto;
    max-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: none;
    border: none;
  }

  .logo-box {
    font-size: 1.4rem;
    padding: 0.7rem 3.5rem;
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 1.6rem;
    margin-bottom: 1.5rem;
  }

  .login-form {
    gap: 1rem;
  }

  label {
    font-size: 1.05rem;
    margin-bottom: 0.3rem;
  }

  .input {
    padding: 1rem;
    font-size: 1.1rem;
    border-radius: 8px;
  }

  .btn-ingresar {
    padding: 1rem 0;
    font-size: 1.1rem;
    border-radius: 10px;
  }

  .description {
    font-size: 1rem;
    margin-top: 2rem;
    line-height: 1.5;
    max-width: 350px;
  }

  .back-button {
    top: 2rem;
    left: 2rem;
    padding: 0.6rem;
  }

  .back-button svg {
    width: 28px;
    height: 28px;
  }
}

/* Large Desktop */
@media (min-width: 1280px) {
  .login-container {
    max-width: 550px;
    padding: 3rem 2.5rem;
    margin: 0 auto;
    box-shadow: none;
    border: none;
  }

  .logo-box {
    font-size: 1.5rem;
    padding: 0.8rem 4rem;
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
  }

  .input {
    padding: 1.1rem;
    font-size: 1.15rem;
  }

  .btn-ingresar {
    padding: 1.1rem 0;
    font-size: 1.15rem;
  }

  .description {
    font-size: 1.05rem;
    margin-top: 2rem;
    max-width: 380px;
  }
}

/* Extra Large Desktop */
@media (min-width: 1536px) {
  .login-container {
    max-width: 600px;
    padding: 3.5rem 3rem;
    margin: 0 auto;
    box-shadow: none;
    border: none;
  }

  .logo-box {
    font-size: 1.6rem;
    padding: 0.9rem 4.5rem;
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 2rem;
    margin-bottom: 1.5rem;
  }

  .input {
    padding: 1.2rem;
    font-size: 1.2rem;
  }

  .btn-ingresar {
    padding: 1.2rem 0;
    font-size: 1.2rem;
  }
}
</style>

<style>
/* Estilos globales para centrar el login en desktop */
body:has(.login-container) {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  min-height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

#app:has(.login-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  min-height: 100vh !important;
  box-sizing: border-box !important;
}

router-view:has(.login-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  min-height: 100vh !important;
  box-sizing: border-box !important;
}

/* Eliminar borde negro del AuthLayout en desktop */
@media (min-width: 1024px) {
  .auth-container:has(.login-container) {
    box-shadow: none !important;
    border: none !important;
    background: transparent !important;
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }
}
</style>
