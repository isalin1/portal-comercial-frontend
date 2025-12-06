<template>
  <div class="auth-container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// Puedes agregar lógica aquí si lo necesitas
</script>

<style scoped>
.auth-container {
  background: #fff;
  border-radius: 0.5rem;
  padding: 2rem 1rem 1.5rem 1rem;
  max-width: 350px;
  margin: 1rem auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 0 0 4px #222;
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

.description {
  color: #222;
  font-size: 1rem;
  text-align: center;
  margin-bottom: 2rem;
  margin-top: 0;
}

.illustration {
  width: 120px;
  height: 140px;
  object-fit: contain;
  margin-bottom: 2.5rem;
}

.btn {
  width: 100%;
  padding: 0.8rem 0;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn.primary {
  background: #ff7a2f;
  color: #fff;
}

.btn.primary:hover {
  background: #ff944d;
}

.btn.secondary {
  background: #ffe5d1;
  color: #fff;
  cursor: not-allowed;
}
</style>
