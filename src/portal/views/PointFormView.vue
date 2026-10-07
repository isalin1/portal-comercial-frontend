<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import RejectionNote from '../components/RejectionNote.vue'
import { apiError, http } from '../api'
import { dismissRejection } from '../publication'
import { usePortalAuth } from '../auth'
import type { Business, GeoItem, PointSale } from '../types'

const auth = usePortalAuth()

const route = useRoute()
const router = useRouter()
const editing = Boolean(route.params.id)
const error = ref('')
const loading = ref(false)
const pendingApproval = ref(false)
const rejected = ref(false)
const businesses = ref<Business[]>([])
const departments = ref<GeoItem[]>([])
const provinces = ref<GeoItem[]>([])
const districts = ref<GeoItem[]>([])
const departmentId = ref(0)
const provinceId = ref(0)
const weekDays = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
]

const form = ref({
  name: '',
  phone: '',
  businessId: 0,
  districtId: 0,
  street: '',
  urbanZone: '',
  reference: '',
  opensAt: '09:00',
  closesAt: '21:00',
  chargesDelivery: false,
  deliveryFee: 0,
})
const openDays = ref<number[]>([1, 2, 3, 4, 5, 6])
const showProfessionals = ref(false)
const maxProfessionals = ref(1)
const professionals = ref<{ id: number; name: string; phone: string | null; agendaControl: boolean }[]>([])
const person = ref({ name: '', phone: '' })
const personMessage = ref('')

const provinceOptions = computed(() =>
  provinces.value.filter((item) => item.departmentId === departmentId.value),
)
const districtOptions = computed(() =>
  districts.value.filter((item) => item.provinceId === provinceId.value),
)
const selectedBusiness = computed(() => businesses.value.find((item) => item.id === form.value.businessId))
const zoneLocked = computed(() => Boolean(selectedBusiness.value?.zone))

function applyZone() {
  const district = selectedBusiness.value?.zone?.district
  const province = district?.province
  if (!district || !province) return
  departmentId.value = province.departmentId || province.department?.id || 0
  provinceId.value = district.provinceId || province.id
  form.value.districtId = district.id
}

watch(() => form.value.businessId, () => {
  applyZone()
  loadProfessionals()
})

async function loadProfessionals() {
  const business = selectedBusiness.value
  if (!business || !/profesional/i.test(business.rubro?.name || '')) return
  try {
    const { data } = await http.get<{ max: number; professionals: { id: number; name: string; phone: string | null; agendaControl: boolean }[] }>(
      `/agenda/${business.id}/profesionales`,
    )
    professionals.value = data.professionals
    maxProfessionals.value = data.max
    showProfessionals.value = true
  } catch {
    showProfessionals.value = false
  }
}

async function addProfessional() {
  personMessage.value = ''
  error.value = ''
  if (!form.value.businessId) return
  try {
    await http.post(`/agenda/${form.value.businessId}/profesionales`, person.value)
    person.value = { name: '', phone: '' }
    personMessage.value = 'Profesional registrado'
    await loadProfessionals()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function toggleAgenda(item: { id: number; agendaControl: boolean }) {
  error.value = ''
  try {
    await http.patch(`/agenda/profesionales/${item.id}`, { agendaControl: !item.agendaControl })
    await loadProfessionals()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function retireProfessional(id: number) {
  error.value = ''
  try {
    await http.patch(`/agenda/profesionales/${id}/retiro`)
    await loadProfessionals()
  } catch (err) {
    error.value = apiError(err)
  }
}

onMounted(async () => {
  try {
  const [businessRes, departmentRes, provinceRes, districtRes] = await Promise.all([
    http.get<Business[]>('/businesses'),
    http.get<GeoItem[]>('/departments'),
    http.get<GeoItem[]>('/provinces'),
    http.get<GeoItem[]>('/districts'),
  ])
  businesses.value = businessRes.data
  departments.value = departmentRes.data
  provinces.value = provinceRes.data
  districts.value = districtRes.data
  const requestedBusiness = Number(route.query.negocio)
  if (requestedBusiness) form.value.businessId = requestedBusiness
  else if (!form.value.businessId && businesses.value[0]) form.value.businessId = businesses.value[0].id

  if (!editing) {
    applyZone()
    if (!zoneLocked.value) {
      const junin = departments.value.find((item) => item.name.toLowerCase().includes('jun'))
      departmentId.value = junin?.id || departments.value[0]?.id || 0
    }
    return
  }

  const point = (await http.get<PointSale>(`/point-sales/${route.params.id}`)).data
  pendingApproval.value = Boolean(point.pendingApproval)
  rejected.value = Boolean(point.rejected)
  form.value = {
    name: point.name,
    phone: point.phone,
    businessId: point.businessId,
    districtId: point.address?.districtId || 0,
    street: point.address?.street || '',
    urbanZone: point.address?.urbanZone || '',
    reference: point.address?.reference || '',
    opensAt: point.opensAt || '',
    closesAt: point.closesAt || '',
    chargesDelivery: Boolean(point.chargesDelivery),
    deliveryFee: Number(point.deliveryFee || 0),
  }
  openDays.value = point.openDays ? point.openDays.split(',').map(Number) : []
  provinceId.value = point.address?.district?.provinceId || 0
  departmentId.value = point.address?.district?.province?.departmentId || 0
  applyZone()
  await loadProfessionals()
  } catch (err) {
    error.value = apiError(err)
  }
})

async function quitar() {
  error.value = ''
  try {
    await dismissRejection('POINT', Number(route.params.id))
    await router.push({ name: 'businesses' })
  } catch (err) {
    error.value = apiError(err)
  }
}

function onProfessionalEnter(event: KeyboardEvent) {
  event.preventDefault()
  addProfessional()
}

async function submit() {
  error.value = ''
  if (showProfessionals.value && person.value.name.trim()) {
    try {
      await http.post(`/agenda/${form.value.businessId}/profesionales`, person.value)
      person.value = { name: '', phone: '' }
    } catch (err) {
      error.value = apiError(err)
      return
    }
  }
  loading.value = true
  const days = weekDays.map((day) => day.id).filter((id) => openDays.value.includes(id))
  const payload = {
    ...form.value,
    urbanZone: form.value.urbanZone || undefined,
    reference: form.value.reference || undefined,
    opensAt: form.value.opensAt || null,
    closesAt: form.value.closesAt || null,
    openDays: days.length ? days.join(',') : null,
  }
  try {
    if (editing) await http.patch(`/point-sales/${route.params.id}`, payload)
    else await http.post('/point-sales', payload)
    await router.push({ name: 'businesses' })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <p v-if="auth.userType === 'EMPRESARIO'" class="pill">Perfil Empresario</p>
      <h2>{{ editing ? 'Editar punto de venta' : 'Registro de datos punto de venta' }}</h2>
      <p>{{ editing ? 'Actualiza los datos de este local para los clientes de la red' : 'Configura y publica tu nuevo local para clientes de la red' }}</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
    <RejectionNote :rejected="rejected" @dismiss="quitar" />
    <p v-if="!businesses.length" class="hint">Registra un negocio antes de crear un local.</p>
    <form v-else class="groups" @submit.prevent="submit">
      <section class="group">
        <h3>Identidad del local</h3>
        <label class="line">
          <span>Negocio</span>
          <select v-model.number="form.businessId" required>
            <option v-for="business in businesses" :key="business.id" :value="business.id">{{ business.commercialName }}</option>
          </select>
        </label>
        <label class="line">
          <span>Nombre del punto de venta</span>
          <input v-model="form.name" required placeholder="Ej. Sede Central / Local 1" />
        </label>
      </section>
      <section class="group">
        <h3>Ubicación y cobertura</h3>
        <p v-if="zoneLocked" class="notice">El departamento, la provincia y el distrito corresponden a la zona del negocio.</p>
        <label class="line">
          <span>Departamento</span>
          <select v-model.number="departmentId" :disabled="zoneLocked">
            <option v-for="item in departments" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <label class="line">
          <span>Provincia</span>
          <select v-model.number="provinceId" :disabled="zoneLocked">
            <option v-for="item in provinceOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <label class="line">
          <span>Distrito</span>
          <select v-model.number="form.districtId" required :disabled="zoneLocked">
            <option v-for="item in districtOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <label class="line">
          <span>Urbanización / zona</span>
          <input v-model="form.urbanZone" placeholder="Ej. Valdiviezo / Salamanca" />
        </label>
        <label class="line">
          <span>Dirección</span>
          <input v-model="form.street" required placeholder="Ej. Av. Grau 148" />
        </label>
        <label class="line">
          <span>Referencia</span>
          <input v-model="form.reference" placeholder="Frente al parque principal" />
        </label>
      </section>
      <section class="group">
        <h3>Contacto directo</h3>
        <label class="line">
          <span>Número de contacto (WhatsApp)</span>
          <input v-model="form.phone" required type="tel" inputmode="numeric" placeholder="987654321" />
        </label>
      </section>
      <section class="group">
        <h3>Horario de atención</h3>
        <span class="caption">Días de atención</span>
        <div class="week">
          <label v-for="day in weekDays" :key="day.id">
            <input v-model="openDays" type="checkbox" :value="day.id" />
            {{ day.label }}
          </label>
        </div>
        <div class="hours">
          <label class="line">
            <span>Abre</span>
            <input v-model="form.opensAt" type="time" />
          </label>
          <label class="line">
            <span>Cierra</span>
            <input v-model="form.closesAt" type="time" />
          </label>
        </div>
      </section>
      <section class="group ship">
        <div>
          <h3>Delivery a domicilio</h3>
          <p>Habilita despachos directos a clientes</p>
        </div>
        <input v-model="form.chargesDelivery" class="switch" type="checkbox" />
        <label v-if="form.chargesDelivery" class="line fee">
          <span>Costo del delivery</span>
          <input v-model.number="form.deliveryFee" type="number" min="0" step="0.01" required />
        </label>
      </section>
      <section v-if="showProfessionals" class="group pros">
        <h3>Profesionales que atienden citas</h3>
        <p>Puedes registrar profesionales en cualquier plan.</p>
        <p v-if="maxProfessionals <= 0">El control de agenda empieza en el plan semestral.</p>
        <p v-else-if="maxProfessionals === 1">El plan semestral controla la agenda de un profesional. Los demás quedan registrados.</p>
        <p v-else>El plan anual controla la agenda de hasta {{ maxProfessionals }} profesionales.</p>
        <article v-for="item in professionals" :key="item.id">
          <strong>{{ item.name }}</strong>
          <span>{{ item.phone || 'Sin celular' }}</span>
          <button v-if="maxProfessionals > 0" type="button" :class="{ on: item.agendaControl }" @click="toggleAgenda(item)">{{ item.agendaControl ? 'En la agenda' : 'Incluir en la agenda' }}</button>
          <button type="button" @click="retireProfessional(item.id)">Retirar</button>
        </article>
        <label class="line"><span>Nombre</span><input v-model="person.name" placeholder="Nombre del profesional" @keydown.enter="onProfessionalEnter" /></label>
        <label class="line"><span>Celular</span><input v-model="person.phone" inputmode="numeric" placeholder="987654321" @keydown.enter="onProfessionalEnter" /></label>
        <button class="add" type="button" @click="addProfessional">Registrar profesional</button>
        <p v-if="personMessage" class="ok">{{ personMessage }}</p>
      </section>
      <button class="save" type="submit" :disabled="loading">{{ loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar' }}</button>
      <p class="hint">Podrás editar estos datos en cualquier momento desde tu panel</p>
    </form>
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
  font-size: 12px;
  font-weight: 700;
}

.head h2 {
  margin: 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.head > p:not(.pill),
.hint {
  margin: 4px 0 0;
  color: #5c5e65;
  font-size: 12px;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.group h3 {
  margin: 0;
  font-size: 16px;
}

.line {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.line span,
.caption {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
}

.caption {
  margin: 0;
  color: #5c5e65;
  font-size: 12px;
}

.line input,
.line select {
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  border: 0;
  border-radius: 12px;
  background: #f0f3ff;
  font: inherit;
  font-size: 14px;
}

.line input:disabled,
.line select:disabled {
  opacity: 0.7;
}

.notice {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff5f5;
  color: var(--color-brand);
  font-size: 12px;
}

.week {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.week label {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 12px;
  background: #f0f3ff;
  color: #5c5e65;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.week input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.week label:has(input:checked) {
  background: var(--color-brand);
  color: #fff;
}

.hours {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ship {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
}

.ship > div {
  grid-column: 1;
}

.ship p {
  margin: 2px 0 0;
  color: #5c5e65;
  font-size: 12px;
}

.switch {
  grid-column: 2;
  grid-row: 1;
  width: 48px;
  height: 28px;
  accent-color: var(--color-brand);
}

.fee {
  grid-column: 1 / -1;
}

.save {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.save:disabled {
  opacity: 0.55;
}

.hint {
  margin: 0;
  text-align: center;
}

.pros p {
  margin: 0;
  color: #5c5e65;
  font-size: 12px;
}

.pros article {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pros article span {
  flex: 1;
  color: #64748b;
  font-size: 12px;
}

.pros article button.on {
  background: #d1fae5;
  color: #047857;
}

.pros article button,
.pros .add {
  min-height: 40px;
  border: 0;
  border-radius: var(--radius-control);
  background: #e2e8f0;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.pros .add {
  width: 100%;
}

.pros .add:disabled {
  opacity: 0.55;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 24px;
  }

  .pill {
    font-size: 13px;
    padding: 5px 14px;
  }

  .head h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .head > p:not(.pill),
  .hint {
    font-size: 14px;
  }

  .groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
  }

  .group {
    padding: 22px 24px;
  }

  .group h3 {
    font-size: 18px;
  }

  .group.ship,
  .group.pros,
  .groups > .save,
  .groups > .hint {
    grid-column: 1 / -1;
  }

  .week {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .save {
    max-width: 420px;
    margin: 8px auto 0;
  }

  .groups > .hint {
    text-align: center;
  }
}
</style>
