<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { isLimaMetroGeo, isLimaMetropolitana, type LocationRegion } from '../limaMetro'
import type { GeoItem, Zone } from '../types'

const departments = ref<GeoItem[]>([])
const provinces = ref<GeoItem[]>([])
const districts = ref<GeoItem[]>([])
const zones = ref<Zone[]>([])
const region = ref<LocationRegion | null>(null)
const filterRegion = ref<LocationRegion | 'all'>('all')
const editingRegion = ref<LocationRegion>('lima')
const departmentId = ref(0)
const provinceId = ref(0)
const districtId = ref(0)
const filterDepartmentId = ref(0)
const filterProvinceId = ref(0)
const filterDistrictId = ref(0)
const showForm = ref(false)
const name = ref('')
const editingId = ref(0)
const editingName = ref('')
const editingDepartmentId = ref(0)
const editingProvinceId = ref(0)
const editingDistrictId = ref(0)
const confirmId = ref(0)
const error = ref('')
const message = ref('')
const saving = ref(false)

function departmentName(id: number) {
  return departments.value.find((item) => item.id === id)?.name || ''
}

function provinceOf(id: number) {
  return provinces.value.find((item) => item.id === id)
}

function isMetroProvince(province: GeoItem) {
  return isLimaMetropolitana(departmentName(province.departmentId || 0), province.name)
}

function regionDepartments(scope: LocationRegion) {
  return departments.value.filter((department) =>
    provinces.value.some((province) => {
      if (province.departmentId !== department.id) return false
      return scope === 'lima' ? isMetroProvince(province) : !isMetroProvince(province)
    }),
  )
}

function regionProvinces(scope: LocationRegion, departmentIdValue: number) {
  return provinces.value.filter((item) => {
    if (item.departmentId !== departmentIdValue) return false
    return scope === 'lima' ? isMetroProvince(item) : !isMetroProvince(item)
  })
}

function regionDistricts(scope: LocationRegion, provinceIdValue: number) {
  if (scope === 'lima') {
    const metroProvinceIds = new Set(
      provinces.value.filter((item) => isMetroProvince(item)).map((item) => item.id),
    )
    return districts.value
      .filter((item) => metroProvinceIds.has(item.provinceId || 0))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }
  return districts.value.filter((item) => item.provinceId === provinceIdValue)
}

function applyDistrictParents(
  districtIdValue: number,
  target: 'create' | 'edit' | 'filter',
) {
  const district = districts.value.find((item) => item.id === districtIdValue)
  if (!district) return
  const province = provinceOf(district.provinceId || 0)
  if (!province) return
  if (target === 'create') {
    departmentId.value = province.departmentId || 0
    provinceId.value = province.id
  } else if (target === 'edit') {
    editingDepartmentId.value = province.departmentId || 0
    editingProvinceId.value = province.id
  } else {
    filterDepartmentId.value = province.departmentId || 0
    filterProvinceId.value = province.id
  }
}

const departmentOptions = computed(() => (region.value ? regionDepartments(region.value) : []))
const provinceOptions = computed(() =>
  region.value ? regionProvinces(region.value, departmentId.value) : [],
)
const districtOptions = computed(() =>
  region.value ? regionDistricts(region.value, provinceId.value) : [],
)

const filterDepartmentOptions = computed(() =>
  filterRegion.value === 'all' ? departments.value : regionDepartments(filterRegion.value),
)
const filterProvinces = computed(() => {
  if (filterRegion.value === 'all') {
    return provinces.value.filter((item) => item.departmentId === filterDepartmentId.value)
  }
  return regionProvinces(filterRegion.value, filterDepartmentId.value)
})
const filterDistricts = computed(() => {
  if (filterRegion.value === 'all') {
    return districts.value.filter((item) => item.provinceId === filterProvinceId.value)
  }
  return regionDistricts(filterRegion.value, filterProvinceId.value)
})

const editingDepartments = computed(() => regionDepartments(editingRegion.value))
const editingProvinces = computed(() => regionProvinces(editingRegion.value, editingDepartmentId.value))
const editingDistricts = computed(() => regionDistricts(editingRegion.value, editingProvinceId.value))

watch(departmentId, () => {
  if (region.value !== 'otros') return
  provinceId.value = 0
  districtId.value = 0
})
watch(provinceId, () => {
  if (region.value !== 'otros') return
  districtId.value = 0
})
watch(districtId, (id) => {
  if (region.value === 'lima' && id) applyDistrictParents(id, 'create')
})

watch(filterRegion, () => {
  filterDepartmentId.value = 0
  filterProvinceId.value = 0
  filterDistrictId.value = 0
  if (showForm.value) syncCreateRegionFromFilter()
})
watch(filterDepartmentId, () => {
  if (filterRegion.value === 'lima') return
  filterProvinceId.value = 0
  filterDistrictId.value = 0
})
watch(filterProvinceId, () => {
  if (filterRegion.value === 'lima') return
  filterDistrictId.value = 0
})
watch(filterDistrictId, (id) => {
  if (filterRegion.value === 'lima' && id) applyDistrictParents(id, 'filter')
})

watch(editingDepartmentId, () => {
  if (editingRegion.value === 'lima') return
  if (!editingProvinces.value.some((item) => item.id === editingProvinceId.value)) {
    editingProvinceId.value = 0
    editingDistrictId.value = 0
  }
})
watch(editingProvinceId, () => {
  if (editingRegion.value === 'lima') return
  if (!editingDistricts.value.some((item) => item.id === editingDistrictId.value)) {
    editingDistrictId.value = 0
  }
})
watch(editingDistrictId, (id) => {
  if (editingRegion.value === 'lima' && id) applyDistrictParents(id, 'edit')
})

const visibleZones = computed(() =>
  zones.value.filter((zone) => {
    const metro = isLimaMetroGeo(zone)
    if (filterRegion.value === 'lima' && !metro) return false
    if (filterRegion.value === 'otros' && metro) return false
    const district = zone.district
    const province = district?.province
    const department = province?.department
    if (filterDistrictId.value && district?.id !== filterDistrictId.value) return false
    if (filterProvinceId.value && province?.id !== filterProvinceId.value) return false
    if (filterDepartmentId.value && department?.id !== filterDepartmentId.value) return false
    return true
  }),
)

function businessLabel(count = 0) {
  return count === 1 ? '1 negocio' : `${count} negocios`
}

function clearCreateFields() {
  departmentId.value = 0
  provinceId.value = 0
  districtId.value = 0
  name.value = ''
}

function syncCreateRegionFromFilter() {
  if (filterRegion.value === 'lima' || filterRegion.value === 'otros') {
    region.value = filterRegion.value
    clearCreateFields()
    return
  }
  region.value = null
  clearCreateFields()
}

function setRegion(next: LocationRegion) {
  region.value = next
  clearCreateFields()
}

function openCreateForm() {
  showForm.value = true
  editingId.value = 0
  syncCreateRegionFromFilter()
}

function resetFilters() {
  filterRegion.value = 'all'
  filterDepartmentId.value = 0
  filterProvinceId.value = 0
  filterDistrictId.value = 0
}

function closeForm() {
  showForm.value = false
  name.value = ''
  region.value = null
  departmentId.value = 0
  provinceId.value = 0
  districtId.value = 0
}

async function load() {
  const [departmentRes, provinceRes, districtRes, zoneRes] = await Promise.all([
    http.get<GeoItem[]>('/departments'),
    http.get<GeoItem[]>('/provinces'),
    http.get<GeoItem[]>('/districts'),
    http.get<Zone[]>('/zones'),
  ])
  departments.value = departmentRes.data
  provinces.value = provinceRes.data
  districts.value = districtRes.data
  zones.value = zoneRes.data
}

function startEdit(zone: Zone) {
  editingId.value = zone.id
  editingName.value = zone.name
  editingDistrictId.value = zone.districtId
  editingProvinceId.value = zone.district?.provinceId || zone.district?.province?.id || 0
  editingDepartmentId.value = zone.district?.province?.departmentId || zone.district?.province?.department?.id || 0
  editingRegion.value = isLimaMetroGeo(zone) ? 'lima' : 'otros'
  confirmId.value = 0
}

async function addZone() {
  error.value = ''
  message.value = ''
  if (!districtId.value || !name.value.trim()) return
  saving.value = true
  try {
    const { data } = await http.post<Zone>('/zones', { name: name.value.trim(), districtId: districtId.value })
    closeForm()
    if (data.assignedBusinesses) message.value = `Se asignaron ${data.assignedBusinesses} negocios a esta zona.`
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

async function saveZone() {
  error.value = ''
  message.value = ''
  if (!editingName.value.trim() || !editingDistrictId.value) return
  saving.value = true
  try {
    await http.patch(`/zones/${editingId.value}`, { name: editingName.value.trim(), districtId: editingDistrictId.value })
    editingId.value = 0
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

async function removeZone(zone: Zone) {
  error.value = ''
  message.value = ''
  saving.value = true
  try {
    await http.delete(`/zones/${zone.id}`)
    confirmId.value = 0
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Zonas</h2>
      <p>Consulta y gestiona las zonas existentes o registra una nueva zona en el sistema.</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>
    <section class="sheet">
      <header class="bar">
        <h3>Zonas registradas</h3>
        <span>{{ visibleZones.length === 1 ? '1 zona' : `${visibleZones.length} zonas` }}</span>
      </header>
      <div class="finder">
        <div class="finder-head">
          <strong>Filtrar zonas</strong>
          <button type="button" @click="resetFilters">Restablecer</button>
        </div>
        <div class="region-tabs" role="tablist" aria-label="Ámbito de filtro">
          <button type="button" role="tab" :class="{ on: filterRegion === 'all' }" :aria-selected="filterRegion === 'all'" @click="filterRegion = 'all'">
            Todas
          </button>
          <button type="button" role="tab" :class="{ on: filterRegion === 'lima' }" :aria-selected="filterRegion === 'lima'" @click="filterRegion = 'lima'">
            Lima Metropolitana
          </button>
          <button type="button" role="tab" :class="{ on: filterRegion === 'otros' }" :aria-selected="filterRegion === 'otros'" @click="filterRegion = 'otros'">
            Otros Dptos.
          </button>
        </div>
        <div class="geo" :class="{ lima: filterRegion === 'lima' }">
          <template v-if="filterRegion === 'lima'">
            <label>
              <span>Distrito</span>
              <select v-model.number="filterDistrictId">
                <option :value="0">Todos</option>
                <option v-for="item in filterDistricts" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
          </template>
          <template v-else>
            <label>
              <span>Departamento</span>
              <select v-model.number="filterDepartmentId">
                <option :value="0">Todos</option>
                <option v-for="item in filterDepartmentOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
            <label>
              <span>Provincia</span>
              <select v-model.number="filterProvinceId" :disabled="!filterDepartmentId">
                <option :value="0">Todas</option>
                <option v-for="item in filterProvinces" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
            <label>
              <span>Distrito</span>
              <select v-model.number="filterDistrictId" :disabled="!filterProvinceId">
                <option :value="0">Todos</option>
                <option v-for="item in filterDistricts" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
          </template>
        </div>
      </div>
      <p v-if="!visibleZones.length" class="empty">Todavía no hay zonas.</p>
      <div v-else class="list">
        <article v-for="zone in visibleZones" :key="zone.id">
          <template v-if="editingId === zone.id">
            <p class="region-badge">{{ editingRegion === 'lima' ? 'Lima Metropolitana' : 'Otros Dptos.' }}</p>
            <label class="line"><span>Nombre de la zona</span><input v-model="editingName" /></label>
            <template v-if="editingRegion === 'lima'">
              <label class="line">
                <span>Distrito</span>
                <select v-model.number="editingDistrictId">
                  <option :value="0">Elige el distrito</option>
                  <option v-for="item in editingDistricts" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </label>
            </template>
            <template v-else>
              <label class="line">
                <span>Departamento</span>
                <select v-model.number="editingDepartmentId">
                  <option :value="0">Elige el departamento</option>
                  <option v-for="item in editingDepartments" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </label>
              <label class="line">
                <span>Provincia</span>
                <select v-model.number="editingProvinceId" :disabled="!editingDepartmentId">
                  <option :value="0">Elige la provincia</option>
                  <option v-for="item in editingProvinces" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </label>
              <label class="line">
                <span>Distrito</span>
                <select v-model.number="editingDistrictId" :disabled="!editingProvinceId">
                  <option :value="0">Elige el distrito</option>
                  <option v-for="item in editingDistricts" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </label>
            </template>
            <div class="pair">
              <button class="yes" type="button" :disabled="saving" @click="saveZone">Guardar</button>
              <button class="no" type="button" :disabled="saving" @click="editingId = 0">Cancelar</button>
            </div>
          </template>
          <template v-else>
            <div class="title">
              <h4>{{ zone.name }}</h4>
              <em>{{ businessLabel(zone.businessCount) }}</em>
            </div>
            <p>
              {{ zone.district?.name || 'Sin distrito' }}
              <template v-if="zone.district?.province"> · {{ zone.district.province.name }}</template>
              <template v-if="zone.district?.province?.department"> · {{ zone.district.province.department.name }}</template>
            </p>
            <div class="pair">
              <button class="yes" type="button" @click="startEdit(zone)">Editar</button>
              <button class="no" type="button" @click="confirmId = zone.id">Eliminar</button>
            </div>
            <div v-if="confirmId === zone.id" class="warn">
              <p>¿Eliminar esta zona?</p>
              <div class="pair">
                <button class="yes" type="button" :disabled="saving" @click="removeZone(zone)">Confirmar</button>
                <button class="no" type="button" :disabled="saving" @click="confirmId = 0">Desistir</button>
              </div>
            </div>
          </template>
        </article>
      </div>
    </section>
    <button v-if="!showForm" class="add" type="button" @click="openCreateForm">+ Registrar nueva zona</button>
    <form v-else class="sheet create" @submit.prevent="addZone">
      <header class="bar">
        <h3>Registrar zona</h3>
        <button class="close" type="button" aria-label="Cerrar" @click="closeForm">×</button>
      </header>
      <div v-if="!region" class="region-tabs" role="tablist" aria-label="Ámbito de ubicación">
        <button type="button" role="tab" @click="setRegion('lima')">Lima Metropolitana</button>
        <button type="button" role="tab" @click="setRegion('otros')">Otros Dptos.</button>
      </div>
      <template v-else>
        <p class="region-badge">{{ region === 'lima' ? 'Lima Metropolitana' : 'Otros Dptos.' }}</p>
        <div class="create-grid">
          <template v-if="region === 'lima'">
            <label class="line">
              <span>Distrito</span>
              <select v-model.number="districtId" required>
                <option :value="0" disabled>Elige el distrito</option>
                <option v-for="item in districtOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
            <label class="line">
              <span>Nombre de la zona</span>
              <input v-model="name" required placeholder="Nombre de la zona" />
            </label>
          </template>
          <template v-else>
            <label class="line">
              <span>Departamento</span>
              <select v-model.number="departmentId" required>
                <option :value="0" disabled>Elige el departamento</option>
                <option v-for="item in departmentOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
            <label class="line">
              <span>Provincia</span>
              <select v-model.number="provinceId" :disabled="!departmentId" required>
                <option :value="0" disabled>Elige la provincia</option>
                <option v-for="item in provinceOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
            <label class="line">
              <span>Distrito</span>
              <select v-model.number="districtId" :disabled="!provinceId" required>
                <option :value="0" disabled>Elige el distrito</option>
                <option v-for="item in districtOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
            <label class="line">
              <span>Nombre de la zona</span>
              <input v-model="name" required placeholder="Nombre de la zona" />
            </label>
          </template>
        </div>
        <div class="pair">
          <button class="yes tall" type="submit" :disabled="saving || !districtId || !name.trim()">Aceptar</button>
          <button class="no tall" type="button" @click="closeForm">Cancelar</button>
        </div>
      </template>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 16px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; }
.head p { margin: 6px auto 0; max-width: 280px; color: #64748b; font-size: 12px; line-height: 1.4; }
.sheet {
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.bar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
.bar h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
.bar h3::before { content: ''; width: 4px; height: 14px; border-radius: 99px; background: var(--color-brand); }
.bar span { margin-left: auto; padding: 2px 8px; border-radius: 999px; background: #e2e8f0; color: #334155; font-size: 10px; font-weight: 800; }
.close { margin-left: auto; width: 28px; height: 28px; border: 0; border-radius: 8px; background: #f1f5f9; color: #64748b; font: inherit; font-size: 18px; }
.finder { display: block; margin-bottom: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.finder-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.finder-head strong { font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }
.finder-head button { border: 0; background: transparent; color: var(--color-brand); font: inherit; font-size: 11px; font-weight: 700; }
.region-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.finder .region-tabs {
  grid-template-columns: 1fr 1fr 1fr;
}
.region-tabs button {
  min-height: 40px;
  border: 0;
  border-radius: 12px;
  padding: 8px 10px;
  background: #e8eef5;
  color: #0f172a;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.region-tabs button.on {
  background: #fff;
  color: var(--color-brand);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
  outline: 1px solid rgba(226, 18, 33, 0.25);
}
.region-badge {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
  outline: 1px solid rgba(226, 18, 33, 0.25);
}
.geo { display: flex; flex-direction: column; gap: 10px; }
.line, .geo label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.geo label { margin-bottom: 0; }
.line span, .geo span { color: #64748b; font-size: 11px; font-weight: 700; }
.line input, .line select, .geo select {
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
}
.geo select { min-height: 44px; }
.sheet article { margin-bottom: 8px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.title { display: flex; align-items: center; gap: 8px; }
.sheet h4 { margin: 0; font-size: 14px; }
.title em { font-style: normal; color: var(--color-brand); font-size: 11px; font-weight: 800; white-space: nowrap; }
.sheet article > p { margin: 4px 0 10px; color: #94a3b8; font-size: 11px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.yes, .no, .add {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border: 0;
  border-radius: 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}
.yes { background: var(--color-brand); color: #fff; }
.no { background: #f1f5f9; color: #334155; }
.yes.tall, .no.tall { min-height: 44px; }
.yes:disabled, .no:disabled { opacity: 0.6; }
.add { width: 100%; min-height: 48px; border-radius: 12px; background: var(--color-brand); color: #fff; }
.empty { margin: 0; color: #64748b; font-size: 13px; }
.warn { margin-top: 8px; color: #9f1239; font-size: 12px; }
.warn p { margin: 0 0 8px; }

.list,
.create-grid {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 24px;
  }

  .head h2 {
    font-size: 32px;
    line-height: 1.2;
  }

  .head p {
    max-width: 520px;
    margin-top: 10px;
    font-size: 15px;
    line-height: 22px;
  }

  .sheet {
    padding: 20px 22px;
    margin-bottom: 18px;
  }

  .bar h3 {
    font-size: 13px;
  }

  .finder {
    padding: 14px 16px;
    margin-bottom: 16px;
  }

  .finder-head strong,
  .finder-head button {
    font-size: 12px;
  }

  .geo:not(.lima) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .geo.lima {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    max-width: 320px;
  }

  .geo select {
    min-height: 48px;
    font-size: 13px;
  }

  .list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .sheet article {
    margin-bottom: 0;
    padding: 16px 18px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .sheet h4 {
    font-size: 16px;
  }

  .title em {
    font-size: 12px;
  }

  .sheet article > p {
    font-size: 13px;
    flex: 1;
  }

  .yes,
  .no {
    min-height: 40px;
    font-size: 13px;
  }

  .add {
    max-width: 360px;
    min-height: 52px;
    font-size: 14px;
  }

  .create {
    max-width: 720px;
  }

  .create-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 14px;
  }

  .create-grid .line {
    margin-bottom: 0;
  }

  .create .pair {
    max-width: 360px;
    margin-top: 16px;
  }

  .empty {
    font-size: 14px;
  }
}
</style>
