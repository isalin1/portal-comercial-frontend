<template>
  <div class="user-create-rol-view">
    <button class="back-btn" @click="goToDashboard" aria-label="Volver al Dashboard">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="#ff7a2f" stroke-width="2" fill="none" />
      </svg>
    </button>
    <div class="logo-container">
      <div class="logo">LOGO</div>
    </div>
    <h2 class="title">Registrar Usuarios</h2>
    <div class="roles-container">
      <div class="role-option" @click="goToRegister">
        <!-- Placeholder para imagen de colaborador -->
        <img
          src="https://img.icons8.com/ios-filled/100/000000/user-male-circle.png"
          alt="Colaborador"
          class="role-img"
        />
        <div class="role-label">Colaborador</div>
      </div>
      <div class="role-option disabled">
        <!-- Placeholder para imagen de cliente -->
        <img
          src="https://img.icons8.com/ios-filled/100/000000/conference-call.png"
          alt="Cliente"
          class="role-img"
        />
        <div class="role-label">Cliente</div>
      </div>
    </div>
    <div class="footer-text">Encuentra todas las herramientas que requieres en un solo lugar</div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()

function goToRegister() {
  router.push({ name: 'UserCreateRegister' })
}

function goToDashboard() {
  router.push({ name: 'dashboard' })
}
</script>

<style scoped>
.user-create-rol-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  background: #fff;
  padding: 32px 16px 0 16px;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}
.back-btn svg {
  display: block;
}
.logo-container {
  margin-top: 16px;
  margin-bottom: 24px;
}
.logo {
  background: #000;
  color: #fff;
  font-weight: bold;
  font-size: 1.5rem;
  padding: 12px 32px;
  border-radius: 4px;
  text-align: center;
}
.title {
  margin-bottom: 32px;
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
}
.roles-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 32px;
  margin-bottom: 48px;
}
.role-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.role-option.disabled {
  opacity: 0.5;
  pointer-events: none;
  filter: grayscale(1);
}
.role-img {
  width: 80px;
  height: 80px;
  margin-bottom: 8px;
}
.role-label {
  font-size: 1rem;
  font-weight: 500;
  margin-top: 4px;
}
.footer-text {
  margin-top: auto;
  font-size: 1rem;
  color: #222;
  text-align: center;
  margin-bottom: 32px;
}
</style>
