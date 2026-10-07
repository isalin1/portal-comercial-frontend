<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { openWhatsAppChat } from '../whatsapp'
import type { AccountPlan, AccountUser } from '../types'

const route = useRoute()
const router = useRouter()
const user = ref<AccountUser | null>(null)
const plans = ref<AccountPlan[]>([])
const error = ref('')
const planId = ref<number | null>(null)
const saving = ref(false)
const form = ref({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
})

function day(value?: string | null) {
  return value ? value.slice(0, 10) : 'Sin fecha'
}

function limaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function plusDays(base: string, amount: number) {
  const [year, month, date] = base.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, date))
  next.setUTCDate(next.getUTCDate() + amount)
  return next.toISOString().slice(0, 10)
}

function planPower(plan?: AccountPlan | null) {
  if (!plan) return 0
  return (
    (plan.showProducts ? 1 : 0) +
    (plan.whatsappButton ? 1 : 0) +
    (plan.operatorOrders ? 2 : 0) +
    (plan.agenda ? 2 : 0) +
    (plan.clientOrders ? 4 : 0) +
    (plan.daySummary ? 4 : 0)
  )
}

function comparePlans(current?: AccountPlan | null, next?: AccountPlan | null) {
  const left = planPower(current)
  const right = planPower(next)
  if (right !== left) return right > left ? 'superior' : 'inferior'
  const leftPrice = Number(current?.price || 0)
  const rightPrice = Number(next?.price || 0)
  if (rightPrice !== leftPrice) return rightPrice > leftPrice ? 'superior' : 'inferior'
  const leftDays = Number(current?.days || 0)
  const rightDays = Number(next?.days || 0)
  if (rightDays !== leftDays) return rightDays > leftDays ? 'superior' : 'inferior'
  return 'igual'
}

function planLabel(plan?: AccountPlan | null) {
  if (!plan) return 'el plan actual'
  if (plan.name === 'Libre') return 'Plan Free'
  return `${plan.commercialName} · ${plan.name}`
}

const paymentPlans = computed(() =>
  plans.value
    .filter((plan) => plan.name !== 'Libre')
    .sort((a, b) => a.days - b.days || a.name.localeCompare(b.name, 'es')),
)

function markPayment(id: number) {
  planId.value = planId.value === id ? null : id
}

const selectedPlan = computed(() => paymentPlans.value.find((plan) => plan.id === planId.value) || null)

const planEffect = computed(() => {
  if (!user.value || !selectedPlan.value) return { kind: '', text: '', end: '' }
  const next = selectedPlan.value
  const current = user.value.planCatalog
  const vigente = Boolean(user.value.vigenciaEnd && user.value.vigenciaEnd.slice(0, 10) >= limaToday())
  if (!vigente || !current) {
    return {
      kind: 'asignado',
      text: `Se asignará ${planLabel(next)} de inmediato, por ${next.days} días desde hoy.`,
      end: plusDays(limaToday(), next.days),
    }
  }
  const change = comparePlans(current, next)
  if (change === 'superior') {
    const base = user.value.vigenciaEnd ? user.value.vigenciaEnd.slice(0, 10) : limaToday()
    return {
      kind: 'superior',
      text: `Es un plan mayor. Las funcionalidades de ${planLabel(next)} se asignan de inmediato. Se agregan ${next.days} días a partir del fin de la vigencia actual.`,
      end: plusDays(base, next.days),
    }
  }
  if (change === 'inferior') {
    return {
      kind: 'inferior',
      text: `Es un plan menor. Se mantienen las funcionalidades de ${planLabel(current)} hasta el ${day(user.value.vigenciaEnd)}. A partir de esa fecha se asignan las de ${planLabel(next)}, por ${next.days} días.`,
      end: day(user.value.vigenciaEnd),
    }
  }
  const base = user.value.vigenciaEnd ? user.value.vigenciaEnd.slice(0, 10) : limaToday()
  return {
    kind: 'igual',
    text: `Se agregan ${next.days} días a partir del fin de la vigencia actual. Las funcionalidades no cambian.`,
    end: plusDays(base, next.days),
  }
})

const updatedEnd = computed(() => planEffect.value.end)

onMounted(async () => {
  try {
    const [userRes, planRes] = await Promise.all([
      http.get<AccountUser>(`/user/${route.params.id}`),
      http.get<AccountPlan[]>('/plans'),
    ])
    user.value = userRes.data
    plans.value = planRes.data
    form.value = {
      firstName: userRes.data.datUser.firstName,
      lastName: userRes.data.datUser.lastName,
      phone: userRes.data.datUser.phone,
      email: userRes.data.datUser.email,
      password: '',
    }
  } catch (err) {
    error.value = apiError(err)
  }
})

async function setStatus(isActive: boolean) {
  if (!user.value) return
  error.value = ''
  saving.value = true
  try {
    user.value = (await http.patch<AccountUser>(`/user/${user.value.id}/status`, { isActive })).data
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

async function register() {
  if (!user.value) return
  if (!form.value.firstName.trim() || !form.value.lastName.trim() || !form.value.phone.trim() || !form.value.email.trim()) {
    error.value = 'Completa nombres, apellidos, celular y email'
    return
  }
  if (form.value.password && form.value.password.length < 6) {
    error.value = 'La contraseña nueva debe tener al menos 6 caracteres'
    return
  }
  error.value = ''
  saving.value = true
  try {
    const payload: Record<string, string> = {
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      phone: form.value.phone.trim(),
      email: form.value.email.trim(),
    }
    if (form.value.password) payload.password = form.value.password
    await http.patch(`/user/${user.value.id}`, payload)
    if (planId.value) {
      const plan = paymentPlans.value.find((item) => item.id === planId.value)
      const { data } = await http.patch<{
        whatsappPhone?: string | null
        whatsappMessage?: string | null
        whatsappUrl?: string | null
      }>(`/user/${user.value.id}/vigencia`, { planId: planId.value })

      const phone = data.whatsappPhone || form.value.phone.trim()
      const name = `${form.value.firstName.trim()} ${form.value.lastName.trim()}`.trim() || 'empresario'
      const rawPlan = plan?.name?.trim() || plan?.commercialName?.trim() || 'plan'
      const planName = /^plan\s+/i.test(rawPlan) ? rawPlan.replace(/^plan\s+/i, '') : rawPlan
      const message =
        data.whatsappMessage?.trim() || `Hola ${name}, tu plan ${planName} ha sido activado`

      if (phone) {
        openWhatsAppChat(phone, message)
        return
      }
    }
    await router.push({ name: 'empresarios' })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <p v-if="error" class="error">{{ error }}</p>
    <form v-if="user" class="edit" @submit.prevent="register">
      <header class="head">
        <h2>Editar usuario / Actualizar plan</h2>
        <p class="who">
          <b>{{ form.firstName }} {{ form.lastName }}</b>
          <span :class="{ off: !user.isActive }">{{ user.isActive ? 'Activo' : 'Inactivo' }}</span>
        </p>
        <p v-if="user.businesses?.[0]?.category?.name" class="hint">{{ user.businesses[0].category.name }}</p>
        <p class="hint">Gestión centralizada de cuenta, plazos y vigencias</p>
      </header>
      <section class="sheet">
        <header>
          <h3>Datos personales</h3>
          <span>ID: {{ user.id }}</span>
        </header>
        <label>
          <span>Nombres</span>
          <input v-model="form.firstName" required />
        </label>
        <label>
          <span>Apellidos</span>
          <input v-model="form.lastName" required />
        </label>
        <label>
          <span>Celular / WhatsApp</span>
          <input v-model="form.phone" required />
        </label>
        <label>
          <span>Correo electrónico</span>
          <input v-model="form.email" type="email" required />
        </label>
        <label>
          <span>Nueva contraseña</span>
          <input v-model="form.password" type="password" minlength="6" placeholder="Dejar en blanco para no cambiarla" />
          <small>Opcional. Se cambia solo si se escribe una contraseña nueva.</small>
        </label>
        <label>
          <span>Fin de vigencia actual <em>Fecha base</em></span>
          <input :value="day(user.vigenciaEnd)" readonly />
        </label>
      </section>
      <section class="sheet">
        <header>
          <div>
            <h3>Pago recibido / Asignar plan</h3>
            <small>Selecciona el pago para extender la suscripción</small>
          </div>
          <b>{{ paymentPlans.length }}</b>
        </header>
        <button
          v-for="plan in paymentPlans"
          :key="plan.id"
          class="plan"
          :class="{ on: planId === plan.id }"
          type="button"
          @click="markPayment(plan.id)"
        >
          <i />
          <span>
            <strong>{{ plan.days }} días · Plan {{ plan.name }}</strong>
            <small>{{ plan.commercialName }}</small>
          </span>
          <em>S/ {{ Number(plan.price || 0).toFixed(2) }}</em>
        </button>
      </section>
      <section class="sheet">
        <p class="label">Actualizar estado</p>
        <div class="segment">
          <button type="button" :class="{ on: user.isActive }" :disabled="saving" @click="setStatus(true)">Activo</button>
          <button type="button" :class="{ on: !user.isActive }" :disabled="saving" @click="setStatus(false)">Inactivo</button>
        </div>
        <label>
          <span>Fin vigencia actualizada</span>
          <input class="next" :value="updatedEnd || 'vigencia actual + plazo'" readonly />
          <small v-if="updatedEnd">Se calcula sumando el plazo a la fecha base actual ({{ day(user.vigenciaEnd) }}).</small>
        </label>
        <p v-if="user.pendingPlan && planEffect.kind !== 'superior' && planEffect.kind !== 'asignado'" class="note">Hay un plan inferior en espera: {{ planLabel(user.pendingPlan) }}. Se aplicará al terminar la vigencia actual.</p>
        <p v-if="planEffect.text" class="note">{{ planEffect.text }}</p>
      </section>
      <button class="save" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Registrar cambios' }}</button>
      <button class="back" type="button" @click="router.push({ name: 'empresarios' })">Cancelar y regresar</button>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 16px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
.who { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 8px 0 0; }
.who b { font-size: 16px; }
.who span {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: #d1fae5;
  color: #047857;
  font-size: 11px;
  font-weight: 700;
}
.who span.off { background: #e2e8f0; color: #475569; }
.hint { margin: 4px 0 0; color: #64748b; font-size: 12px; }
.sheet {
  margin-bottom: 14px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.sheet > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
.sheet h3, .label { margin: 0; color: #94a3b8; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.sheet header span, .sheet header small { color: #94a3b8; font-size: 11px; }
.sheet header b {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fee2e2;
  color: var(--color-brand);
  font-size: 12px;
}
.sheet label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.sheet label span { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 700; }
.sheet label em {
  padding: 1px 6px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
}
.sheet input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  font: inherit;
  font-weight: 600;
}
.sheet input[readonly] { background: #f1f5f9; color: #334155; }
.sheet input.next { border-color: #fecaca; background: #fff5f5; color: #0f172a; }
.sheet small, .note { margin: 0; color: #64748b; font-size: 11px; line-height: 1.4; }
.note { margin-top: 8px; }
.plan {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 8px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  text-align: left;
  font: inherit;
}
.plan i {
  flex: none;
  width: 16px;
  height: 16px;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  background: #fff;
}
.plan.on { border-color: var(--color-brand); background: #fff5f5; }
.plan.on i { border-color: var(--color-brand); box-shadow: inset 0 0 0 4px var(--color-brand); }
.plan span { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.plan strong { font-size: 12px; }
.plan small { color: #64748b; font-size: 11px; }
.plan em {
  flex: none;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-style: normal;
  font-size: 13px;
  font-weight: 800;
}
.plan.on em { border-color: #fecaca; color: var(--color-brand); }
.segment { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 8px 0 14px; padding: 4px; border-radius: 12px; background: #f1f5f9; }
.segment button {
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}
.segment button.on { background: var(--color-brand); color: #fff; }
.segment button:disabled { opacity: 0.6; }
.save, .back { width: 100%; border: 0; font: inherit; }
.save {
  min-height: 48px;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font-weight: 700;
}
.save:disabled { opacity: 0.6; }
.back { min-height: 40px; margin-top: 4px; background: transparent; color: #64748b; font-size: 12px; font-weight: 700; }
</style>
