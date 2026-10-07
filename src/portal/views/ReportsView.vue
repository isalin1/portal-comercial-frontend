<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

type DayPayment = {
  id: number
  firstName: string
  lastName: string
  days: number
  amount: string | number
  planName: string
}

const router = useRouter()
const todayCount = ref(0)
const error = ref('')

const syncedLabel = computed(() => {
  const now = new Date()
  const time = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now)
  return `Datos actualizados hoy, ${time}`
})

function limaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}

async function loadToday() {
  error.value = ''
  try {
    const { data } = await http.get<DayPayment[]>('/user/pagos', { params: { date: limaToday() } })
    todayCount.value = data.length
  } catch (err) {
    error.value = apiError(err)
  }
}

function openPlansDay() {
  router.push({ name: 'report-plans-day' })
}

function openWhatsappDay() {
  router.push({ name: 'report-whatsapp-day' })
}

onMounted(loadToday)
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Reportes y Métricas</h2>
      <p>Módulo de reportería y análisis comercial</p>
    </header>
    <p class="sync"><i aria-hidden="true" /> {{ syncedLabel }}</p>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="cards">
      <button class="card" type="button" @click="openPlansDay">
        <header>
          <span class="icon cal" aria-hidden="true" />
          <span class="chip">Disponible</span>
        </header>
        <h3>Planes Registrados x Día</h3>
        <p>Monitorea suscripciones diarias de comercios, activaciones de membresías e ingresos acumulados.</p>
        <footer>
          <span><b>+{{ todayCount }}</b> afiliaciones hoy</span>
          <span class="go">Consultar →</span>
        </footer>
      </button>

      <button class="card" type="button" @click="openWhatsappDay">
        <header>
          <span class="icon chat" aria-hidden="true" />
          <span class="chip">Disponible</span>
        </header>
        <h3>WhatsApp + Pedido x Día x Negocio</h3>
        <p>Métricas de conversión directa por comercio: interacciones vía chat, pedidos generados y tasas de respuesta.</p>
        <footer>
          <span class="soon">Por zona y día</span>
          <span class="go">Abrir métricas →</span>
        </footer>
      </button>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 12px;
  text-align: center;
}

.head h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
}

.sync {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  margin: 0 auto 16px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff;
  box-shadow: var(--shadow-soft);
  color: #5c5e65;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sync i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #008352;
  box-shadow: 0 0 0 4px rgba(0, 131, 82, 0.18);
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 0;
  border-left: 4px solid var(--color-brand);
  border-radius: var(--radius-card);
  padding: 16px;
  text-align: left;
  font: inherit;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  background: #fff;
  color: var(--color-ink);
}

.card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f0f3ff center / 24px no-repeat;
}

.icon.cal {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e21221' stroke-width='2'%3E%3Crect x='3' y='5' width='18' height='16' rx='2'/%3E%3Cpath d='M3 10h18M8 3v4M16 3v4'/%3E%3C/svg%3E");
}

.icon.chat {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e21221'%3E%3Cpath d='M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2z'/%3E%3C/svg%3E");
  background-size: 22px;
}

.chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #e8eefd;
  color: #5e3f3c;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

h3 {
  margin: 12px 0 0;
  font-size: 18px;
  line-height: 24px;
  font-weight: 800;
}

.card p {
  margin: 6px 0 0;
  color: #5c5e65;
  font-size: 12px;
  line-height: 16px;
}

.card footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 14px 0 0;
  font-size: 12px;
  font-weight: 700;
}

.card footer b {
  font-size: 16px;
}

.go {
  white-space: nowrap;
  color: var(--color-brand);
}

.soon {
  color: #5c5e65;
  font-weight: 600;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 16px;
  }

  .head h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .head p {
    max-width: 480px;
    margin: 10px auto 0;
    font-size: 15px;
    line-height: 22px;
  }

  .sync {
    margin-bottom: 24px;
    padding: 8px 16px;
    font-size: 11px;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: stretch;
  }

  .card {
    padding: 22px 24px;
    height: 100%;
  }

  .icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background-size: 28px;
  }

  .chip {
    padding: 5px 12px;
    font-size: 11px;
  }

  h3 {
    margin-top: 16px;
    font-size: 22px;
    line-height: 28px;
  }

  .card p {
    font-size: 14px;
    line-height: 20px;
  }

  .card footer {
    margin-top: auto;
    padding-top: 18px;
    font-size: 13px;
  }

  .card footer b {
    font-size: 18px;
  }
}
</style>
