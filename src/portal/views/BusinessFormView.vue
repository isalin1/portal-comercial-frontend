<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import RejectionNote from '../components/RejectionNote.vue'
import { apiError, http } from '../api'
import { dismissRejection } from '../publication'
import { usePortalAuth } from '../auth'
import { isLimaMetroGeo, type LocationRegion } from '../limaMetro'
import type { Business, Market, Rubro, Zone } from '../types'

const route = useRoute()
const router = useRouter()
const auth = usePortalAuth()
const rubros = ref<Rubro[]>([])
const markets = ref<Market[]>([])
const zones = ref<Zone[]>([])
const region = ref<LocationRegion | null>(null)
const departmentId = ref(0)
const provinceId = ref(0)
const districtId = ref(0)
const error = ref('')
const loading = ref(false)
const pendingApproval = ref(false)
const rejected = ref(false)
const imageFile = ref<File | null>(null)
const imageName = ref('')
const currentImage = ref('')
const removeImage = ref(false)
const fileKey = ref(0)
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

const regionZones = computed(() =>
  zones.value.filter((zone) => {
    if (!region.value) return false
    const metro = isLimaMetroGeo(zone)
    return region.value === 'lima' ? metro : !metro
  }),
)

const departments = computed(() => {
  const map = new Map<number, { id: number; name: string }>()
  for (const zone of regionZones.value) {
    const department = zone.district?.province?.department
    if (!department || map.has(department.id)) continue
    map.set(department.id, { id: department.id, name: department.name })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

const provinces = computed(() => {
  const map = new Map<number, { id: number; name: string }>()
  for (const zone of regionZones.value) {
    const province = zone.district?.province
    const department = province?.department
    if (!province || !department || department.id !== departmentId.value || map.has(province.id)) continue
    map.set(province.id, { id: province.id, name: province.name })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

const zoneDistricts = computed(() => {
  const map = new Map<number, { id: number; name: string; provinceName: string }>()
  for (const zone of regionZones.value) {
    const district = zone.district
    const province = district?.province
    const department = province?.department
    if (!district || map.has(district.id)) continue
    if (region.value === 'otros') {
      if (!department || department.id !== departmentId.value) continue
      if (!province || province.id !== provinceId.value) continue
    }
    map.set(district.id, {
      id: district.id,
      name: district.name,
      provinceName: province?.name || '',
    })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

const zonesOfDistrict = computed(() =>
  regionZones.value
    .filter((zone) => zone.districtId === districtId.value)
    .sort((a, b) => a.name.localeCompare(b.name, 'es')),
)

const marketsOfZone = computed(() =>
  markets.value
    .filter((market) => market.zoneId === form.value.zoneId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es')),
)

function setRegion(next: LocationRegion) {
  region.value = next
  departmentId.value = 0
  provinceId.value = 0
  districtId.value = 0
  form.value.zoneId = 0
  form.value.marketId = 0
}

function onImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] || null
  imageFile.value = file
  imageName.value = file?.name || ''
  if (file) {
    currentImage.value = URL.createObjectURL(file)
    removeImage.value = false
  }
}

function clearImage() {
  imageFile.value = null
  imageName.value = ''
  currentImage.value = ''
  removeImage.value = true
  fileKey.value += 1
}

watch(() => form.value.rubroId, () => {
  if (!categories.value.some((category) => category.id === form.value.categoryId)) {
    form.value.categoryId = 0
  }
})

watch(departmentId, () => {
  if (region.value !== 'otros') return
  provinceId.value = 0
  districtId.value = 0
  form.value.zoneId = 0
})

watch(provinceId, () => {
  if (region.value !== 'otros') return
  districtId.value = 0
  form.value.zoneId = 0
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
  currentImage.value = business.imageUrl || ''
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
  if (business.zone) {
    region.value = isLimaMetroGeo(business.zone) ? 'lima' : 'otros'
    departmentId.value = business.zone.district?.province?.department?.id || 0
    provinceId.value = business.zone.district?.provinceId || business.zone.district?.province?.id || 0
  }
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

function appendPayload(body: FormData) {
  body.append('legalName', form.value.legalName.trim())
  body.append('commercialName', form.value.commercialName.trim())
  body.append('commercialDescription', form.value.commercialDescription.trim())
  body.append('numDoc', form.value.numDoc.trim())
  body.append('docType', form.value.docType)
  body.append('rubroId', String(form.value.rubroId))
  body.append('categoryId', String(form.value.categoryId || 0))
  body.append('marketId', String(form.value.marketId || 0))
  body.append('zoneId', String(form.value.zoneId || 0))
}

async function submit() {
  error.value = documentError()
  if (!error.value && categories.value.length && !form.value.categoryId) {
    error.value = 'Elige la categoría del negocio'
  }
  if (!error.value && zones.value.length && !form.value.zoneId) {
    error.value = 'Elige la zona del negocio'
  }
  if (!error.value && !imageFile.value && !currentImage.value) {
    error.value = 'Carga una imagen representativa del negocio'
  }
  if (error.value) return
  loading.value = true
  try {
    if (imageFile.value) {
      const body = new FormData()
      appendPayload(body)
      body.append('image', imageFile.value)
      if (editing) {
        await http.patch(`/businesses/${route.params.id}`, body)
        await router.push({ name: 'businesses' })
      } else {
        const { data } = await http.post<{ id: number }>('/businesses', body)
        await router.push({ name: 'point-form', query: { negocio: data.id } })
      }
    } else if (editing) {
      await http.patch(`/businesses/${route.params.id}`, {
        ...form.value,
        marketId: form.value.marketId || null,
        zoneId: form.value.zoneId || null,
      })
      await router.push({ name: 'businesses' })
    } else {
      const { data } = await http.post<{ id: number }>('/businesses', {
        ...form.value,
        marketId: form.value.marketId || null,
        zoneId: form.value.zoneId || null,
      })
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
  <ScreenFrame storefront back bar fluid>
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
        <div class="identity">
          <div class="identity-fields">
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
          </div>
          <div class="line photo">
            <span>Imagen representativa <b>*</b></span>
            <div class="upload">
              <div class="file">
                <label class="pick">
                  Seleccionar archivo
                  <input :key="fileKey" type="file" accept="image/jpeg,image/png,image/webp" @change="onImage" />
                </label>
                <em>{{ imageName || (currentImage && !removeImage ? 'Foto actual' : 'Ningún archivo seleccionado') }}</em>
              </div>
              <p>Logo o foto del local. Se muestra antes de ver la carta o los productos. JPG o PNG.</p>
              <img v-if="currentImage" :src="currentImage" alt="Imagen del negocio" />
              <button v-if="currentImage" class="quiet" type="button" @click="clearImage">Quitar foto</button>
            </div>
          </div>
        </div>
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
        <div class="pair">
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
        </div>
        <p v-if="!categories.length" class="hint">Este rubro todavía no tiene categorías.</p>
      </section>
      <section class="group">
        <h3>Ubicación en el distrito</h3>
        <div v-if="!region" class="region-tabs" role="tablist" aria-label="Ámbito de ubicación">
          <button type="button" role="tab" @click="setRegion('lima')">Lima Metropolitana</button>
          <button type="button" role="tab" @click="setRegion('otros')">Otros Dptos.</button>
        </div>
        <template v-else-if="zones.length">
          <p class="region-badge">{{ region === 'lima' ? 'Lima Metropolitana' : 'Otros Dptos.' }}</p>
          <p v-if="!regionZones.length" class="hint">
            {{ region === 'lima' ? 'Todavía no hay zonas en Lima Metropolitana.' : 'Todavía no hay zonas en otros departamentos.' }}
          </p>
          <template v-else>
            <div class="place-grid">
              <template v-if="region === 'otros'">
                <label class="line">
                  <span>Departamento <b>*</b></span>
                  <select v-model.number="departmentId" required>
                    <option :value="0">Elige el departamento</option>
                    <option v-for="item in departments" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </label>
                <label class="line">
                  <span>Provincia <b>*</b></span>
                  <select v-model.number="provinceId" required :disabled="!departmentId">
                    <option :value="0">Elige la provincia</option>
                    <option v-for="item in provinces" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </label>
              </template>
              <label class="line">
                <span>Distrito <b>*</b></span>
                <select
                  v-model.number="districtId"
                  required
                  :disabled="region === 'otros' && (!departmentId || !provinceId)"
                >
                  <option :value="0">Elige el distrito</option>
                  <option v-for="district in zoneDistricts" :key="district.id" :value="district.id">
                    {{ district.name }}
                    <template v-if="region === 'lima' && district.provinceName"> · {{ district.provinceName }}</template>
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
            </div>
            <p v-if="form.zoneId && !marketsOfZone.length" class="hint">Esta zona todavía no tiene mercados. El negocio se publica solo en su rubro.</p>
            <p v-else-if="form.zoneId" class="hint">Si el puesto está dentro de un mercado, selecciónalo. Si no, se publica en su rubro.</p>
          </template>
          <button class="change-region" type="button" @click="region = null; departmentId = 0; provinceId = 0; districtId = 0; form.zoneId = 0; form.marketId = 0">Cambiar ámbito</button>
        </template>
        <p v-else class="hint">El administrador todavía no registra zonas.</p>
      </section>
      <div class="actions">
        <button class="save" type="submit" :disabled="loading">{{ loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar' }}</button>
        <button class="discard" type="button" @click="discard">Descartar cambios</button>
      </div>
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

.region-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 4px;
}

.region-tabs button,
.change-region {
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  padding: 8px 10px;
  background: #e8eef5;
  color: #0f172a;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.region-badge {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff5f5;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  outline: 1px solid rgba(226, 18, 33, 0.25);
}

.change-region {
  width: 100%;
  margin-top: 8px;
  min-height: auto;
  background: transparent;
  color: var(--color-brand);
  text-decoration: underline;
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

.identity,
.pair,
.place-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.identity-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.upload {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-card);
  background: #f8fafc;
}

.file {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pick {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.pick input {
  display: none;
}

.file em,
.upload > p {
  color: #64748b;
  font-size: 11px;
  font-style: normal;
}

.file em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload > p {
  margin: 8px 0 0;
}

.upload img {
  display: block;
  width: 100%;
  height: 160px;
  margin-top: 10px;
  object-fit: cover;
  border-radius: 12px;
  background: #e2e8f0;
}

.quiet {
  margin-top: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-brand);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.docs {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 10px;
}

.actions {
  display: flex;
  flex-direction: column;
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

@media (min-width: 1024px) {
  .mode {
    font-size: 11px;
    margin-bottom: 16px;
  }

  .intro {
    margin-bottom: 16px;
    padding: 22px 24px;
  }

  .intro h2 {
    font-size: 28px;
    line-height: 1.2;
  }

  .intro p {
    max-width: 560px;
    font-size: 14px;
    line-height: 20px;
  }

  .groups {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    align-items: start;
  }

  .group {
    margin-bottom: 0;
    padding: 20px 22px;
  }

  .group:first-child,
  .group:last-of-type,
  .actions {
    grid-column: 1 / -1;
  }

  .identity {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
    gap: 20px;
    align-items: start;
  }

  .pair,
  .place-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .docs {
    max-width: 480px;
  }

  .upload img {
    height: 200px;
  }

  .region-tabs {
    max-width: 420px;
  }

  .change-region {
    width: auto;
    align-self: flex-start;
  }

  .actions {
    display: flex;
    flex-direction: row;
    gap: 12px;
    max-width: 520px;
  }

  .save,
  .discard {
    flex: 1;
    margin-top: 0;
  }

  .discard {
    border: 1px solid var(--color-line);
    background: #fff;
  }
}
</style>
