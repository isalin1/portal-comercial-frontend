<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'

type OrderLine = { kind: string; name: string; quantityRequested: string }
type MyOrder = {
  id: number
  status: string
  statusLabel: string
  business?: { commercialName: string }
  createdAt: string
  total?: number
  lines?: OrderLine[]
}

const auth = usePortalAuth()
const route = useRoute()
const router = useRouter()
const orders = ref<MyOrder[]>([])
const error = ref('')
const day = ref(limaToday())
const history = ref(false)
const cancelledView = ref(route.query.anulados === '1')

watch(
  () => route.query.anulados,
  (value) => {
    cancelledView.value = value === '1'
  },
)

function openCancelled() {
  cancelledView.value = true
  history.value = false
  router.replace({ name: 'account', query: { anulados: '1' } })
}

function openActive() {
  cancelledView.value = false
  router.replace({ name: 'account' })
}

function limaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}

function limaDay(value: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(value))
}

function when(value: string) {
  return new Date(value).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function money(value?: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`
}

function linesOf(order: MyOrder) {
  return (order.lines || [])
    .map((line) => {
      const qty = line.kind === 'MENU' ? 1 : Number(line.quantityRequested)
      const shown = Number.isInteger(qty) ? String(qty) : qty.toFixed(2)
      return `${shown}x ${line.name}`
    })
    .join(', ')
}

const activeOrders = computed(() => orders.value.filter((order) => order.status !== 'ANULADO'))
const cancelledOrders = computed(() => orders.value.filter((order) => order.status === 'ANULADO'))

const visibleOrders = computed(() => {
  if (cancelledView.value) return cancelledOrders.value
  const source = activeOrders.value
  return history.value ? source : source.filter((order) => limaDay(order.createdAt) === day.value)
})
const latest = computed(() => activeOrders.value[0] || null)
const showLatest = computed(
  () =>
    !cancelledView.value &&
    !history.value &&
    latest.value &&
    !visibleOrders.value.some((order) => order.id === latest.value?.id),
)

onMounted(async () => {
  if (auth.userType !== 'CLIENTE' && auth.userType !== 'EMPRESARIO') return
  try {
    const { data } = await http.get<MyOrder[]>('/pedidos/mios')
    orders.value = data
  } catch (err) {
    error.value = apiError(err)
  }
})

function showToday() {
  history.value = false
  day.value = limaToday()
}

function logout() {
  auth.logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <ScreenFrame storefront bar fluid>
    <template v-if="auth.userType === 'CLIENTE' || auth.userType === 'EMPRESARIO'">
      <header class="panel-title">
        <h2>{{ auth.userType === 'EMPRESARIO' ? 'Mis Compras' : 'Panel de Administración' }}</h2>
        <p>{{ auth.userType === 'EMPRESARIO' ? 'Como comprador' : 'Cliente' }}</p>
      </header>
      <template v-if="auth.userType === 'CLIENTE'">
        <p class="lead">Mi cuenta personal y actividades</p>
        <nav class="tiles">
          <router-link :to="{ name: 'raffles' }">Mis Sorteos</router-link>
          <router-link :to="{ name: 'promos' }">Mis Promos</router-link>
          <router-link :to="{ name: 'profile' }">
            Mis Datos
            <small>Actualizar</small>
          </router-link>
        </nav>
      </template>
      <p v-else class="lead">Seguimiento de tus compras en la tienda</p>
      <section class="orders">
        <header>
          <h3>
            {{
              cancelledView
                ? auth.userType === 'EMPRESARIO'
                  ? 'Compras anuladas'
                  : 'Pedidos anulados'
                : auth.userType === 'EMPRESARIO'
                  ? 'Mis compras'
                  : 'Mis pedidos'
            }}
          </h3>
          <button v-if="cancelledView" type="button" @click="openActive">
            {{ auth.userType === 'EMPRESARIO' ? 'Ver compras activas' : 'Ver pedidos activos' }}
          </button>
          <button v-else type="button" @click="history = !history">{{ history ? 'Ver por fecha' : 'Ver historial' }}</button>
        </header>
        <button
          v-if="!cancelledView && cancelledOrders.length"
          class="cancelled-link"
          type="button"
          @click="openCancelled"
        >
          {{ auth.userType === 'EMPRESARIO' ? 'Compras anuladas' : 'Pedidos anulados' }} ({{ cancelledOrders.length }})
        </button>
        <label v-if="!history && !cancelledView" class="when">
          <span>Fecha</span>
          <input v-model="day" type="date" />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-else-if="cancelledView && !cancelledOrders.length" class="empty">
          <strong>{{ auth.userType === 'EMPRESARIO' ? 'No tienes compras anuladas.' : 'No tienes pedidos anulados.' }}</strong>
          <p>Cuando anules un pedido pendiente, aparecerá aquí.</p>
          <button type="button" @click="openActive">
            {{ auth.userType === 'EMPRESARIO' ? 'Volver a mis compras' : 'Volver a mis pedidos' }}
          </button>
        </div>
        <div v-else-if="!cancelledView && !activeOrders.length" class="empty">
          <strong>{{ auth.userType === 'EMPRESARIO' ? 'Todavía no tienes compras.' : 'Todavía no tienes pedidos.' }}</strong>
          <p>Cuando compres en un negocio, el pedido aparecerá aquí.</p>
        </div>
        <div v-else-if="!visibleOrders.length" class="empty">
          <strong>{{ auth.userType === 'EMPRESARIO' ? 'No hay compras en esta fecha.' : 'No hay pedidos en esta fecha.' }}</strong>
          <p>No se registraron entregas ni compras en la fecha seleccionada.</p>
          <button v-if="day !== limaToday()" type="button" @click="showToday">
            {{ auth.userType === 'EMPRESARIO' ? 'Consultar compras de hoy' : 'Consultar pedidos de hoy' }}
          </button>
        </div>
        <router-link v-for="order in visibleOrders" :key="order.id" class="ticket" :to="{ name: 'client-order', params: { id: order.id } }">
          <header>
            <strong>{{ order.business?.commercialName }}</strong>
            <span :class="order.status">{{ order.statusLabel }}</span>
          </header>
          <p v-if="linesOf(order)">{{ linesOf(order) }}</p>
          <footer>
            <span>{{ when(order.createdAt) }}</span>
            <b>{{ money(order.total) }}</b>
          </footer>
        </router-link>
        <div v-if="showLatest && latest" class="latest">
          <span>Última compra registrada</span>
          <router-link class="ticket" :to="{ name: 'client-order', params: { id: latest.id } }">
            <header>
              <strong>{{ latest.business?.commercialName }}</strong>
              <span :class="latest.status">{{ latest.statusLabel }}</span>
            </header>
            <p v-if="linesOf(latest)">{{ linesOf(latest) }}</p>
            <footer>
              <span>{{ when(latest.createdAt) }}</span>
              <b>{{ money(latest.total) }}</b>
            </footer>
          </router-link>
        </div>
      </section>
      <div class="actions">
        <router-link v-if="auth.userType === 'CLIENTE'" class="config" :to="{ name: 'profile' }">Configuración de cuenta</router-link>
        <router-link v-else class="config" :to="{ name: 'panel' }">Volver al panel</router-link>
        <button class="ghost" type="button" @click="logout">Cerrar sesión</button>
      </div>
    </template>
    <div v-else-if="auth.user" class="ticket">
      <header>
        <strong>{{ auth.user.firstName }} {{ auth.user.lastName }}</strong>
      </header>
      <p>{{ auth.user.email }}</p>
      <button class="ghost" type="button" @click="logout">Cerrar sesión</button>
    </div>
  </ScreenFrame>
</template>

<style scoped>
.panel-title {
  margin-bottom: 4px;
  text-align: center;
  font-family: var(--font-ui);
}

.panel-title h2 {
  margin: 0;
  font-size: 20px;
  line-height: 26px;
  font-weight: 700;
  letter-spacing: -0.015em;
  text-transform: uppercase;
}

.panel-title p {
  margin: 2px 0 0;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.lead {
  margin: 0 0 16px;
  text-align: center;
  color: #5c5e65;
  font-size: 14px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.tiles a {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 88px;
  padding: 12px 6px;
  border-radius: var(--radius-card);
  background: var(--color-brand);
  color: #fff;
  text-align: center;
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
  line-height: 16px;
}

.tiles small {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  font-weight: 600;
  opacity: 0.85;
}

.orders {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.orders > header,
.ticket header,
.ticket footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.orders > header h3 {
  margin: 0;
  font-size: 16px;
  letter-spacing: -0.01em;
  text-transform: uppercase;
}

.orders > header button,
.empty button,
.cancelled-link {
  border: 0;
  background: transparent;
  color: var(--color-brand);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.cancelled-link {
  align-self: flex-start;
  padding: 0;
  text-align: left;
}

.when {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.when span {
  color: #5c5e65;
  font-size: 12px;
  font-weight: 700;
}

.when input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
  font: inherit;
}

.empty,
.ticket {
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.empty {
  padding: 22px 16px;
  text-align: center;
}

.empty strong {
  display: block;
  font-size: 16px;
}

.empty p {
  margin: 6px 0 0;
  color: #5c5e65;
  font-size: 14px;
}

.empty button {
  margin-top: 12px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #e8eefd;
}

.ticket {
  display: block;
  padding: 14px;
  color: inherit;
  text-decoration: none;
}

.ticket strong {
  min-width: 0;
  font-size: 16px;
}

.ticket header span {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-brand-soft);
  color: var(--color-brand);
  font-size: 10px;
  font-weight: 700;
}

.ticket header span.ENTREGADO {
  background: #e5ffeb;
  color: #006740;
}

.ticket header span.ANULADO {
  background: #e2e8f0;
  color: #64748b;
}

.ticket p {
  margin: 6px 0 0;
  color: #5c5e65;
  font-size: 12px;
}

.ticket footer {
  margin-top: 8px;
  color: #5c5e65;
  font-size: 12px;
}

.ticket footer b {
  color: var(--color-ink);
  font-size: 14px;
}

.latest {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.latest > span {
  color: #5c5e65;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.actions {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
}

.config,
.ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  margin-top: 12px;
  border: 0;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.config {
  background: #e2e8f7;
  color: var(--color-ink);
}

.ghost {
  background: #dedfe8;
  color: #5c5e65;
}

@media (min-width: 1024px) {
  .panel-title {
    margin-bottom: 12px;
  }

  .panel-title h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .panel-title p {
    font-size: 13px;
  }

  .lead {
    max-width: 480px;
    margin: 0 auto 20px;
    font-size: 15px;
    line-height: 22px;
  }

  .tiles {
    max-width: 720px;
    margin: 0 auto 24px;
    gap: 14px;
  }

  .tiles a {
    min-height: 104px;
    font-size: 15px;
    line-height: 18px;
  }

  .tiles small {
    font-size: 12px;
  }

  .orders {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
  }

  .orders > header,
  .orders > .cancelled-link,
  .orders > .when,
  .orders > .error,
  .orders > .empty,
  .orders > .latest {
    grid-column: 1 / -1;
  }

  .orders > header h3 {
    font-size: 18px;
  }

  .orders > header button,
  .cancelled-link,
  .empty button {
    font-size: 13px;
  }

  .when {
    max-width: 320px;
  }

  .empty {
    max-width: 560px;
    margin: 0 auto;
    padding: 28px 24px;
  }

  .empty strong {
    font-size: 18px;
  }

  .ticket {
    padding: 18px 20px;
    height: 100%;
  }

  .ticket strong {
    font-size: 17px;
  }

  .ticket p,
  .ticket footer {
    font-size: 13px;
  }

  .ticket footer b {
    font-size: 15px;
  }

  .latest > span {
    font-size: 11px;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    max-width: 560px;
    margin: 20px auto 0;
  }

  .actions .config,
  .actions .ghost {
    margin-top: 0;
  }
}
</style>
