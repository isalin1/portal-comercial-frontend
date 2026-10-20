<script setup lang="ts">
import ScreenFrame from '../components/ScreenFrame.vue'

const benefits = [
  {
    text: 'Encuentra rápidamente el negocio que buscas',
    tag: 'Búsqueda veloz',
    icon: 'search',
  },
  {
    text: 'Comunícate directamente con el negocio',
    tag: 'Sin intermediarios',
    icon: 'chat',
  },
  {
    text: 'Consulta horarios de atención y servicio de delivery',
    tag: 'Información real',
    icon: 'clock',
  },
  {
    text: '¡No llenes tu agenda de contactos... todos están aquí!',
    tag: 'Todo en un lugar',
    icon: 'people',
  },
]
</script>

<template>
  <ScreenFrame storefront back fluid bar>
    <div class="client-benefits">
      <p class="pill">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.2 14.4 8l5.3.8-3.8 3.7.9 5.3L12 15.8 7.2 17.8l.9-5.3L4.3 8.8 9.6 8 12 3.2Z" />
        </svg>
        Cliente
      </p>
      <h2>
        Todo lo que necesitas en un solo lugar... a un
        <span class="click">click</span>
        de distancia
      </h2>

      <div class="callout">
        <span class="line" aria-hidden="true" />
        <p><span class="dot" aria-hidden="true" />Beneficios exclusivos para afiliados<span class="dot" aria-hidden="true" /></p>
        <span class="line" aria-hidden="true" />
      </div>

      <div class="grid">
        <article v-for="benefit in benefits" :key="benefit.tag">
          <span class="mark" aria-hidden="true">
            <svg v-if="benefit.icon === 'search'" viewBox="0 0 24 24">
              <circle cx="10.5" cy="10.5" r="5.5" />
              <path d="M15 15.2 19 19" />
            </svg>
            <svg v-else-if="benefit.icon === 'chat'" viewBox="0 0 24 24">
              <path d="M6 7.5h12v8H9.2L6 18.2V7.5Z" />
            </svg>
            <svg v-else-if="benefit.icon === 'clock'" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="7" />
              <path d="M12 8.5V12l2.4 1.6" />
            </svg>
            <svg v-else viewBox="0 0 24 24">
              <circle cx="9" cy="9" r="2.2" />
              <circle cx="16" cy="9.5" r="1.8" />
              <path d="M4.8 17.2c.6-2.2 2.3-3.3 4.2-3.3s3.6 1.1 4.2 3.3" />
              <path d="M13.2 14.2c.8-.5 1.7-.7 2.6-.6 1.4.2 2.5 1.2 3 2.8" />
            </svg>
          </span>
          <p>{{ benefit.text }}</p>
          <span class="tag">{{ benefit.tag }}</span>
        </article>
      </div>

      <section class="join">
        <p class="free">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <path d="m8.6 12.2 2.2 2.2 4.6-4.8" />
          </svg>
          Afiliación 100 % gratuita
        </p>
        <router-link class="btn go" :to="{ name: 'register', params: { tipo: 'cliente' } }">
          Registrarme
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10" cy="8.5" r="2.6" />
            <path d="M5.5 17.2c.5-2.4 2.2-3.6 4.5-3.6s4 1.2 4.5 3.6" />
            <path d="M16.2 8.2h4M18.2 6.2v4" />
          </svg>
        </router-link>
        <p class="login-link">
          ¿Ya tienes cuenta?
          <router-link :to="{ name: 'login', query: { tipo: 'cliente' } }">Iniciar sesión</router-link>
        </p>
      </section>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.client-benefits {
  text-align: center;
  font-family: var(--font-ui);
  color: var(--color-ink);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-brand);
  flex: 0 0 auto;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  padding: 5px 14px;
  border-radius: 999px;
  background: #ffdad6;
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pill svg,
.free svg,
.btn.go svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.pill svg {
  fill: var(--color-brand);
}

h2 {
  margin: 0 auto;
  max-width: 320px;
  font-size: 20px;
  line-height: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.click {
  position: relative;
  display: inline-block;
  color: var(--color-brand);
  font-weight: 800;
}

.click::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 3px;
  border-radius: 999px;
  background: rgba(226, 18, 33, 0.35);
}

.callout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 10px 0;
}

.callout p {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 3px 8px;
  border-radius: 999px;
  background: #f0f3ff;
  font-size: 11px;
  font-weight: 700;
  line-height: 14px;
}

.line {
  width: 28px;
  height: 2px;
  border-radius: 999px;
  background: #ffb4ac;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

article {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: 8px 6px 6px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px -2px rgba(22, 28, 39, 0.06);
}

.mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-bottom: 4px;
  border-radius: 999px;
  background: rgba(255, 218, 214, 0.7);
  color: var(--color-brand);
}

.mark svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

article p {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 15px;
}

.tag {
  display: block;
  width: 100%;
  padding: 2px 4px;
  border-radius: 999px;
  background: rgba(255, 218, 214, 0.55);
  color: #93000e;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 11px;
  text-transform: uppercase;
}

.join {
  margin-top: 10px;
  padding: 10px 10px 8px;
  border-radius: 12px;
  background: #f0f3ff;
}

.free {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0 0 8px;
  color: #006740;
  font-size: 14px;
  font-weight: 700;
  line-height: 18px;
}

.free svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.btn.go {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 48px;
  border-radius: 999px;
  background: var(--color-brand);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 16px -2px rgba(226, 18, 33, 0.35);
}

.btn.go svg {
  fill: none;
  stroke: #fff;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.login-link {
  margin: 6px 0 0;
  color: #5c5e65;
  font-size: 11px;
  font-weight: 600;
}

.login-link a {
  color: var(--color-brand);
  font-weight: 700;
  text-decoration: none;
}

@media (min-width: 1024px) {
  .client-benefits {
    max-width: 760px;
    margin: 12px auto 0;
  }

  .pill {
    font-size: 14px;
    padding: 6px 16px;
  }

  h2 {
    max-width: 560px;
    font-size: 22px;
    line-height: 26px;
  }

  .callout p {
    font-size: 13px;
  }

  .line {
    width: 48px;
  }

  article p {
    font-size: 13px;
    line-height: 16px;
  }

  .tag {
    font-size: 10px;
  }

  .free {
    font-size: 15px;
  }

  .btn.go {
    max-width: 360px;
    margin: 0 auto;
    height: 48px;
  }

  .login-link {
    font-size: 13px;
  }
}
</style>
