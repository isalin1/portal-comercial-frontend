<template>
  <div class="client-details-container">
    <header class="client-details-header">
      <button class="back-button" @click="goBack" title="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Detalles del Cliente</h1>
    </header>

    <div class="content">
      <p>Vista de detalles del cliente - En desarrollo</p>
      <p>ID del cliente: {{ $route.params.id }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.push({ name: 'client-list' })
}
</script>

<style scoped>
.client-details-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
}

.client-details-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.back-button {
  background: none;
  border: none;
  padding: 8px;
  margin-right: 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #f0f0f0;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.content {
  background-color: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
