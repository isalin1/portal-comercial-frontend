<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import RejectionNote from '../components/RejectionNote.vue'
import { apiError, http } from '../api'
import { dismissRejection } from '../publication'

interface AgendaService {
  id: number
  name: string
  durationMinutes: number
  price: number
  isActive: boolean
  pendingApproval?: boolean
  rejected?: boolean
}

const route = useRoute()
const error = ref('')
const services = ref<AgendaService[]>([])
const slotMinutes = ref(30)
const rubroName = ref('')
const loading = ref(false)
const form = ref({ name: '', price: 0 })
const editing = ref<AgendaService | null>(null)
const activeCount = computed(() => services.value.filter((service) => service.isActive).length)
const shownDuration = computed(() => editing.value?.durationMinutes || slotMinutes.value)

async function load() {
  const { data } = await http.get<{
    business: { rubroName?: string }
    agenda: null | { slotMinutes: number; services: AgendaService[] }
  }>(`/agenda/${route.query.negocio}`, {
    params: { professionalId: route.query.profesional },
  })
  rubroName.value = data.business?.rubroName || ''
  slotMinutes.value = data.agenda?.slotMinutes || 30
  services.value = data.agenda?.services || []
}

function resetForm() {
  editing.value = null
  form.value = { name: '', price: 0 }
}

function editar(service: AgendaService) {
  error.value = ''
  editing.value = service
  form.value = { name: service.name, price: service.price }
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (editing.value) {
      await http.patch(`/agenda/services/${editing.value.id}`, {
        name: form.value.name,
        price: Number(form.value.price),
      })
    } else {
      await http.post(`/agenda/${route.query.negocio}/services`, {
        name: form.value.name,
        durationMinutes: slotMinutes.value,
        price: Number(form.value.price),
      }, { params: { professionalId: route.query.profesional } })
    }
    resetForm()
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

async function quitar(service: AgendaService) {
  error.value = ''
  try {
    await dismissRejection('AGENDA_SERVICE', service.id)
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function toggle(service: AgendaService) {
  error.value = ''
  try {
    await http.patch(`/agenda/services/${service.id}`, { isActive: !service.isActive })
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <h2>Servicios</h2>
      <p v-if="rubroName" class="chip">{{ rubroName }}</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="list">
      <header>
        <h3>Servicios registrados</h3>
        <span>{{ activeCount === 1 ? '1 servicio activo' : `${activeCount} servicios activos` }}</span>
      </header>
      <p v-if="!services.length" class="empty">Aún no hay servicios registrados.</p>
      <article v-for="service in services" :key="service.id" class="card">
        <div class="top">
          <h4>{{ service.name }}</h4>
          <b :class="{ off: !service.isActive }">{{ service.isActive ? 'Activo' : 'Inactivo' }}</b>
        </div>
        <p class="specs"><span>{{ service.durationMinutes }} min</span><i>·</i><strong>S/ {{ service.price.toFixed(2) }}</strong></p>
        <p v-if="service.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
        <RejectionNote :rejected="service.rejected" @dismiss="quitar(service)" />
        <div class="actions">
          <button type="button" @click="editar(service)">Editar</button>
          <button type="button" @click="toggle(service)">{{ service.isActive ? 'Desactivar' : 'Activar' }}</button>
        </div>
      </article>
    </section>
    <p class="split">{{ editing ? 'Edición' : 'Nuevo registro' }}</p>
    <form class="sheet" @submit.prevent="submit">
      <header>
        <h3>{{ editing ? 'Editar servicio' : 'Registrar nuevo servicio' }}</h3>
        <p>{{ editing ? 'Actualiza el nombre o el precio' : 'Añade una prestación a tu catálogo' }}</p>
      </header>
      <label>
        <span>Servicio *</span>
        <input v-model="form.name" required placeholder="Ej. Consulta, asesoría" />
      </label>
      <p class="note">
        <strong>Duración: {{ shownDuration }} min.</strong>
        Se configura en
        <router-link :to="{ name: 'agenda-settings', query: route.query }">Horario y turnos</router-link>
        y no se cambia aquí.
      </p>
      <label>
        <span>Precio *</span>
        <em>S/</em>
        <input v-model.number="form.price" type="number" min="0" step="0.01" required />
      </label>
      <small>Ingresa 0 si el servicio no tiene costo.</small>
      <button class="save" type="submit" :disabled="loading">{{ loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar servicio' }}</button>
      <button v-if="editing" class="cancel" type="button" @click="resetForm">Cancelar</button>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 16px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.chip {
  display: inline-flex;
  margin: 8px 0 0;
  padding: 4px 10px;
  border: 1px solid #fecaca;
  border-radius: 999px;
  background: #fef2f2;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 600;
}
.list header, .card .top, .actions { display: flex; align-items: center; }
.list header { justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.list h3 { margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.list header span {
  flex: none;
  padding: 2px 8px;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 11px;
  font-weight: 700;
}
.empty { margin: 0 0 12px; color: #64748b; font-size: 13px; }
.card, .sheet {
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.card h4 { margin: 0; font-size: 16px; }
.card .top { justify-content: space-between; gap: 8px; }
.card b {
  flex: none;
  padding: 2px 8px;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 11px;
}
.card b.off { border-color: #e2e8f0; background: #f1f5f9; color: #64748b; }
.specs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
  padding: 8px 10px;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}
.specs i { color: #cbd5e1; font-style: normal; }
.specs strong { color: var(--color-brand); font-size: 14px; }
.actions { gap: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; }
.actions button, .cancel {
  flex: 1;
  min-height: 40px;
  border: 0;
  border-radius: 12px;
  background: #f1f5f9;
  color: #334155;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}
.split {
  margin: 8px 0 12px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
}
.sheet header h3 { margin: 0; font-size: 14px; }
.sheet header p, .note, small { margin: 2px 0 0; color: #64748b; font-size: 12px; }
.sheet header { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
.sheet label { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; position: relative; }
.sheet label span { font-size: 12px; font-weight: 700; }
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
.sheet label em {
  position: absolute;
  left: 12px;
  bottom: 12px;
  color: #64748b;
  font-style: normal;
  font-weight: 800;
}
.sheet label:last-of-type input { padding-left: 36px; }
.note {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #eff6ff;
  color: #1e3a8a;
  line-height: 16px;
}
.note strong { color: #1e3a8a; }
.note a { color: #1d4ed8; font-weight: 700; }
.save, .cancel { width: 100%; }
.save {
  min-height: 48px;
  margin-top: 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-weight: 700;
}
.save:disabled { opacity: 0.6; }
.cancel { margin-top: 8px; }
</style>
