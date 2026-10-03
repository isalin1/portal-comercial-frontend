<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { http } from '../api'

const phone = ref('940485657')
const maxProfessionals = ref(3)
type PlanCard = { id: number; name: string; days: number; commercialName: string; price: number | string }
const plans = ref<PlanCard[]>([])

function planRank(plan: PlanCard) {
  if (plan.commercialName === 'Corporativo') return 1
  if (plan.commercialName === 'Empresario') return 2
  if (plan.name === 'Trimestral') return 3
  if (plan.name === 'Mensual') return 4
  if (plan.commercialName === 'Free') return 5
  return 6
}

const orderedPlans = computed(() => [...plans.value].sort((a, b) => planRank(a) - planRank(b)))

function money(value: number | string) {
  return `S/. ${Number(value).toFixed(1)}`
}

function period(plan: PlanCard) {
  const name = plan.name.toLowerCase()
  if (plan.commercialName === 'Free' || name.includes('libre')) return 'libre'
  if (name.includes('anual') && !name.includes('semestral')) return 'anual'
  if (name.includes('semestral')) return 'semestral'
  if (name.includes('trimestral')) return 'trimestral'
  return 'mes'
}

function eyebrow(plan: PlanCard) {
  if (plan.commercialName === 'Corporativo') return 'Recomendado'
  if (plan.commercialName === 'Free') return 'Sin costo'
  return plan.name
}

function features(plan: PlanCard) {
  if (plan.commercialName === 'Free') return []
  if (plan.commercialName === 'Emprendedor') {
    return ['Publica tu oferta de productos o servicios', 'Botón de WhatsApp para comunicación directa con tu cliente']
  }
  if (plan.commercialName === 'Empresario') {
    return ['Incluye lo del plan Emprendedor', 'Pedidos registrados por el empresario', 'Agenda para 1 profesional']
  }
  return ['Incluye lo del plan Empresario', 'Pedidos registrados por el cliente', 'Resumen del día', `Agenda para hasta ${maxProfessionals.value} profesionales`]
}

function perDay(plan: PlanCard) {
  const name = plan.name.toLowerCase()
  const months = name.includes('anual') && !name.includes('semestral')
    ? 12
    : name.includes('semestral')
      ? 6
      : name.includes('trimestral')
        ? 3
        : 1
  const value = Math.floor((Number(plan.price) / months / 30) * 100) / 100
  return `S/. ${value.toFixed(2)} x día`
}
function digits() {
  let value = phone.value.replace(/\D/g, '')
  if (value.startsWith('00')) value = value.slice(2)
  if (value.length === 9) value = `51${value}`
  return value
}

function whatsapp(text: string) {
  return `whatsapp://send?phone=${digits()}&text=${encodeURIComponent(text)}`
}

onMounted(async () => {
  try {
    const [settings, planRes] = await Promise.all([
      http.get<{ salesWhatsapp: string; maxAgendaProfessionals?: number }>('/settings'),
      http.get<PlanCard[]>('/plans'),
    ])
    if (settings.data.salesWhatsapp) phone.value = settings.data.salesWhatsapp
    if (settings.data.maxAgendaProfessionals) maxProfessionals.value = settings.data.maxAgendaProfessionals
    plans.value = planRes.data
  } catch {
    // Se usa el número inicial.
  }
})
</script>

<template>
  <ScreenFrame storefront back>
    <section class="plans-hero">
      <p class="pill">Empresario</p>
      <h2>Tus clientes te encontrarán las 24 horas del día, todos los días del año</h2>
      <p>Potencia tus ventas locales y digitaliza la atención de tu negocio con máxima visibilidad en el directorio.</p>
      <a href="#planes">Elige un plan</a>
    </section>
    <div id="planes" class="plan-stack">
      <article v-for="plan in orderedPlans" :key="plan.id" class="offer" :class="{ featured: plan.commercialName === 'Corporativo' }">
        <p class="eyebrow">{{ eyebrow(plan) }}</p>
        <h3>{{ plan.commercialName }}</h3>
        <p class="amount">{{ money(plan.price) }} <span>/ {{ period(plan) }}</span></p>
        <p class="daily" :class="{ free: plan.commercialName === 'Free' }">{{ perDay(plan) }}</p>
        <p v-if="plan.commercialName === 'Free'" class="note">Registra tu negocio y los clientes podrán ubicarte</p>
        <ul v-else>
          <li v-for="item in features(plan)" :key="item">{{ item }}</li>
        </ul>
        <router-link
          v-if="plan.commercialName === 'Free'"
          class="btn choose free"
          :to="{ name: 'register', params: { tipo: 'empresario' }, query: { plan: 'free' } }"
        >
          Registrarme
        </router-link>
        <router-link
          v-else
          class="btn choose"
          :to="{ name: 'register', params: { tipo: 'empresario' }, query: { compra: '1', afiliacion: `${plan.commercialName} ${plan.name}` } }"
        >
          Comprar
        </router-link>
      </article>
    </div>
    <section class="advisor">
      <a class="btn meet" :href="whatsapp('Deseo agendar una reunion gratuita')">Agenda reunión gratuita</a>
      <p>Comunícate de inmediato con nosotros y tu negocio empezará a vender más</p>
      <a class="btn choose" :href="whatsapp('Hola, quiero información de los planes.')">WhatsApp: {{ phone }}</a>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.plans-hero {
  text-align: center;
  font-family: var(--font-ui);
}

.pill {
  display: inline-flex;
  margin: 0 0 10px;
  padding: 4px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.plans-hero h2 {
  margin: 0 auto 10px;
  max-width: 320px;
  color: var(--color-brand);
  font-size: 22px;
  line-height: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.plans-hero p {
  margin: 0 auto 14px;
  max-width: 320px;
  color: #5c5e65;
  font-size: 14px;
  line-height: 20px;
}

.plans-hero a {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--color-brand);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}

.plan-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 22px;
}

.offer {
  position: relative;
  background: #fff;
  border-radius: var(--radius-card);
  padding: 18px 16px 16px;
  box-shadow: 0 8px 24px -12px rgba(22, 28, 39, 0.35);
  text-align: left;
}

.offer.featured {
  padding-top: 22px;
}

.offer.featured::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  border-radius: var(--radius-card) var(--radius-card) 0 0;
  background: var(--color-brand);
}

.eyebrow {
  margin: 0;
  color: #5c5e65;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.offer.featured .eyebrow {
  color: var(--color-brand);
}

.offer h3 {
  margin: 2px 0 8px;
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
}

.amount {
  margin: 0;
  font-size: 32px;
  line-height: 38px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.amount span {
  font-size: 12px;
  font-weight: 600;
  color: #5c5e65;
  letter-spacing: 0;
}

.daily {
  display: inline-flex;
  margin: 8px 0 0;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--color-brand);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.daily.free {
  background: #dedfe8;
  color: #60626a;
}

.note,
ul {
  margin: 14px 0;
  padding: 12px;
  border-radius: 12px;
  background: #f0f3ff;
  color: #161c27;
  font-size: 14px;
  line-height: 20px;
}

ul {
  list-style: none;
}

ul li + li {
  margin-top: 8px;
}

ul li::before {
  content: '✓ ';
  color: #008352;
  font-weight: 700;
}

.btn.choose,
.btn.meet {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: var(--radius-control);
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
}

.btn.choose {
  background: var(--color-brand);
  color: #fff;
}

.btn.choose.free,
.btn.meet {
  background: #008352;
  color: #fff;
}

.advisor {
  margin-top: 18px;
  padding: 16px;
  border-radius: var(--radius-card);
  background: #f0f3ff;
  text-align: center;
}

.advisor p {
  margin: 12px 0;
  color: #5e3f3c;
  font-size: 14px;
  line-height: 20px;
}
</style>
