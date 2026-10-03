<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

interface AgendaBusiness {
  id: number
  commercialName: string
}
interface Professional {
  id: number
  name: string
  isActive: boolean
  agendaControl: boolean
}

const route = useRoute()
const router = useRouter()
const error = ref('')
const enabled = ref(true)
const businesses = ref<AgendaBusiness[]>([])
const professionals = ref<Professional[]>([])
const max = ref(3)
const businessId = computed(() => Number(route.query.negocio) || businesses.value[0]?.id || 0)
const controlled = computed(() => professionals.value.filter((item) => item.agendaControl))
const professionalId = computed(() => Number(route.query.profesional) || controlled.value[0]?.id || 0)

function link(name: string) {
  return { name, query: { negocio: businessId.value, profesional: professionalId.value } }
}

async function loadProfessionals() {
  if (!businessId.value) return
  const { data } = await http.get<{ max: number; professionals: Professional[] }>(`/agenda/${businessId.value}/profesionales`)
  professionals.value = data.professionals
  max.value = data.max
  const allowed = data.professionals.filter((item) => item.agendaControl)
  if (allowed[0] && !allowed.some((item) => item.id === professionalId.value)) {
    await router.replace({ name: 'agenda', query: { negocio: businessId.value, profesional: allowed[0].id } })
  }
}

onMounted(async () => {
  try {
    enabled.value = (await http.get<{ enabled: boolean }>('/agenda/access/me')).data.enabled
    if (!enabled.value) return
    businesses.value = (await http.get<AgendaBusiness[]>('/agenda/businesses')).data
    await loadProfessionals()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch(businessId, async (id) => {
  if (!id) return
  if (Number(route.query.negocio) !== id) {
    await router.replace({ name: 'agenda', query: { negocio: id } })
  }
  try {
    await loadProfessionals()
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head"><h2>Agenda</h2></header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!error && !enabled" class="hint">La agenda está disponible desde el plan semestral del rubro Profesionales.</p>
    <p v-else-if="!error && !businesses.length" class="hint">La agenda está disponible para negocios del rubro Profesionales y Técnicos Independientes.</p>
    <template v-else-if="businessId">
      <label v-if="businesses.length > 1" class="line">
        <span>Negocio</span>
        <select :value="businessId" @change="router.replace({ name: 'agenda', query: { negocio: ($event.target as HTMLSelectElement).value } })">
          <option v-for="business in businesses" :key="business.id" :value="business.id">{{ business.commercialName }}</option>
        </select>
      </label>
      <p v-if="!controlled.length" class="hint">Registra al profesional en el punto de venta e inclúyelo en la agenda. Este plan controla {{ max }}.</p>
      <template v-else>
        <p v-if="professionals.length > controlled.length" class="hint">Hay {{ professionals.length }} profesionales registrados. Este plan controla la agenda de {{ max }}.</p>
        <label class="line">
          <span>Profesional</span>
          <select :value="professionalId" @change="router.replace({ name: 'agenda', query: { negocio: businessId, profesional: ($event.target as HTMLSelectElement).value } })">
            <option v-for="person in controlled" :key="person.id" :value="person.id">{{ person.name }}</option>
          </select>
        </label>
        <nav class="menu">
          <router-link :to="link('agenda-settings')">Horario y turnos</router-link>
          <router-link :to="link('agenda-services')">Servicios</router-link>
          <router-link :to="link('agenda-appointment')">Registrar cita</router-link>
          <router-link :to="link('agenda-board')">Control de citas</router-link>
        </nav>
      </template>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 14px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; }
.hint { color: #64748b; font-size: 13px; line-height: 18px; }
.line { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.line span { color: #475569; font-size: 12px; font-weight: 600; }
.line select {
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-control);
  background: #fff;
  font: inherit;
  font-weight: 600;
}
.menu { display: flex; flex-direction: column; gap: 10px; }
.menu a {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 14px;
  border-radius: var(--radius-control);
  background: #fff;
  box-shadow: var(--shadow-soft);
  color: var(--color-ink);
  font-weight: 700;
  text-decoration: none;
}
</style>
