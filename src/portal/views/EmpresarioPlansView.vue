<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { http } from '../api'
import { whatsappChatUrl, openWhatsAppChat } from '../whatsapp'

const router = useRouter()
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

function isFree(plan: PlanCard) {
  return plan.commercialName === 'Free' || /libre/i.test(plan.name)
}

function monthsOf(plan: PlanCard) {
  if (isFree(plan)) return 1
  const name = plan.name.toLowerCase()
  if (name.includes('anual') && !name.includes('semestral')) return 12
  if (name.includes('semestral')) return 6
  if (name.includes('trimestral')) return 3
  return 1
}

function period(plan: PlanCard) {
  if (isFree(plan)) return 'libre'
  const name = plan.name.toLowerCase()
  if (name.includes('anual') && !name.includes('semestral')) return 'anual'
  if (name.includes('semestral')) return 'semestral'
  if (name.includes('trimestral')) return 'trimestral'
  return 'mes'
}

function monthsBadge(plan: PlanCard) {
  if (isFree(plan)) return 'Gratis'
  const months = monthsOf(plan)
  return `${String(months).padStart(2, '0')} Mes${months === 1 ? '' : 'es'}`
}

function accessLabel(plan: PlanCard) {
  if (isFree(plan)) return 'Acceso inicial'
  const name = plan.name.toLowerCase()
  if (name.includes('anual') && !name.includes('semestral')) return 'Acceso Anual'
  if (name.includes('semestral')) return 'Acceso Semestral'
  if (name.includes('trimestral')) return 'Acceso Trimestral'
  return 'Acceso Mensual'
}

function planTitle(plan: PlanCard) {
  if (isFree(plan)) return 'Free / Inicial'
  return `${plan.commercialName} ${plan.name}`.trim()
}

function money(value: number, digits = 2) {
  return `S/. ${value.toFixed(digits)}`
}

function moneyPromo(value: number | string) {
  const n = Number(value)
  return Number.isInteger(n) ? `S/. ${n.toFixed(1)}` : `S/. ${n.toFixed(1)}`
}

/** Costo equivalente mensual = precio del plan / número de meses */
function monthlyEquivalent(plan: PlanCard) {
  if (isFree(plan)) return 0
  const months = monthsOf(plan)
  return Number(plan.price) / months
}

/** Equivalente diario = equivalente mensual / 30 */
function dailyEquivalent(plan: PlanCard) {
  if (isFree(plan)) return 0
  return monthlyEquivalent(plan) / 30
}

function promoNote(plan: PlanCard) {
  if (isFree(plan)) return 'Registra tu negocio y los clientes podrán ubicarte'
  const months = monthsOf(plan)
  if (months === 12) return 'Pago único anual con acceso completo por 365 días'
  if (months === 6) return 'Acceso integral y soporte comercial por 6 meses'
  if (months === 3) return 'Conexión directa con clientes por 90 días'
  return 'Flexibilidad mes a mes para impulsar tu negocio'
}

function features(plan: PlanCard) {
  if (isFree(plan)) return ['Registra tu negocio', 'Aparece en el directorio local', 'Los clientes podrán ubicarte']
  if (plan.commercialName === 'Emprendedor') {
    return [
      'Publica tu oferta de productos o servicios',
      'Botón de WhatsApp para comunicación directa con tu cliente',
      'Presencia garantizada en el directorio local',
    ]
  }
  if (plan.commercialName === 'Empresario') {
    return [
      'Incluye todo lo del plan Emprendedor',
      'Pedidos registrados por el empresario',
      'Agenda organizada para 1 profesional',
      'Reportes e historial de ventas básicos',
    ]
  }
  return [
    'Incluye todo lo del plan Empresario',
    'Pedidos registrados directamente por el cliente',
    'Resumen comercial del día y métricas clave',
    `Agenda activa para hasta ${maxProfessionals.value} profesionales`,
    'Máxima visibilidad y posicionamiento prioritario',
  ]
}

function whatsapp(text: string) {
  return whatsappChatUrl(phone.value, text)
}

function buyPlan(plan: PlanCard) {
  if (isFree(plan)) {
    return router.push({ name: 'register', params: { tipo: 'empresario' }, query: { plan: 'free' } })
  }
  return router.push({
    name: 'register',
    params: { tipo: 'empresario' },
    query: { compra: '1', afiliacion: `${plan.commercialName} ${plan.name}` },
  })
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
  <ScreenFrame storefront back fluid>
    <section class="plans-hero">
      <p class="pill">
        <i aria-hidden="true" />
        Planes Comerciales
      </p>
      <h2>Tus clientes te encontrarán las 24 horas del día, todos los días del año</h2>
      <p>Potencia tus ventas locales y digitaliza la atención de tu negocio con máxima visibilidad en el directorio comercial líder.</p>
      <a href="#planes">Elige un plan</a>
    </section>

    <div id="planes" class="plan-stack">
      <article
        v-for="plan in orderedPlans"
        :key="plan.id"
        class="offer"
        :class="{ featured: plan.commercialName === 'Corporativo', free: isFree(plan) }"
      >
        <div v-if="plan.commercialName === 'Corporativo'" class="ribbon">Más recomendado · Mejor valor</div>

        <header class="offer-head">
          <div>
            <span class="access">{{ accessLabel(plan) }}</span>
            <h3>{{ planTitle(plan) }}</h3>
          </div>
          <span class="months">{{ monthsBadge(plan) }}</span>
        </header>

        <div class="equiv">
          <p>Equivalente de inversión:</p>
          <div class="equiv-grid">
            <div>
              <span>Por día</span>
              <strong>{{ money(dailyEquivalent(plan)) }}</strong>
            </div>
            <div>
              <span>Por mes</span>
              <strong>{{ money(monthlyEquivalent(plan)) }}</strong>
            </div>
          </div>
        </div>

        <div class="benefits">
          <p v-if="plan.commercialName === 'Corporativo'" class="benefits-title">Beneficios incluidos:</p>
          <ul>
            <li v-for="item in features(plan)" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div class="promo">
          <span class="promo-tag">{{ isFree(plan) ? 'Sin costo' : 'Precio promocional' }}</span>
          <p class="amount">
            {{ moneyPromo(plan.price) }}
            <small>/ {{ period(plan) }}</small>
          </p>
          <p class="promo-note">{{ promoNote(plan) }}</p>
        </div>

        <button
          v-if="isFree(plan)"
          class="btn choose free"
          type="button"
          @click="buyPlan(plan)"
        >
          Registrarme gratis
          <span aria-hidden="true">→</span>
        </button>
        <button
          v-else
          class="btn choose"
          type="button"
          @click="buyPlan(plan)"
        >
          Comprar plan
          <span aria-hidden="true">→</span>
        </button>
      </article>
    </div>

    <section class="advisor">
      <a class="btn meet" :href="whatsapp('Deseo agendar una reunion gratuita')" @click.prevent="openWhatsAppChat(phone, 'Deseo agendar una reunion gratuita')">Agenda reunión gratuita</a>
      <p>Comunícate de inmediato con nosotros y tu negocio empezará a vender más</p>
      <a class="btn choose" :href="whatsapp('Hola, quiero información de los planes.')" @click.prevent="openWhatsAppChat(phone, 'Hola, quiero información de los planes.')">WhatsApp: {{ phone }}</a>
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
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  padding: 4px 12px;
  border-radius: 999px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: var(--color-brand);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pill i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-brand);
}

.plans-hero h2 {
  margin: 0 auto 10px;
  max-width: 340px;
  color: var(--color-brand);
  font-size: 22px;
  line-height: 28px;
  font-weight: 900;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.plans-hero p {
  margin: 0 auto 14px;
  max-width: 320px;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.plans-hero a {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--color-brand);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}

.plan-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 22px;
}

.offer {
  position: relative;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 18px 16px 16px;
  box-shadow: 0 4px 16px -8px rgba(22, 28, 39, 0.18);
  overflow: hidden;
}

.offer.featured {
  border: 2px solid var(--color-brand);
  box-shadow: 0 12px 28px -8px rgba(226, 18, 33, 0.18);
  padding-top: 42px;
}

.offer.free {
  border-color: #a7f3d0;
}

.ribbon {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  background: var(--color-brand);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.offer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.access {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.offer h3 {
  margin: 2px 0 0;
  font-size: 18px;
  line-height: 22px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

.months {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.equiv {
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}

.equiv > p {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.equiv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.equiv-grid > div {
  padding: 10px 8px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  text-align: center;
}

.offer.featured .equiv-grid > div {
  border-color: #fecdd3;
}

.equiv-grid span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.equiv-grid strong {
  display: block;
  margin-top: 2px;
  color: var(--color-ink);
  font-size: 14px;
  font-weight: 800;
}

.offer.featured .equiv-grid strong {
  color: var(--color-brand);
}

.benefits {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}

.offer.featured .benefits {
  background: #fff1f2;
  border-color: #fecdd3;
}

.benefits-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 800;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

ul li {
  position: relative;
  padding-left: 18px;
  color: #334155;
  font-size: 12px;
  line-height: 18px;
}

ul li + li {
  margin-top: 8px;
}

ul li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--color-brand);
  font-weight: 800;
}

.promo {
  margin-bottom: 14px;
  text-align: center;
}

.promo-tag {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  background: #fee2e2;
  color: var(--color-brand);
  font-size: 10px;
  font-weight: 800;
}

.amount {
  margin: 8px 0 4px;
  font-size: 30px;
  line-height: 34px;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.amount small {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.promo-note {
  margin: 0;
  color: #64748b;
  font-size: 10px;
}

.btn.choose,
.btn.meet {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 12px;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.btn.choose {
  background: var(--color-brand);
  color: #fff;
  box-shadow: 0 4px 14px rgba(226, 18, 33, 0.35);
}

.btn.choose.free,
.btn.meet {
  background: #008352;
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 131, 82, 0.3);
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

@media (min-width: 1024px) {
  .plans-hero {
    margin-bottom: 8px;
  }

  .pill {
    font-size: 12px;
    padding: 6px 14px;
  }

  .plans-hero h2 {
    max-width: 720px;
    font-size: 36px;
    line-height: 1.15;
  }

  .plans-hero p {
    max-width: 560px;
    font-size: 15px;
    line-height: 22px;
  }

  .plans-hero a {
    min-height: 48px;
    padding: 0 24px;
    font-size: 14px;
  }

  .plan-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin-top: 28px;
    align-items: start;
  }

  .offer {
    padding: 22px 20px 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .offer.featured {
    padding-top: 46px;
  }

  .offer h3 {
    font-size: 20px;
    line-height: 24px;
  }

  .equiv,
  .benefits {
    padding: 16px;
  }

  ul li {
    font-size: 13px;
    line-height: 20px;
  }

  .amount {
    font-size: 36px;
    line-height: 40px;
  }

  .promo-note {
    font-size: 12px;
  }

  .btn.choose,
  .btn.meet {
    margin-top: auto;
    height: 52px;
    font-size: 15px;
  }

  .advisor {
    max-width: 560px;
    margin: 28px auto 0;
    padding: 24px;
  }

  .advisor p {
    font-size: 15px;
    line-height: 22px;
  }
}
</style>
