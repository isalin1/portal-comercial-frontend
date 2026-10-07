<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { Market, Rubro, Unit, Zone } from '../types'

const router = useRouter()
const rubros = ref<Rubro[]>([])
const units = ref<Unit[]>([])
const markets = ref<Market[]>([])
const zones = ref<Zone[]>([])
const marketName = ref('')
const marketDistrictId = ref(0)
const marketZoneId = ref(0)
const marketImage = ref<File | null>(null)
const marketImageKey = ref(0)
const editingMarketId = ref(0)
const editingMarketName = ref('')
const editingMarketDistrictId = ref(0)
const editingMarketZoneId = ref(0)
const editingMarketImage = ref<File | null>(null)
const editingMarketPreview = ref('')
const editingRemoveImage = ref(false)
const editingImageKey = ref(0)
const confirmMarketId = ref(0)
const showMarketForm = ref(false)
const showUnitForm = ref(false)
const unitName = ref('')
const error = ref('')
const pendingDelete = ref<{ id: number; name: string } | null>(null)
const pendingRubroId = ref(0)
const saving = ref(false)

const zoneDistricts = computed(() => {
  const map = new Map<number, { id: number; name: string; provinceName: string }>()
  for (const zone of zones.value) {
    const district = zone.district
    if (!district || map.has(district.id)) continue
    map.set(district.id, { id: district.id, name: district.name, provinceName: district.province?.name || '' })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
})

function zonesOf(districtId: number) {
  return zones.value.filter((zone) => zone.districtId === districtId).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

async function load() {
  const [rubroRes, unitRes, marketRes, zoneRes] = await Promise.all([
    http.get<Rubro[]>('/rubros'),
    http.get<Unit[]>('/units'),
    http.get<Market[]>('/markets'),
    http.get<Zone[]>('/zones'),
  ])
  rubros.value = rubroRes.data
  units.value = unitRes.data
  markets.value = marketRes.data
  zones.value = zoneRes.data
}

function onMarketImage(event: Event, editing: boolean) {
  const file = (event.target as HTMLInputElement).files?.[0] || null
  if (editing) {
    editingMarketImage.value = file
    editingRemoveImage.value = false
    if (file) editingMarketPreview.value = URL.createObjectURL(file)
    return
  }
  marketImage.value = file
}

function clearMarketPhoto() {
  editingMarketImage.value = null
  editingMarketPreview.value = ''
  editingRemoveImage.value = true
  editingImageKey.value += 1
}

async function addMarket() {
  if (!marketName.value.trim() || !marketZoneId.value) return
  error.value = ''
  saving.value = true
  try {
    const body = new FormData()
    body.append('name', marketName.value.trim())
    body.append('zoneId', String(marketZoneId.value))
    if (marketImage.value) body.append('image', marketImage.value)
    await http.post('/markets', body)
    marketName.value = ''
    marketDistrictId.value = 0
    marketZoneId.value = 0
    marketImage.value = null
    marketImageKey.value += 1
    showMarketForm.value = false
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

function startMarketEdit(market: Market) {
  editingMarketId.value = market.id
  editingMarketName.value = market.name
  editingMarketDistrictId.value = market.zone?.districtId || market.zone?.district?.id || 0
  editingMarketZoneId.value = market.zoneId || 0
  editingMarketImage.value = null
  editingMarketPreview.value = market.imageUrl || ''
  editingRemoveImage.value = false
  editingImageKey.value += 1
  confirmMarketId.value = 0
}

async function saveMarket() {
  if (!editingMarketName.value.trim() || !editingMarketZoneId.value) return
  error.value = ''
  saving.value = true
  try {
    const body = new FormData()
    body.append('name', editingMarketName.value.trim())
    body.append('zoneId', String(editingMarketZoneId.value))
    if (editingMarketImage.value) body.append('image', editingMarketImage.value)
    if (editingRemoveImage.value) body.append('removeImage', 'true')
    await http.patch(`/markets/${editingMarketId.value}`, body)
    editingMarketId.value = 0
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

async function removeMarket(market: Market) {
  error.value = ''
  saving.value = true
  try {
    await http.delete(`/markets/${market.id}`)
    confirmMarketId.value = 0
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

async function addUnit() {
  if (!unitName.value.trim()) return
  error.value = ''
  saving.value = true
  try {
    await http.post('/units', { name: unitName.value.trim() })
    unitName.value = ''
    showUnitForm.value = false
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

async function removeUnit(unit: Unit) {
  error.value = ''
  saving.value = true
  try {
    await http.delete(`/units/${unit.id}`)
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

async function removeRubro(id: number) {
  error.value = ''
  saving.value = true
  try {
    await http.delete(`/rubros/${id}`)
    pendingRubroId.value = 0
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

async function removeCategory() {
  if (!pendingDelete.value) return
  error.value = ''
  saving.value = true
  try {
    await http.delete(`/categories/${pendingDelete.value.id}`)
    pendingDelete.value = null
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Rubros y Categorías</h2>
      <p>Administración centralizada de rubros comerciales, categorías y mercados asignados.</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="pendingDelete" class="warn">
      <p>Eliminar la categoría «{{ pendingDelete.name }}». Si tiene productos, también se eliminan.</p>
      <div class="pair">
        <button class="yes" type="button" :disabled="saving" @click="removeCategory">Eliminar</button>
        <button class="no" type="button" :disabled="saving" @click="pendingDelete = null">Cancelar</button>
      </div>
    </div>
    <section v-for="rubro in rubros" :key="rubro.id" class="group">
      <header class="rubro-head">
        <h3>{{ rubro.name }}</h3>
        <div class="actions">
          <router-link class="yes" :to="{ name: 'rubro-edit', params: { id: rubro.id } }">Editar</router-link>
          <button class="no" type="button" @click="pendingRubroId = rubro.id">Eliminar</button>
          <router-link class="yes" :to="{ name: 'category-form', query: { rubro: rubro.id } }">Agregar categoría</router-link>
        </div>
      </header>
      <div v-if="pendingRubroId === rubro.id" class="warn">
        <p>Eliminar el rubro «{{ rubro.name }}». Si tiene categorías, también se eliminan.</p>
        <div class="pair">
          <button class="yes" type="button" :disabled="saving" @click="removeRubro(rubro.id)">Eliminar</button>
          <button class="no" type="button" :disabled="saving" @click="pendingRubroId = 0">Cancelar</button>
        </div>
      </div>
      <p v-if="!(rubro.categories || []).length" class="empty">Este rubro no tiene categorías.</p>
      <div v-else class="tiles">
        <article v-for="category in rubro.categories || []" :key="category.id">
          <img v-if="category.imageUrl" :src="category.imageUrl" :alt="category.name" />
          <div v-else class="blank" />
          <h4>{{ category.name }}</h4>
          <div class="pair">
            <button class="yes" type="button" @click="router.push({ name: 'category-edit', params: { id: category.id } })">Editar</button>
            <button class="no" type="button" @click="pendingDelete = category">Eliminar</button>
          </div>
        </article>
      </div>
    </section>
    <p v-if="!rubros.length" class="empty">No hay rubros registrados.</p>
    <router-link class="add" :to="{ name: 'rubro-form' }">Agregar rubro</router-link>
    <section class="group">
      <header class="stack">
        <h3>Mercados y Zonas Comerciales</h3>
        <p>Cada mercado pertenece a una zona. El empresario lo elige después de elegir el distrito y la zona.</p>
      </header>
      <p v-if="!markets.length" class="empty">Todavía no hay mercados.</p>
      <div v-else class="markets">
        <article v-for="market in markets" :key="market.id" class="market">
          <template v-if="editingMarketId === market.id">
            <label class="line"><span>Nombre del mercado</span><input v-model="editingMarketName" /></label>
            <label class="line">
              <span>Distrito</span>
              <select v-model.number="editingMarketDistrictId" @change="editingMarketZoneId = 0">
                <option :value="0">Elige el distrito</option>
                <option v-for="district in zoneDistricts" :key="district.id" :value="district.id">
                  {{ district.name }}<template v-if="district.provinceName"> · {{ district.provinceName }}</template>
                </option>
              </select>
            </label>
            <label class="line">
              <span>Zona</span>
              <select v-model.number="editingMarketZoneId" :disabled="!editingMarketDistrictId">
                <option :value="0">Elige la zona</option>
                <option v-for="zone in zonesOf(editingMarketDistrictId)" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
              </select>
            </label>
            <img v-if="editingMarketPreview" :src="editingMarketPreview" :alt="editingMarketName" class="cover" />
            <label class="line">
              <span>Imagen</span>
              <input :key="editingImageKey" type="file" accept="image/jpeg,image/png,image/webp" @change="onMarketImage($event, true)" />
            </label>
            <button v-if="editingMarketPreview" class="no wide" type="button" @click="clearMarketPhoto">Quitar foto</button>
            <div class="pair">
              <button class="yes" type="button" :disabled="saving" @click="saveMarket">Guardar</button>
              <button class="no" type="button" :disabled="saving" @click="editingMarketId = 0">Cancelar</button>
            </div>
          </template>
          <template v-else>
            <div class="shot">
              <img v-if="market.imageUrl" :src="market.imageUrl" :alt="market.name" />
              <div v-else class="blank tall" />
              <span v-if="!market.zone">Sin zona</span>
            </div>
            <h4>{{ market.name }}</h4>
            <p v-if="market.zone">{{ market.zone.name }}<template v-if="market.zone.district?.name"> · {{ market.zone.district.name }}</template></p>
            <div class="pair">
              <button class="yes" type="button" @click="startMarketEdit(market)">Editar</button>
              <button class="no" type="button" @click="confirmMarketId = market.id">Eliminar</button>
            </div>
            <div v-if="confirmMarketId === market.id" class="warn">
              <p>¿Eliminar este mercado? Los negocios quedan sin mercado.</p>
              <div class="pair">
                <button class="yes" type="button" :disabled="saving" @click="removeMarket(market)">Confirmar</button>
                <button class="no" type="button" :disabled="saving" @click="confirmMarketId = 0">Desistir</button>
              </div>
            </div>
          </template>
        </article>
      </div>
      <button v-if="!showMarketForm" class="add soft" type="button" @click="showMarketForm = true">Agregar mercado</button>
      <div v-else class="form">
        <label class="line"><span>Nuevo mercado</span><input v-model="marketName" placeholder="Nombre del mercado" /></label>
        <label class="line">
          <span>Distrito</span>
          <select v-model.number="marketDistrictId" @change="marketZoneId = 0">
            <option :value="0">Elige el distrito</option>
            <option v-for="district in zoneDistricts" :key="district.id" :value="district.id">
              {{ district.name }}<template v-if="district.provinceName"> · {{ district.provinceName }}</template>
            </option>
          </select>
        </label>
        <label class="line">
          <span>Zona</span>
          <select v-model.number="marketZoneId" :disabled="!marketDistrictId">
            <option :value="0">Elige la zona</option>
            <option v-for="zone in zonesOf(marketDistrictId)" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
          </select>
        </label>
        <label class="line">
          <span>Imagen</span>
          <input :key="marketImageKey" type="file" accept="image/jpeg,image/png,image/webp" @change="onMarketImage($event, false)" />
        </label>
        <div class="pair">
          <button class="yes" type="button" :disabled="saving || !marketName.trim() || !marketZoneId" @click="addMarket">Guardar</button>
          <button class="no" type="button" @click="showMarketForm = false">Cancelar</button>
        </div>
      </div>
    </section>
    <section class="group">
      <header class="stack">
        <h3>Unidades</h3>
        <p>Sirven para cualquier categoría. El empresario elige una al registrar la variante.</p>
      </header>
      <div v-if="units.length" class="units">
        <article v-for="unit in units" :key="unit.id" class="unit">
          <strong>{{ unit.name }}</strong>
          <button class="no" type="button" :disabled="saving" @click="removeUnit(unit)">Eliminar</button>
        </article>
      </div>
      <button v-if="!showUnitForm" class="add" type="button" @click="showUnitForm = true">Agregar unidad</button>
      <form v-else @submit.prevent="addUnit">
        <label class="line"><span>Nueva unidad</span><input v-model="unitName" placeholder="Kg, Unidad, Litro" /></label>
        <button class="add" type="submit" :disabled="saving || !unitName.trim()">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
        <button class="drop" type="button" @click="showUnitForm = false; unitName = ''">Cancelar</button>
      </form>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 16px; text-align: center; }
.head h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.head p { margin: 6px 0 0; color: #64748b; font-size: 12px; line-height: 1.4; }
.group {
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.group > header, .unit { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.group > header { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
.group > header.rubro-head { display: block; }
.actions { display: grid; grid-template-columns: 1fr 1fr 1.45fr; gap: 6px; margin-top: 8px; }
.actions .yes, .actions .no { margin-top: 0; }
.group h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.group h3::before { content: ''; width: 4px; height: 14px; border-radius: 99px; background: var(--color-brand); }
.stack { display: block; }
.stack h3 { margin-bottom: 4px; }
.stack p, .empty, .market > p { margin: 0; color: #64748b; font-size: 12px; line-height: 1.4; }
.empty { margin-bottom: 8px; }
.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tiles article, .market {
  min-width: 0;
  padding: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}
.market { margin-bottom: 10px; padding: 10px; }
.tiles img, .blank, .cover, .shot img {
  display: block;
  width: 100%;
  height: 96px;
  object-fit: cover;
  border-radius: 8px;
  background: #e2e8f0;
}
.shot { position: relative; }
.shot img, .blank.tall { height: 140px; }
.shot span {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.8);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.tiles h4, .market h4 { margin: 8px 4px 0; font-size: 12px; line-height: 1.3; text-align: center; }
.market h4 { text-align: left; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.yes, .no, .add {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}
.yes { background: var(--color-brand); color: #fff; }
.no { background: #e2e8f0; color: #334155; }
.yes:disabled, .no:disabled, .add:disabled { opacity: 0.6; }
.add {
  width: 100%;
  min-height: 44px;
  margin-bottom: 8px;
  border-radius: 12px;
  background: var(--color-brand);
  color: #fff;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.add.ghost { border: 2px solid var(--color-brand); background: #fff; color: var(--color-brand); }
.add.soft { background: #f1f5f9; color: #334155; }
.drop {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 36px;
  border: 0;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}
.unit { margin-bottom: 8px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
.unit .no { min-width: 84px; }
.line { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.line span { font-size: 12px; font-weight: 700; }
.line input, .line select {
  width: 100%;
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  font: inherit;
  font-size: 13px;
}
.warn { margin-bottom: 10px; padding: 10px; border-radius: 12px; background: #fff5f5; color: #9f1239; font-size: 12px; }
.warn p { margin: 0; }
.no.wide { width: 100%; margin-bottom: 8px; }

.markets,
.units {
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
    max-width: 560px;
    margin: 10px auto 0;
    font-size: 15px;
    line-height: 22px;
  }

  .group {
    margin-bottom: 18px;
    padding: 20px 22px;
  }

  .group > header.rubro-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .group h3 {
    font-size: 13px;
  }

  .actions {
    margin-top: 0;
    grid-template-columns: auto auto auto;
    flex: none;
  }

  .actions .yes,
  .actions .no {
    min-height: 40px;
    padding: 0 14px;
    font-size: 12px;
  }

  .tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .tiles article {
    padding: 10px;
  }

  .tiles img,
  .blank {
    height: 120px;
  }

  .tiles h4 {
    margin: 10px 4px 0;
    font-size: 14px;
  }

  .yes,
  .no {
    min-height: 36px;
    font-size: 12px;
  }

  .add {
    max-width: 320px;
    min-height: 48px;
    font-size: 13px;
  }

  .markets {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 12px;
  }

  .market {
    margin-bottom: 0;
    height: 100%;
  }

  .market h4 {
    font-size: 15px;
  }

  .stack p,
  .empty,
  .market > p {
    font-size: 13px;
  }

  .units {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }

  .unit {
    margin-bottom: 0;
  }

  .form {
    max-width: 560px;
  }
}
</style>
