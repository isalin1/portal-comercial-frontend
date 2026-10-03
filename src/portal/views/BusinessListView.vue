<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import RejectionNote from '../components/RejectionNote.vue'
import { apiError, http } from '../api'
import { dismissRejection } from '../publication'
import { usePortalAuth } from '../auth'
import type { Business, PointSale } from '../types'

const auth = usePortalAuth()
const businesses = ref<Business[]>([])
const error = ref('')

async function load() {
  const { data } = await http.get<Business[]>('/businesses')
  businesses.value = data
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

async function quitar(scope: string, recordId: number) {
  error.value = ''
  try {
    await dismissRejection(scope, recordId)
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
}

function tone(business: Business) {
  if (business.rejected) return 'bad'
  if (business.pendingApproval) return 'wait'
  return 'ok'
}

function label(business: Business) {
  if (business.rejected) return 'Rechazado'
  if (business.pendingApproval) return 'Pendiente'
  return 'Activo'
}

function addressLine(point: PointSale) {
  const address = point.address
  if (!address) return ''
  return [address.street, address.urbanZone, address.district?.name].filter(Boolean).join(', ')
}

function showsProfessionals(business: Business) {
  return /profesional/i.test(business.rubro?.name || '')
}

function agendaHint(business: Business) {
  const plan = business.user?.planCatalog
  if (plan && /anual/i.test(plan.name)) return 'El plan anual deja activos a varios profesionales, hasta el tope del administrador. Quien queda fuera del cupo está inactivo.'
  if (plan?.agenda) return 'El plan semestral deja activo a un profesional en la agenda. Los demás quedan inactivos.'
  return 'Este plan no activa la agenda. Los profesionales quedan inactivos.'
}

function activity(person: { agendaControl: boolean; isActive: boolean }) {
  return person.isActive && person.agendaControl ? 'Activo' : 'Inactivo'
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <p v-if="auth.userType === 'EMPRESARIO'" class="pill">Panel Empresario</p>
      <h2>Datos empresa y punto de venta</h2>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <template v-else-if="!businesses.length">
      <p class="empty">Todavía no hay un negocio. El primer paso es registrarlo.</p>
      <router-link v-if="auth.userType === 'EMPRESARIO'" class="add" :to="{ name: 'business-form' }">Registrar negocio</router-link>
    </template>
    <article v-for="business in businesses" :key="business.id" class="shop">
      <section class="sheet">
        <header>
          <div>
            <h3>Datos empresa</h3>
            <p>Información comercial principal</p>
          </div>
          <span :class="tone(business)">{{ label(business) }}</span>
        </header>
        <div class="block">
          <span>Nombre comercial y descripción</span>
          <strong>{{ business.commercialName }}</strong>
          <p v-if="business.commercialDescription">{{ business.commercialDescription }}</p>
        </div>
        <div class="pair">
          <div class="block">
            <span>Razón social</span>
            <strong>{{ business.legalName }}</strong>
          </div>
          <div class="block">
            <span>DNI / RUC</span>
            <strong>{{ business.numDoc }}</strong>
          </div>
        </div>
        <div class="block">
          <span>Rubro de negocio</span>
          <strong>{{ business.rubro?.name }}</strong>
        </div>
        <p v-if="business.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
        <RejectionNote :rejected="business.rejected" @dismiss="quitar('BUSINESS', business.id)" />
        <router-link class="edit" :to="{ name: 'business-edit', params: { id: business.id } }">Editar negocio</router-link>
      </section>
      <section v-for="point in business.pointSales || []" :key="point.id" class="sheet">
        <header>
          <div>
            <h3>Datos punto de venta</h3>
            <p>Sede y atención presencial</p>
          </div>
        </header>
        <div class="block row">
          <div>
            <span>Nombre de sede</span>
            <strong>{{ point.name }}</strong>
          </div>
          <b v-if="!point.pendingApproval && !point.rejected" class="ok-mark" aria-hidden="true">✓</b>
        </div>
        <div class="block">
          <span>Dirección física</span>
          <strong>{{ addressLine(point) || 'Sin dirección registrada' }}</strong>
        </div>
        <div class="block row">
          <div>
            <span>Contacto comercial</span>
            <strong>{{ point.phone }}</strong>
          </div>
          <a v-if="point.phone" class="call" :href="`tel:${point.phone}`" aria-label="Llamar">Llamar</a>
        </div>
        <div v-if="showsProfessionals(business)" class="block pros">
          <span>Profesionales</span>
          <p>{{ agendaHint(business) }}</p>
          <article v-for="person in business.professionals || []" :key="person.id">
            <div>
              <strong>{{ person.name }}</strong>
              <em>{{ person.phone || 'Sin celular' }}</em>
            </div>
            <b :class="activity(person) === 'Activo' ? 'on' : 'off'">{{ activity(person) }}</b>
          </article>
          <p v-if="!(business.professionals || []).length">Todavía no hay profesionales registrados.</p>
        </div>
        <p v-if="point.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
        <RejectionNote :rejected="point.rejected" @dismiss="quitar('POINT', point.id)" />
        <router-link class="edit" :to="{ name: 'point-edit', params: { id: point.id } }">Editar punto</router-link>
      </section>
      <p v-if="!(business.pointSales || []).length" class="empty">Este negocio aún no tiene punto de venta.</p>
      <router-link
        v-if="auth.userType === 'EMPRESARIO'"
        class="add"
        :to="{ name: 'point-form', query: { negocio: business.id } }"
      >
        + Registrar punto de venta
      </router-link>
    </article>
    <button v-if="auth.userType === 'EMPRESARIO' && businesses.length" class="other" type="button" disabled>
      Registrar otro negocio
    </button>
    <p v-for="business in businesses.filter((item) => item.zone)" :key="`zona-${business.id}`" class="zone">
      Zona {{ business.zone?.name }}<template v-if="business.zone?.district"> · {{ business.zone.district.name }}</template>
    </p>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 16px;
  text-align: center;
  font-family: var(--font-ui);
}

.pill {
  display: inline-flex;
  margin: 0 0 8px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--color-brand-soft);
  color: var(--color-brand);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.head h2 {
  margin: 0;
  font-size: 16px;
  line-height: 22px;
}

.shop {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.sheet {
  padding: 16px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.sheet > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8eefd;
}

.sheet h3 {
  margin: 0;
  font-size: 16px;
}

.sheet header p,
.block > span,
.zone {
  margin: 0;
  color: #5c5e65;
  font-size: 12px;
}

.sheet header span,
.ok-mark {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.sheet header span.ok,
.ok-mark {
  background: #e5ffeb;
  color: #006740;
}

.sheet header span.wait {
  background: #fff4d6;
  color: #8a5a00;
}

.sheet header span.bad {
  background: var(--color-brand-soft);
  color: var(--color-brand);
}

.block {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f0f3ff;
}

.block strong {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.block p {
  margin: 2px 0 0;
  color: #5c5e65;
  font-size: 12px;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.edit {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.call {
  flex: none;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-brand-soft);
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.add,
.other {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
}

.add {
  background: var(--color-brand);
  color: #fff;
}

.other {
  background: #dedfe8;
  color: #5c5e65;
}

.pros article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
}

.pros em {
  display: block;
  color: #5c5e65;
  font-size: 12px;
  font-style: normal;
}

.pros b {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.pros b.on {
  background: #e5ffeb;
  color: #006740;
}

.pros b.off {
  background: #e2e8f0;
  color: #475569;
}

.empty {
  margin: 0;
  color: #5c5e65;
  text-align: center;
}

.zone {
  text-align: center;
}
</style>
