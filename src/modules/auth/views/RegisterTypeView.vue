<template>
  <div class="register-type-container">
    <div class="logo-box">LOGO</div>
    <h2>Regístrate</h2>
    <div class="user-type-options">
      <div class="user-type" @click="selectType('empresario')">
        <img
          src="https://cdn.pixabay.com/photo/2017/01/31/13/14/avatar-2026510_1280.png"
          alt="Empresario"
        />
        <span>Empresario</span>
      </div>
      <div class="user-type" @click="selectType('cliente')">
        <img
          src="https://cdn.pixabay.com/photo/2016/04/01/09/29/avatar-1300331_1280.png"
          alt="Cliente"
        />
        <span>Cliente</span>
      </div>
    </div>
    <p class="description">Encuentra todas las herramientas que requieres en un solo lugar</p>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()

function selectType(type: 'empresario' | 'cliente') {
  const roleMap = {
    'empresario': 'ADMIN',    // Cambiar 'admin' por 'empresario'
    'cliente': 'CLIENT'       // Cambiar 'client' por 'cliente'
  }

  console.log('Tipo seleccionado:', type)
  console.log('Rol mapeado:', roleMap[type])

  router.push({
    name: 'register-form',
    query: { role: roleMap[type] } })
}
</script>

<style scoped>
.register-type-container {
  border-radius: 0.5rem;
  padding: 2rem 1rem 1.5rem 1rem;
  max-width: 350px;
  margin: 2rem auto;
  min-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
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
.user-type-options {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}
.user-type {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s;
}
.user-type:hover {
  transform: scale(1.05);
}
.user-type img {
  width: 70px;
  height: 70px;
  object-fit: contain;
  margin-bottom: 0.5rem;
}
.user-type span {
  font-size: 1rem;
  font-weight: 500;
}
.description {
  margin-top: 2.5rem;
  color: #222;
  font-size: 1rem;
  text-align: center;
  line-height: 1.3;
}
</style>
