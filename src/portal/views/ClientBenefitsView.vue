<script setup lang="ts">
import ScreenFrame from '../components/ScreenFrame.vue'

const benefits = ['Sorteos mensuales', 'Promociones y ofertas', 'Beneficios especiales', 'Descuentos exclusivos']
</script>

<template>
  <ScreenFrame storefront back fluid>
    <div class="client-benefits">
      <p class="pill">Cliente</p>
      <h2>Todo lo que necesitas en un solo lugar... a un <span>click</span> de distancia</h2>
      <p class="lead">Beneficios exclusivos para afiliados</p>
      <div class="grid">
        <article v-for="benefit in benefits" :key="benefit">
          <h3>{{ benefit }}</h3>
          <span>OK</span>
        </article>
      </div>
      <p class="free">Afiliación 100 % gratuita</p>
      <router-link class="btn go" :to="{ name: 'register', params: { tipo: 'cliente' } }">Registrarme</router-link>
      <p class="login-link">
        ¿Ya tienes cuenta?
        <router-link :to="{ name: 'login', query: { tipo: 'cliente' } }">Iniciar sesión</router-link>
      </p>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.client-benefits {
  text-align: center;
  font-family: var(--font-ui);
}

.pill {
  display: inline-flex;
  margin: 4px 0 10px;
  padding: 4px 12px;
  border-radius: 999px;
  background: #ffdad6;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

h2 {
  margin: 0 auto;
  max-width: 320px;
  font-size: 20px;
  line-height: 26px;
  font-weight: 700;
  letter-spacing: -0.015em;
}

h2 span {
  color: var(--color-brand);
}

.lead {
  margin: 8px 0 0;
  color: #5c5e65;
  font-size: 14px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 18px 0;
}

article {
  background: #fff;
  border-radius: var(--radius-control);
  padding: 14px 10px;
  box-shadow: 0 2px 10px -2px rgba(22, 28, 39, 0.06);
}

h3 {
  margin: 0;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 22px;
  font-weight: 700;
}

article span {
  display: inline-flex;
  margin-top: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(226, 18, 33, 0.1);
  color: var(--color-brand);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.free {
  margin: 4px 0 14px;
  font-size: 16px;
  font-weight: 700;
}

.btn.go {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 16px -2px rgba(226, 18, 33, 0.35);
}

.login-link {
  margin: 14px 0 0;
  color: #5c5e65;
  font-size: 12px;
  font-weight: 600;
}

.login-link a {
  color: var(--color-brand);
  font-weight: 700;
  text-decoration: none;
}

@media (min-width: 1024px) {
  .client-benefits {
    max-width: 720px;
    margin: 0 auto;
  }

  .pill {
    margin: 8px 0 14px;
    padding: 6px 14px;
    font-size: 13px;
  }

  h2 {
    max-width: 560px;
    font-size: 32px;
    line-height: 1.2;
  }

  .lead {
    margin-top: 12px;
    font-size: 16px;
  }

  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin: 28px 0 24px;
  }

  article {
    padding: 22px 14px;
  }

  h3 {
    min-height: 52px;
    font-size: 17px;
    line-height: 22px;
  }

  article span {
    margin-top: 10px;
    padding: 4px 12px;
    font-size: 11px;
  }

  .free {
    margin: 8px 0 18px;
    font-size: 18px;
  }

  .btn.go {
    max-width: 320px;
    margin: 0 auto;
    height: 52px;
    font-size: 16px;
  }

  .login-link {
    margin-top: 18px;
    font-size: 14px;
  }
}
</style>
