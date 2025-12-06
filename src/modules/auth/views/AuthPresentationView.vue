<template>
  <div class="auth-container">
    <div class="logo-box">LAVANDERIAS</div>
    <p class="description">
      1. Las herramientas de gestión que<br />
      necesitas para brindar un<br />
      excelente servicio a tus clientes
    </p>
    <img
      class="illustration"
      src="https://cdn.pixabay.com/photo/2017/01/31/13/14/avatar-2026510_1280.png"
      alt="Ilustración"
    />
    <router-link :to="{ name: 'login' }" class="btn primary">Iniciar sesión</router-link>
    <router-link :to="{ name: 'register-type' }" class="btn primary">Registrate</router-link>
    <router-link
      :to="{ name: 'ForgotPassword' }"
      class="btn"
      style="color: #ff7a2f; background: transparent; border: 1px solid #ff7a2f"
      >Olvidé mi contraseña / Cambiar mi contraseña</router-link
    >
  </div>
</template>

<script setup lang="ts">
// No necesitas nada aquí si usas <router-link>
</script>

<style scoped>
.auth-container {
  background: #fff;
  border-radius: 0.5rem;
  padding: 1.5rem 1rem;
  max-width: 350px;
  width: 100%;
  margin: 1rem auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 0 0 4px #222;
  box-sizing: border-box;
}

.logo-box {
  background: #000;
  color: #fff;
  font-weight: 500;
  font-size: 1.1rem;
  padding: 0.4rem 2rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  text-align: center;
}

.description {
  color: #222;
  font-size: 0.95rem;
  text-align: center;
  margin-bottom: 1rem;
  margin-top: 0;
  line-height: 1.4;
}

.illustration {
  width: 100px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 1.5rem;
}

.btn {
  width: 100%;
  padding: 0.7rem 0;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
  text-align: center;
  display: block;
  text-decoration: none;
}

.btn.primary {
  background: #ff7a2f;
  color: #fff;
}

.btn.primary:hover {
  background: #ff944d;
}

/* Tablet */
@media (min-width: 768px) {
  .auth-container {
    max-width: 500px;
    padding: 2rem 2rem;
    margin: 1.5rem auto;
  }

  .logo-box {
    font-size: 1.2rem;
    padding: 0.5rem 2.5rem;
    margin-bottom: 1.25rem;
  }

  .description {
    font-size: 1rem;
    margin-bottom: 1.25rem;
  }

  .illustration {
    width: 120px;
    height: 140px;
    margin-bottom: 1.75rem;
  }

  .btn {
    font-size: 1rem;
    padding: 0.8rem 0;
    margin-bottom: 0.75rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .auth-container {
    max-width: 600px;
    padding: 2.5rem 3rem;
    margin: 2rem auto;
  }

  .logo-box {
    font-size: 1.3rem;
    padding: 0.6rem 3rem;
    margin-bottom: 1.5rem;
  }

  .description {
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
  }

  .illustration {
    width: 140px;
    height: 160px;
    margin-bottom: 2rem;
  }

  .btn {
    font-size: 1.05rem;
    padding: 0.9rem 0;
    max-width: 400px;
    margin-bottom: 0.75rem;
  }
}

/* Large Desktop */
@media (min-width: 1280px) {
  .auth-container {
    max-width: 650px;
    padding: 3rem 3.5rem;
    margin: 2rem auto;
  }

  .logo-box {
    font-size: 1.4rem;
    padding: 0.7rem 3.5rem;
    margin-bottom: 1.5rem;
  }

  .description {
    font-size: 1.15rem;
    margin-bottom: 1.5rem;
  }

  .illustration {
    width: 160px;
    height: 180px;
    margin-bottom: 2rem;
  }

  .btn {
    font-size: 1.1rem;
    padding: 0.95rem 0;
    max-width: 420px;
    margin-bottom: 0.75rem;
  }
}

/* Extra Large Desktop */
@media (min-width: 1600px) {
  .auth-container {
    max-width: 700px;
    padding: 3rem 4rem;
    margin: 2rem auto;
  }

  .logo-box {
    font-size: 1.5rem;
    padding: 0.75rem 4rem;
    margin-bottom: 1.5rem;
  }

  .description {
    font-size: 1.2rem;
    margin-bottom: 1.5rem;
  }

  .illustration {
    width: 180px;
    height: 200px;
    margin-bottom: 2rem;
  }

  .btn {
    font-size: 1.15rem;
    padding: 1rem 0;
    max-width: 450px;
    margin-bottom: 0.75rem;
  }
}
</style>

<style>
/* Override global body styles for full width on desktop */
body:has(.auth-container) {
  display: block !important;
  place-items: unset !important;
  align-items: unset !important;
  justify-content: unset !important;
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

#app:has(.auth-container) {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  box-sizing: border-box !important;
}

router-view:has(.auth-container) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  box-sizing: border-box !important;
}

@media (min-width: 768px) {
  body:has(.auth-container) {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
  }
}
</style>
