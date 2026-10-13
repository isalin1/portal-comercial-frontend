<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import RejectionNote from '../components/RejectionNote.vue'
import { apiError, http } from '../api'
import { dismissRejection } from '../publication'
import { usePortalAuth } from '../auth'
import { isLimaMetroGeo, type LocationRegion } from '../limaMetro'
import type { Business, PointSale, Zone } from '../types'

const auth = usePortalAuth()
const businesses = ref<Business[]>([])
const zones = ref<Zone[]>([])
const region = ref<LocationRegion | null>(null)
const departmentId = ref(0)
const provinceId = ref(0)
const districtId = ref(0)
const zoneId = ref(0)
const chosenZoneId = ref(0)
const error = ref('')
const pendingDelete = ref<PointSale | null>(null)
const deleting = ref(false)

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

const districts = computed(() => {
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

const zoneOptions = computed(() =>
  regionZones.value
    .filter((zone) => zone.districtId === districtId.value)
    .sort((a, b) => a.name.localeCompare(b.name, 'es')),
)

const isAdmin = computed(() => auth.userType === 'ADMIN')
const needsZoneFilter = computed(() => isAdmin.value)

const chosenZone = computed(() => zones.value.find((zone) => zone.id === chosenZoneId.value) || null)

const filteredBusinesses = computed(() => {
  if (!needsZoneFilter.value) return businesses.value
  if (!chosenZoneId.value) return []
  return businesses.value.filter((business) => business.zoneId === chosenZoneId.value)
})

const showBusinessList = computed(() => {
  if (!businesses.value.length) return false
  if (!needsZoneFilter.value) return true
  return Boolean(chosenZoneId.value)
})

const groupedBusinesses = computed(() => {
  type CategoryGroup = { id: number; name: string; businesses: Business[] }
  type RubroGroup = { id: number; name: string; categories: CategoryGroup[] }
  const rubroMap = new Map<number, RubroGroup>()

  for (const business of filteredBusinesses.value) {
    const rubroId = business.rubroId || business.rubro?.id || 0
    const rubroName = business.rubro?.name || 'Sin rubro'
    let rubro = rubroMap.get(rubroId)
    if (!rubro) {
      rubro = { id: rubroId, name: rubroName, categories: [] }
      rubroMap.set(rubroId, rubro)
    }
    const categoryId = business.categoryId || business.category?.id || 0
    const categoryName = business.category?.name || 'Sin categoría'
    let category = rubro.categories.find((item) => item.id === categoryId)
    if (!category) {
      category = { id: categoryId, name: categoryName, businesses: [] }
      rubro.categories.push(category)
    }
    category.businesses.push(business)
  }

  return [...rubroMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((rubro) => ({
      ...rubro,
      categories: [...rubro.categories].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }))
})

watch(departmentId, () => {
  if (region.value !== 'otros') return
  provinceId.value = 0
  districtId.value = 0
  zoneId.value = 0
})

watch(provinceId, () => {
  if (region.value !== 'otros') return
  districtId.value = 0
  zoneId.value = 0
})

watch(districtId, () => {
  if (!zoneOptions.value.some((zone) => zone.id === zoneId.value)) zoneId.value = 0
})

function setRegion(next: LocationRegion) {
  region.value = next
  departmentId.value = 0
  provinceId.value = 0
  districtId.value = 0
  zoneId.value = 0
}

function applyZoneFilter() {
  if (!zoneId.value) return
  chosenZoneId.value = zoneId.value
}

function changeZone() {
  chosenZoneId.value = 0
  zoneId.value = 0
  districtId.value = 0
  provinceId.value = 0
  departmentId.value = 0
  region.value = null
}

async function load() {
  const businessRes = await http.get<Business[]>('/businesses')
  businesses.value = businessRes.data
  if (!needsZoneFilter.value) return
  const zoneRes = await http.get<Zone[]>('/zones')
  zones.value = zoneRes.data
  if (chosenZoneId.value && !zoneRes.data.some((zone) => zone.id === chosenZoneId.value)) {
    changeZone()
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

async function quitar(scope: string, recordId: number) {
  error.value = ''
  try {
    await dismissRejection(scope, recordId)
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
}

function askDeletePoint(point: PointSale) {
  pendingDelete.value = point
}

function cancelDeletePoint() {
  if (deleting.value) return
  pendingDelete.value = null
}

async function confirmDeletePoint() {
  if (!pendingDelete.value || deleting.value) return
  error.value = ''
  deleting.value = true
  try {
    await http.delete(`/point-sales/${pendingDelete.value.id}`)
    pendingDelete.value = null
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    deleting.value = false
  }
}

function tone(business: Business) {
  if (business.rejected) return 'bad'
  if (business.pendingApproval) return 'wait'
  return 'ok'
}

function label(business: Business) {
  if (business.rejected) return 'Rechazado'
  if (business.pendingApproval) return 'Pendiente'
  return 'Activo'
}

function addressLine(point: PointSale) {
  const address = point.address
  if (!address) return ''
  return [address.street, address.urbanZone, address.district?.name].filter(Boolean).join(', ')
}

function showsProfessionals(business: Business) {
  return /profesional/i.test(business.rubro?.name || '')
}

function agendaHint(business: Business) {
  const plan = business.user?.planCatalog
  if (plan && /anual/i.test(plan.name)) return 'El plan anual deja activos a varios profesionales, hasta el tope del administrador. Quien queda fuera del cupo está inactivo.'
  if (plan?.agenda) return 'El plan semestral deja activo a un profesional en la agenda. Los demás quedan inactivos.'
  return 'Este plan no activa la agenda. Los profesionales quedan inactivos.'
}

function activity(person: { agendaControl: boolean; isActive: boolean }) {
  return person.isActive && person.agendaControl ? 'Activo' : 'Inactivo'
}
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <p v-if="auth.userType === 'EMPRESARIO'" class="pill">Panel Empresario</p>
      <h2>Datos empresa y punto de venta</h2>
    </header>
    <p v-if="error" class="error">{{ error }}</p>

    <template v-else-if="!businesses.length">
      <p class="empty">Todavía no hay un negocio. El primer paso es registrarlo.</p>
      <router-link v-if="auth.userType === 'EMPRESARIO'" class="add" :to="{ name: 'business-form' }">Registrar negocio</router-link>
    </template>

    <template v-else-if="needsZoneFilter && !chosenZone">
      <form class="place-card" @submit.prevent="applyZoneFilter">
        <div class="place-heading">
          <span class="pin" aria-hidden="true" />
          <div>
            <h3>Filtrar por ubicación</h3>
            <p>Elige la zona para ver los negocios</p>
          </div>
        </div>
        <div v-if="!region" class="region-tabs" role="tablist" aria-label="Ámbito de ubicación">
          <button type="button" role="tab" @click="setRegion('lima')">Lima Metropolitana</button>
          <button type="button" role="tab" @click="setRegion('otros')">Otros Dptos.</button>
        </div>
        <template v-else>
          <p class="region-badge">{{ region === 'lima' ? 'Lima Metropolitana' : 'Otros Dptos.' }}</p>
          <p v-if="!regionZones.length" class="muted">
            {{ region === 'lima' ? 'Todavía no hay zonas en Lima Metropolitana.' : 'Todavía no hay zonas en otros departamentos.' }}
          </p>
          <template v-else>
            <template v-if="region === 'otros'">
              <label class="field">
                <span>Departamento</span>
                <select v-model.number="departmentId" required>
                  <option :value="0">Elige el departamento</option>
                  <option v-for="item in departments" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </label>
              <label class="field">
                <span>Provincia</span>
                <select v-model.number="provinceId" required :disabled="!departmentId">
                  <option :value="0">Elige la provincia</option>
                  <option v-for="item in provinces" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </label>
            </template>
            <label class="field">
              <span>Distrito</span>
              <select
                v-model.number="districtId"
                required
                :disabled="region === 'otros' && (!departmentId || !provinceId)"
              >
                <option :value="0">Elige el distrito</option>
                <option v-for="district in districts" :key="district.id" :value="district.id">
                  {{ district.name }}
                  <template v-if="region === 'lima' && district.provinceName"> · {{ district.provinceName }}</template>
                </option>
              </select>
            </label>
            <label class="field">
              <span>Zona</span>
              <select v-model.number="zoneId" required :disabled="!districtId">
                <option :value="0">Elige la zona</option>
                <option v-for="zone in zoneOptions" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
              </select>
            </label>
            <button class="btn accept" type="submit" :disabled="!zoneId">Ver negocios</button>
          </template>
          <button class="change-region" type="button" @click="region = null">Cambiar ámbito</button>
        </template>
      </form>
    </template>

    <template v-else-if="showBusinessList">
      <div v-if="needsZoneFilter && chosenZone" class="zone-bar">
        <span class="zone-pin">
          {{ chosenZone.district?.name || 'Distrito' }} · {{ chosenZone.name }}
        </span>
        <button type="button" @click="changeZone">Cambiar zona</button>
      </div>

      <p v-if="!filteredBusinesses.length" class="empty">
        {{ needsZoneFilter ? 'No hay negocios en esta zona.' : 'Todavía no hay un negocio.' }}
      </p>

      <template v-if="needsZoneFilter">
        <section v-for="rubro in groupedBusinesses" :key="rubro.id" class="rubro-block">
          <header class="rubro-head">
            <h3>{{ rubro.name }}</h3>
            <span>{{ rubro.categories.reduce((sum, item) => sum + item.businesses.length, 0) }}</span>
          </header>

          <div v-for="category in rubro.categories" :key="`${rubro.id}-${category.id}`" class="category-block">
            <h4>{{ category.name }}</h4>
            <article v-for="business in category.businesses" :key="business.id" class="shop">
              <section class="sheet">
                <header>
                  <div>
                    <h3>Datos empresa</h3>
                    <p>Información comercial principal</p>
                  </div>
                  <span :class="tone(business)">{{ label(business) }}</span>
                </header>
                <div class="block">
                  <span>Nombre comercial y descripción</span>
                  <strong>{{ business.commercialName }}</strong>
                  <p v-if="business.commercialDescription">{{ business.commercialDescription }}</p>
                </div>
                <div class="pair">
                  <div class="block">
                    <span>Razón social</span>
                    <strong>{{ business.legalName }}</strong>
                  </div>
                  <div class="block">
                    <span>DNI / RUC</span>
                    <strong>{{ business.numDoc }}</strong>
                  </div>
                </div>
                <div class="block">
                  <span>Rubro de negocio</span>
                  <strong>{{ business.rubro?.name }}</strong>
                </div>
                <div v-if="business.category" class="block">
                  <span>Categoría</span>
                  <strong>{{ business.category.name }}</strong>
                </div>
                <p v-if="business.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
                <RejectionNote :rejected="business.rejected" @dismiss="quitar('BUSINESS', business.id)" />
                <router-link class="edit" :to="{ name: 'business-edit', params: { id: business.id } }">Editar negocio</router-link>
              </section>
              <section v-for="point in business.pointSales || []" :key="point.id" class="sheet">
                <header>
                  <div>
                    <h3>Datos punto de venta</h3>
                    <p>Sede y atención presencial</p>
                  </div>
                </header>
                <div class="block row">
                  <div>
                    <span>Nombre de sede</span>
                    <strong>{{ point.name }}</strong>
                  </div>
                  <b v-if="!point.pendingApproval && !point.rejected" class="ok-mark" aria-hidden="true">✓</b>
                </div>
                <div class="block">
                  <span>Dirección física</span>
                  <strong>{{ addressLine(point) || 'Sin dirección registrada' }}</strong>
                </div>
                <div class="block row">
                  <div>
                    <span>Contacto comercial</span>
                    <strong>{{ point.phone }}</strong>
                  </div>
                  <a v-if="point.phone" class="call" :href="`tel:${point.phone}`" aria-label="Llamar">Llamar</a>
                </div>
                <div v-if="showsProfessionals(business)" class="block pros">
                  <span>Profesionales</span>
                  <p>{{ agendaHint(business) }}</p>
                  <article v-for="person in business.professionals || []" :key="person.id">
                    <div>
                      <strong>{{ person.name }}</strong>
                      <em>{{ person.phone || 'Sin celular' }}</em>
                    </div>
                    <b :class="activity(person) === 'Activo' ? 'on' : 'off'">{{ activity(person) }}</b>
                  </article>
                  <p v-if="!(business.professionals || []).length">Todavía no hay profesionales registrados.</p>
                </div>
                <p v-if="point.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
                <RejectionNote :rejected="point.rejected" @dismiss="quitar('POINT', point.id)" />
                <div class="point-actions">
                  <router-link class="edit" :to="{ name: 'point-edit', params: { id: point.id } }">Editar punto</router-link>
                  <button class="delete" type="button" @click="askDeletePoint(point)">Eliminar punto</button>
                </div>
              </section>
              <p v-if="!(business.pointSales || []).length" class="empty">Este negocio aún no tiene punto de venta.</p>
            </article>
          </div>
        </section>
      </template>

      <template v-else>
        <article v-for="business in filteredBusinesses" :key="business.id" class="shop">
          <section class="sheet">
            <header>
              <div>
                <h3>Datos empresa</h3>
                <p>Información comercial principal</p>
              </div>
              <span :class="tone(business)">{{ label(business) }}</span>
            </header>
            <div class="block">
              <span>Nombre comercial y descripción</span>
              <strong>{{ business.commercialName }}</strong>
              <p v-if="business.commercialDescription">{{ business.commercialDescription }}</p>
            </div>
            <div class="pair">
              <div class="block">
                <span>Razón social</span>
                <strong>{{ business.legalName }}</strong>
              </div>
              <div class="block">
                <span>DNI / RUC</span>
                <strong>{{ business.numDoc }}</strong>
              </div>
            </div>
            <div class="block">
              <span>Rubro de negocio</span>
              <strong>{{ business.rubro?.name }}</strong>
            </div>
            <div v-if="business.category" class="block">
              <span>Categoría</span>
              <strong>{{ business.category.name }}</strong>
            </div>
            <p v-if="business.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
            <RejectionNote :rejected="business.rejected" @dismiss="quitar('BUSINESS', business.id)" />
            <router-link class="edit" :to="{ name: 'business-edit', params: { id: business.id } }">Editar negocio</router-link>
          </section>
          <section v-for="point in business.pointSales || []" :key="point.id" class="sheet">
            <header>
              <div>
                <h3>Datos punto de venta</h3>
                <p>Sede y atención presencial</p>
              </div>
            </header>
            <div class="block row">
              <div>
                <span>Nombre de sede</span>
                <strong>{{ point.name }}</strong>
              </div>
              <b v-if="!point.pendingApproval && !point.rejected" class="ok-mark" aria-hidden="true">✓</b>
            </div>
            <div class="block">
              <span>Dirección física</span>
              <strong>{{ addressLine(point) || 'Sin dirección registrada' }}</strong>
            </div>
            <div class="block row">
              <div>
                <span>Contacto comercial</span>
                <strong>{{ point.phone }}</strong>
              </div>
              <a v-if="point.phone" class="call" :href="`tel:${point.phone}`" aria-label="Llamar">Llamar</a>
            </div>
            <div v-if="showsProfessionals(business)" class="block pros">
              <span>Profesionales</span>
              <p>{{ agendaHint(business) }}</p>
              <article v-for="person in business.professionals || []" :key="person.id">
                <div>
                  <strong>{{ person.name }}</strong>
                  <em>{{ person.phone || 'Sin celular' }}</em>
                </div>
                <b :class="activity(person) === 'Activo' ? 'on' : 'off'">{{ activity(person) }}</b>
              </article>
              <p v-if="!(business.professionals || []).length">Todavía no hay profesionales registrados.</p>
            </div>
            <p v-if="point.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
            <RejectionNote :rejected="point.rejected" @dismiss="quitar('POINT', point.id)" />
            <div class="point-actions">
              <router-link class="edit" :to="{ name: 'point-edit', params: { id: point.id } }">Editar punto</router-link>
            </div>
          </section>
          <p v-if="!(business.pointSales || []).length" class="empty">Este negocio aún no tiene punto de venta.</p>
          <router-link
            class="add"
            :to="{ name: 'point-form', query: { negocio: business.id } }"
          >
            + Registrar punto de venta
          </router-link>
        </article>
        <button class="other" type="button" disabled>Registrar otro negocio</button>
      </template>
    </template>

    <div
      v-if="pendingDelete"
      class="modal-backdrop"
      role="presentation"
      @click.self="cancelDeletePoint"
    >
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-point-title">
        <h3 id="delete-point-title">Eliminar punto de venta</h3>
        <p>
          ¿Confirmas eliminar «{{ pendingDelete.name }}»?
          Se quitarán también sus productos asociados. Esta acción no se puede deshacer.
        </p>
        <div class="modal-actions">
          <button class="yes" type="button" :disabled="deleting" @click="confirmDeletePoint">
            {{ deleting ? 'Eliminando…' : 'Confirmar eliminación' }}
          </button>
          <button class="no" type="button" :disabled="deleting" @click="cancelDeletePoint">Cancelar</button>
        </div>
      </div>
    </div>
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
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.head h2 {
  margin: 0;
  font-size: 16px;
  line-height: 22px;
}

.place-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 18px;
  box-shadow: var(--shadow-soft);
}

.place-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.place-heading h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1e293b;
}

.place-heading p,
.muted {
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
}

.pin {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #ffe4e6 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath fill='%23E21221' d='M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z'/%3E%3C/svg%3E") center / 14px no-repeat;
  flex: 0 0 auto;
}

.region-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
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

.change-region {
  width: 100%;
  margin-top: 10px;
  background: transparent;
  color: var(--color-brand);
  text-decoration: underline;
  min-height: auto;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.field span {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.field select {
  width: 100%;
  min-height: 44px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  color: #1e293b;
}

.btn.accept {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-brand);
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}

.btn.accept:disabled {
  opacity: 0.6;
}

.zone-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.zone-bar button {
  border: 0;
  background: none;
  color: var(--color-brand);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
}

.rubro-block {
  margin-bottom: 20px;
}

.rubro-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.rubro-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.rubro-head span {
  padding: 2px 8px;
  border-radius: 999px;
  background: #fef2f2;
  color: var(--color-brand);
  font-size: 11px;
  font-weight: 800;
}

.category-block {
  margin-bottom: 12px;
}

.category-block > h4 {
  margin: 0 0 8px;
  padding-left: 2px;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.shop {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.sheet {
  padding: 16px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.sheet > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8eefd;
}

.sheet h3 {
  margin: 0;
  font-size: 16px;
}

.sheet header p,
.block > span {
  margin: 0;
  color: #5c5e65;
  font-size: 12px;
}

.sheet header span,
.ok-mark {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.sheet header span.ok,
.ok-mark {
  background: #e5ffeb;
  color: #006740;
}

.sheet header span.wait {
  background: #fff4d6;
  color: #8a5a00;
}

.sheet header span.bad {
  background: var(--color-brand-soft);
  color: var(--color-brand);
}

.block {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f0f3ff;
}

.block strong {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.block p {
  margin: 2px 0 0;
  color: #5c5e65;
  font-size: 12px;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.point-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.edit,
.delete {
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.delete {
  color: #9f1239;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
}

.modal {
  width: min(100%, 360px);
  padding: 18px 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}

.modal h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.modal p {
  margin: 0 0 16px;
  color: #475569;
  font-size: 13px;
  line-height: 1.4;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.modal-actions .yes,
.modal-actions .no {
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.modal-actions .yes {
  background: var(--color-brand);
  color: #fff;
}

.modal-actions .no {
  background: #f1f5f9;
  color: #334155;
}

.modal-actions .yes:disabled,
.modal-actions .no:disabled {
  opacity: 0.6;
  cursor: default;
}

.call {
  flex: none;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-brand-soft);
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.add,
.other {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
}

.add {
  background: var(--color-brand);
  color: #fff;
}

.other {
  background: #dedfe8;
  color: #5c5e65;
}

.pros article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
}

.pros em {
  display: block;
  color: #5c5e65;
  font-size: 12px;
  font-style: normal;
}

.pros b {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.pros b.on {
  background: #e5ffeb;
  color: #006740;
}

.pros b.off {
  background: #e2e8f0;
  color: #475569;
}

.empty {
  margin: 0 0 12px;
  color: #5c5e65;
  text-align: center;
}

@media (min-width: 1024px) {
  .head {
    margin-bottom: 24px;
  }

  .pill {
    font-size: 11px;
    padding: 5px 14px;
  }

  .head h2 {
    font-size: 28px;
    line-height: 34px;
  }

  .place-card {
    max-width: 560px;
  }

  .shop {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 20px;
    align-items: start;
  }

  .sheet {
    padding: 22px 24px;
  }

  .sheet h3 {
    font-size: 18px;
  }

  .sheet header p,
  .block > span {
    font-size: 13px;
  }

  .block strong {
    font-size: 15px;
  }

  .block p {
    font-size: 13px;
  }

  .edit {
    font-size: 13px;
  }

  .shop > .empty,
  .shop > .add {
    grid-column: 1 / -1;
  }

  .add,
  .other {
    max-width: 420px;
    margin-left: auto;
    margin-right: auto;
  }

  .other {
    margin-top: 4px;
  }
}
</style>
