<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { GeoItem, Zone } from '../types'

const departments = ref<GeoItem[]>([])
const provinces = ref<GeoItem[]>([])
const districts = ref<GeoItem[]>([])
const zones = ref<Zone[]>([])
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

const provinceOptions = computed(() => provinces.value.filter((item) => item.departmentId === departmentId.value))
const districtOptions = computed(() => districts.value.filter((item) => item.provinceId === provinceId.value))
const filterProvinces = computed(() => provinces.value.filter((item) => item.departmentId === filterDepartmentId.value))
const filterDistricts = computed(() => districts.value.filter((item) => item.provinceId === filterProvinceId.value))
const editingProvinces = computed(() => provinces.value.filter((item) => item.departmentId === editingDepartmentId.value))
const editingDistricts = computed(() => districts.value.filter((item) => item.provinceId === editingProvinceId.value))

watch(departmentId, () => {
  provinceId.value = 0
  districtId.value = 0
})
watch(provinceId, () => {
  districtId.value = 0
})
watch(filterDepartmentId, () => {
  filterProvinceId.value = 0
  filterDistrictId.value = 0
})
watch(filterProvinceId, () => {
  filterDistrictId.value = 0
})
watch(editingDepartmentId, () => {
  if (!editingProvinces.value.some((item) => item.id === editingProvinceId.value)) editingProvinceId.value = 0
})
watch(editingProvinceId, () => {
  if (!editingDistricts.value.some((item) => item.id === editingDistrictId.value)) editingDistrictId.value = 0
})

const visibleZones = computed(() =>
  zones.value.filter((zone) => {
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

function resetFilters() {
  filterDepartmentId.value = 0
  filterProvinceId.value = 0
  filterDistrictId.value = 0
}

function closeForm() {
  showForm.value = false
  name.value = ''
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
        <div class="geo">
          <label>
            <span>Departamento</span>
            <select v-model.number="filterDepartmentId">
              <option :value="0">Todos</option>
              <option v-for="item in departments" :key="item.id" :value="item.id">{{ item.name }}</option>
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
        </div>
      </div>
      <p v-if="!visibleZones.length" class="empty">Todavía no hay zonas.</p>
      <div v-else class="list">
        <article v-for="zone in visibleZones" :key="zone.id">
          <template v-if="editingId === zone.id">
            <label class="line"><span>Nombre de la zona</span><input v-model="editingName" /></label>
            <label class="line">
              <span>Departamento</span>
              <select v-model.number="editingDepartmentId">
                <option v-for="item in departments" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
            <label class="line">
              <span>Provincia</span>
              <select v-model.number="editingProvinceId">
                <option :value="0">Elige la provincia</option>
                <option v-for="item in editingProvinces" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
            <label class="line">
              <span>Distrito</span>
              <select v-model.number="editingDistrictId">
                <option :value="0">Elige el distrito</option>
                <option v-for="item in editingDistricts" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </label>
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
            <p>{{ zone.district?.name || 'Sin distrito' }}<template v-if="zone.district?.province"> · {{ zone.district.province.name }}</template></p>
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
    <button v-if="!showForm" class="add" type="button" @click="showForm = true">+ Registrar nueva zona</button>
    <form v-else class="sheet create" @submit.prevent="addZone">
      <header class="bar">
        <h3>Registrar zona</h3>
        <button class="close" type="button" aria-label="Cerrar" @click="closeForm">×</button>
      </header>
      <div class="create-grid">
        <label class="line">
          <span>Departamento</span>
          <select v-model.number="departmentId" required>
            <option :value="0" disabled>Elige el departamento</option>
            <option v-for="item in departments" :key="item.id" :value="item.id">{{ item.name }}</option>
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
      </div>
      <div class="pair">
        <button class="yes tall" type="submit" :disabled="saving || !districtId || !name.trim()">Aceptar</button>
        <button class="no tall" type="button" @click="closeForm">Cancelar</button>
      </div>
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

  .geo {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
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
