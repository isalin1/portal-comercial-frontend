<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { Business } from '../types'
import { whatsappChatUrl, openWhatsAppChat } from '../whatsapp'

type ShopClient = {
  id: number
  name: string
  phone: string
  address: string | null
  purchaseDays: number
  lastPurchase: string | null
}

const businesses = ref<Business[]>([])
const businessId = ref(0)
const clients = ref<ShopClient[]>([])
const name = ref('')
const phone = ref('')
const address = ref('')
const error = ref('')
const message = ref('')
const saving = ref(false)
const filtering = ref(false)
const query = ref('')

const visible = computed(() => {
  const text = query.value.trim().toLowerCase()
  if (!text) return clients.value
  return clients.value.filter((client) => client.name.toLowerCase().includes(text) || client.phone.includes(text))
})

function limaDay(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(value)
}

function lastLabel(value: string | null) {
  if (!value) return 'Sin compras'
  const date = new Date(value)
  if (limaDay(date) === limaDay(new Date())) {
    const time = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit' }).format(date)
    return `Hoy, ${time}`
  }
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'numeric', year: 'numeric' }).format(date)
}

function initial(value: string) {
  return value.trim().charAt(0).toLocaleUpperCase('es-PE') || '?'
}

function whatsapp(value: string) {
  return whatsappChatUrl(value)
}

function toggleFilter() {
  filtering.value = !filtering.value
  if (!filtering.value) query.value = ''
}

async function loadBusinesses() {
  const { data } = await http.get<Business[]>('/businesses')
  businesses.value = data.filter((business) => !/profesional/i.test(business.rubro?.name || ''))
  if (!businessId.value && businesses.value[0]) businessId.value = businesses.value[0].id
}

async function loadClients() {
  if (!businessId.value) return
  const { data } = await http.get<ShopClient[]>('/pedidos/clientes', { params: { businessId: businessId.value } })
  clients.value = data
}

async function save() {
  error.value = ''
  message.value = ''
  saving.value = true
  try {
    await http.post('/pedidos/clientes', { businessId: businessId.value, name: name.value, phone: phone.value, address: address.value })
    name.value = ''
    phone.value = ''
    address.value = ''
    message.value = 'Cliente registrado'
    await loadClients()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await loadBusinesses()
    await loadClients()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch(businessId, async () => {
  try {
    await loadClients()
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Clientes</h2>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>

    <label class="line pick">
      <span>Negocio</span>
      <select v-model.number="businessId">
        <option v-for="business in businesses" :key="business.id" :value="business.id">{{ business.commercialName }}</option>
      </select>
    </label>

    <form class="sheet" @submit.prevent="save">
      <header>
        <h3>Registrar cliente</h3>
        <span>Nuevo</span>
      </header>
      <div class="pair">
        <label class="line">
          <span>Nombre</span>
          <input v-model="name" placeholder="Ej. Carlos Mendoza" required />
        </label>
        <label class="line">
          <span>Celular</span>
          <input v-model="phone" type="tel" placeholder="Ej. 999888777" required />
        </label>
      </div>
      <label class="line">
        <span class="split">Dirección <em>(opcional)</em></span>
        <input v-model="address" placeholder="Calle, número, urbanización o referencia" />
      </label>
      <button class="save" type="submit" :disabled="saving || !businessId">
        {{ saving ? 'Guardando…' : 'Registrar cliente' }}
      </button>
    </form>

    <header class="band">
      <div>
        <h3>Clientes registrados</h3>
        <span>{{ visible.length }} cliente{{ visible.length === 1 ? '' : 's' }}</span>
      </div>
      <button type="button" :class="{ on: filtering }" @click="toggleFilter">Filtrar</button>
    </header>
    <label v-if="filtering" class="line find">
      <span>Buscar</span>
      <input v-model="query" placeholder="Nombre o celular" />
    </label>
    <p v-if="!clients.length" class="hint">Todavía no hay clientes en este negocio.</p>
    <p v-else-if="!visible.length" class="hint">No hay clientes para este filtro.</p>
    <section v-else class="list">
      <article v-for="client in visible" :key="client.id" class="person">
        <header>
          <span class="mark">{{ initial(client.name) }}</span>
          <div>
            <strong>{{ client.name }}</strong>
            <small>{{ client.phone }}</small>
          </div>
          <a class="call" :href="`tel:${client.phone}`" aria-label="Llamar">Llamar</a>
          <a v-if="whatsapp(client.phone)" class="chat" :href="whatsapp(client.phone)" aria-label="WhatsApp" @click.prevent="openWhatsAppChat(client.phone)">WhatsApp</a>
        </header>
        <div class="facts">
          <p :class="{ empty: !client.address }">{{ client.address || 'Sin dirección' }}</p>
          <dl>
            <div>
              <dt>Días con compra</dt>
              <dd>{{ client.purchaseDays }}</dd>
            </div>
            <div>
              <dt>Última compra</dt>
              <dd>{{ lastLabel(client.lastPurchase) }}</dd>
            </div>
          </dl>
        </div>
      </article>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 14px;
  text-align: center;
  font-family: var(--font-ui);
}

.head h2 {
  margin: 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.line,
.sheet,
.person {
  margin-bottom: 12px;
}

.line {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.line > span,
.band h3,
.sheet h3 {
  color: #5c5e65;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.line input,
.line select {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-control);
  background: #fff;
  color: var(--color-ink);
  font: inherit;
  font-weight: 600;
}

.line input::placeholder {
  color: #94a3b8;
  font-weight: 500;
}

.split {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.split em {
  color: #94a3b8;
  font-style: normal;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.sheet,
.person {
  padding: 14px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.sheet header,
.band,
.person header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sheet header {
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-line);
}

.sheet h3,
.band h3 {
  margin: 0;
  color: var(--color-ink);
}

.sheet header span,
.band > div > span {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-brand-soft);
  color: var(--color-brand);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.band > div > span {
  background: #e2e8f0;
  color: #334155;
  letter-spacing: 0;
  text-transform: none;
}

.save {
  width: 100%;
  min-height: 48px;
  margin-top: 4px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.save:disabled {
  opacity: 0.55;
}

.band {
  justify-content: space-between;
  margin-bottom: 10px;
}

.band > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.band button {
  border: 0;
  background: transparent;
  color: var(--color-brand);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.band button.on {
  text-decoration: underline;
}

.hint {
  margin: 0 0 12px;
  color: #5c5e65;
  font-size: 13px;
}

.person header {
  align-items: flex-start;
  margin-bottom: 10px;
}

.mark {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f1f5f9;
  font-weight: 800;
}

.person header div {
  flex: 1;
  min-width: 0;
}

.person strong,
.person small {
  display: block;
}

.person strong {
  font-size: 15px;
  text-transform: capitalize;
}

.person small,
.facts p {
  color: #475569;
  font-size: 12px;
}

.facts {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
}

.facts p {
  margin: 0 0 8px;
}

.facts p.empty {
  color: #94a3b8;
  font-style: italic;
}

.facts dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid var(--color-line);
}

.facts dt {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.facts dd {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 800;
}

.call,
.chat {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border-radius: 999px;
  font-size: 0;
  text-decoration: none;
}

.call {
  background: #f1f5f9;
}

.chat {
  background: #059669;
}

.call::before,
.chat::before {
  font-size: 11px;
  font-weight: 800;
}

.call::before {
  content: '☎';
  color: #334155;
}

.chat::before {
  content: 'W';
  color: #fff;
}

.pair {
  display: flex;
  flex-direction: column;
}

.list {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 20px;
  }

  .head h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .pick {
    max-width: 420px;
    margin-bottom: 16px;
  }

  .sheet {
    max-width: 720px;
    padding: 20px 22px;
    margin-bottom: 20px;
  }

  .sheet header {
    margin-bottom: 16px;
  }

  .sheet h3 {
    font-size: 14px;
  }

  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .pair .line {
    margin-bottom: 12px;
  }

  .save {
    max-width: 280px;
  }

  .band {
    margin-bottom: 14px;
  }

  .band h3 {
    font-size: 14px;
  }

  .find {
    max-width: 420px;
    margin-bottom: 14px;
  }

  .hint {
    font-size: 14px;
  }

  .list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .person {
    margin-bottom: 0;
    padding: 18px 20px;
    height: 100%;
  }

  .person strong {
    font-size: 16px;
  }

  .person small,
  .facts p {
    font-size: 13px;
  }

  .facts dd {
    font-size: 14px;
  }
}
</style>
