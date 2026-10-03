<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import RejectionNote from '../components/RejectionNote.vue'
import { apiError, http } from '../api'
import { dismissRejection } from '../publication'
import { usePortalAuth } from '../auth'
import type { Business, Market, Rubro, Zone } from '../types'

const route = useRoute()
const router = useRouter()
const auth = usePortalAuth()
const rubros = ref<Rubro[]>([])
const markets = ref<Market[]>([])
const zones = ref<Zone[]>([])
const districtId = ref(0)
const error = ref('')
const loading = ref(false)
const pendingApproval = ref(false)
const rejected = ref(false)
const form = ref({
  legalName: '',
  commercialName: '',
  commercialDescription: '',
  numDoc: '',
  docType: '' as '' | 'RUC' | 'DNI',
  rubroId: 0,
  categoryId: 0,
  marketId: 0,
  zoneId: 0,
})

const categories = computed(() => {
  const rubro = rubros.value.find((item) => item.id === form.value.rubroId)
  return [...(rubro?.categories || [])].sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

const zoneDistricts = computed(() => {
  const map = new Map<number, { id: number; name: string; provinceName: string }>()
  for (const zone of zones.value) {
    const district = zone.district
    if (!district || map.has(district.id)) continue
    map.set(district.id, { id: district.id, name: district.name, provinceName: district.province?.name || '' })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

const zonesOfDistrict = computed(() =>
  zones.value.filter((zone) => zone.districtId === districtId.value).sort((a, b) => a.name.localeCompare(b.name, 'es')),
)

const marketsOfZone = computed(() =>
  markets.value
    .filter((market) => market.zoneId === form.value.zoneId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es')),
)

watch(() => form.value.rubroId, () => {
  if (!categories.value.some((category) => category.id === form.value.categoryId)) {
    form.value.categoryId = 0
  }
})

watch(districtId, () => {
  if (!zonesOfDistrict.value.some((zone) => zone.id === form.value.zoneId)) form.value.zoneId = 0
})

watch(() => form.value.zoneId, () => {
  if (!marketsOfZone.value.some((market) => market.id === form.value.marketId)) form.value.marketId = 0
})

const editing = Boolean(route.params.id)

onMounted(async () => {
  if (!editing && auth.userType === 'EMPRESARIO') {
    const { data: owned } = await http.get<Business[]>('/businesses')
    if (owned.length) {
      await router.replace({ name: 'businesses' })
      return
    }
  }
  const [rubroRes, marketRes, zoneRes] = await Promise.all([
    http.get<Rubro[]>('/rubros'),
    http.get<Market[]>('/markets'),
    http.get<Zone[]>('/zones'),
  ])
  const data = rubroRes.data
  rubros.value = data
  markets.value = marketRes.data
  zones.value = zoneRes.data
  if (!form.value.rubroId && data[0]) form.value.rubroId = data[0].id
  if (!editing) return
  const business = (await http.get<Business>(`/businesses/${route.params.id}`)).data
  pendingApproval.value = Boolean(business.pendingApproval)
  rejected.value = Boolean(business.rejected)
  form.value = {
    legalName: business.legalName,
    commercialName: business.commercialName,
    commercialDescription: business.commercialDescription || '',
    numDoc: business.numDoc,
    docType: business.docType,
    rubroId: business.rubroId,
    categoryId: business.categoryId || 0,
    marketId: business.marketId || 0,
    zoneId: business.zoneId || 0,
  }
  districtId.value = business.zone?.districtId || business.zone?.district?.id || 0
})

function documentError() {
  if (form.value.docType !== 'DNI' && form.value.docType !== 'RUC') return 'El tipo de documento es obligatorio'
  const digits = form.value.numDoc.trim()
  if (!digits) return 'El número de documento es obligatorio'
  if (form.value.docType === 'DNI' && !/^\d{8}$/.test(digits)) return 'El DNI debe tener 8 dígitos'
  if (form.value.docType === 'RUC' && !/^\d{11}$/.test(digits)) return 'El RUC debe tener 11 dígitos'
  return ''
}

async function quitar() {
  error.value = ''
  try {
    const deleted = await dismissRejection('BUSINESS', Number(route.params.id))
    if (deleted) await router.push({ name: 'businesses' })
    else window.location.reload()
  } catch (err) {
    error.value = apiError(err)
  }
}

function discard() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'businesses' })
}

async function submit() {
  error.value = documentError()
  if (!error.value && categories.value.length && !form.value.categoryId) {
    error.value = 'Elige la categoría del negocio'
  }
  if (!error.value && zones.value.length && !form.value.zoneId) {
    error.value = 'Elige la zona del negocio'
  }
  if (error.value) return
  loading.value = true
  try {
    if (editing) {
      await http.patch(`/businesses/${route.params.id}`, form.value)
      await router.push({ name: 'businesses' })
    } else {
      const { data } = await http.post<{ id: number }>('/businesses', form.value)
      await router.push({ name: 'point-form', query: { negocio: data.id } })
    }
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <p class="mode">{{ editing ? 'Modo edición' : 'Registro' }}</p>
    <section class="intro">
      <div>
        <h2>Datos del negocio</h2>
        <p>Completa o actualiza la información comercial de tu empresa en la red.</p>
      </div>
    </section>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
    <RejectionNote :rejected="rejected" @dismiss="quitar" />
    <form class="groups" @submit.prevent="submit">
      <section class="group">
        <h3>Identidad comercial</h3>
        <label class="line">
          <span>Razón social <b>*</b></span>
          <input v-model="form.legalName" required placeholder="Ej. Mi Empresa S.A.C." />
        </label>
        <label class="line">
          <span>Nombre comercial <b>*</b></span>
          <input v-model="form.commercialName" required placeholder="Nombre con el que te conocen" />
        </label>
        <label class="line">
          <span class="split">Descripción comercial <small>Máximo 50 caracteres</small></span>
          <textarea v-model="form.commercialDescription" maxlength="50" required rows="2" placeholder="Resumen breve del negocio"></textarea>
        </label>
      </section>
      <section class="group">
        <h3>Documento de identidad</h3>
        <div class="docs">
          <label class="line">
            <span>Tipo doc. <b>*</b></span>
            <select v-model="form.docType" required>
              <option value="">Elige</option>
              <option value="DNI">DNI</option>
              <option value="RUC">RUC</option>
            </select>
          </label>
          <label class="line">
            <span>Número de doc. <b>*</b></span>
            <input v-model="form.numDoc" inputmode="numeric" maxlength="11" required placeholder="87654321" />
          </label>
        </div>
      </section>
      <section class="group">
        <h3>Rubro y categoría</h3>
        <label class="line">
          <span>Rubro comercial <b>*</b></span>
          <select v-model.number="form.rubroId" required>
            <option v-for="rubro in rubros" :key="rubro.id" :value="rubro.id">{{ rubro.name }}</option>
          </select>
        </label>
        <label v-if="categories.length" class="line">
          <span>Categoría específica <b>*</b></span>
          <select v-model.number="form.categoryId" required>
            <option :value="0">Elige la categoría</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </label>
        <p v-else class="hint">Este rubro todavía no tiene categorías.</p>
      </section>
      <section class="group">
        <h3>Ubicación en el distrito</h3>
        <template v-if="zoneDistricts.length">
          <label class="line">
            <span>Distrito <b>*</b></span>
            <select v-model.number="districtId" required>
              <option :value="0">Elige el distrito</option>
              <option v-for="district in zoneDistricts" :key="district.id" :value="district.id">
                {{ district.name }}<template v-if="district.provinceName"> · {{ district.provinceName }}</template>
              </option>
            </select>
          </label>
          <label class="line">
            <span>Zona o urbanización <b>*</b></span>
            <select v-model.number="form.zoneId" :disabled="!districtId" required>
              <option :value="0">Elige la zona</option>
              <option v-for="zone in zonesOfDistrict" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
            </select>
          </label>
          <label v-if="form.zoneId" class="line">
            <span>Mercado asociado</span>
            <select v-model.number="form.marketId">
              <option :value="0">No pertenece a un mercado</option>
              <option v-for="market in marketsOfZone" :key="market.id" :value="market.id">{{ market.name }}</option>
            </select>
          </label>
          <p v-if="form.zoneId && !marketsOfZone.length" class="hint">Esta zona todavía no tiene mercados. El negocio se publica solo en su rubro.</p>
          <p v-else-if="form.zoneId" class="hint">Si el puesto está dentro de un mercado, selecciónalo. Si no, se publica en su rubro.</p>
        </template>
        <p v-else class="hint">El administrador todavía no registra zonas.</p>
      </section>
      <button class="save" type="submit" :disabled="loading">{{ loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar' }}</button>
      <button class="discard" type="button" @click="discard">Descartar cambios</button>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.mode {
  margin: 0 0 12px;
  text-align: right;
  color: #5c5e65;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.intro,
.group {
  margin-bottom: 12px;
  padding: 16px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.intro h2,
.group h3 {
  margin: 0;
}

.intro h2 {
  font-size: 20px;
  line-height: 26px;
}

.intro p,
.hint,
.line small {
  margin: 4px 0 0;
  color: #5c5e65;
  font-size: 12px;
  font-weight: 500;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group h3 {
  font-size: 16px;
}

.line {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.line span {
  font-size: 12px;
  font-weight: 600;
}

.line .split {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.line b {
  color: var(--color-brand);
}

.line input,
.line select,
.line textarea {
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  font: inherit;
  font-size: 14px;
}

.line textarea {
  min-height: 72px;
  resize: none;
}

.docs {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 10px;
}

.save,
.discard {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  font: inherit;
  cursor: pointer;
}

.save {
  background: var(--color-brand);
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.save:disabled {
  opacity: 0.55;
}

.discard {
  margin-top: 8px;
  background: transparent;
  color: #5c5e65;
  font-size: 14px;
  font-weight: 600;
}
</style>
