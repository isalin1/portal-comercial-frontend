<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import RejectionNote from '../components/RejectionNote.vue'
import { apiError, http } from '../api'
import { dismissRejection } from '../publication'
import { usePortalAuth } from '../auth'
import type { Business, Category, Item, PointSale, Unit } from '../types'

const route = useRoute()
const router = useRouter()
const auth = usePortalAuth()
const editing = Boolean(route.params.id)
const error = ref('')
const loading = ref(false)
const points = ref<PointSale[]>([])
const businesses = ref<Business[]>([])
const categories = ref<Category[]>([])
const units = ref<Unit[]>([])
const offers = ref<{ id: number; name: string; price: string | number }[]>([])
const imageFile = ref<File | null>(null)
const currentImage = ref('')
const imageName = ref('')
const removeImage = ref(false)
const fileKey = ref(0)
const pendingApproval = ref(false)
const rejected = ref(false)
const form = ref({
  name: '',
  pointSaleId: 0,
  categoryId: 0,
  isActive: true,
  kind: 'CARTA' as 'CARTA' | 'MENU',
  menuPart: '' as '' | 'ENTRADA' | 'SEGUNDO' | 'REFRESCO',
  menuOfferId: 0,
  menuOfferIds: [] as number[],
  descriptions: [{ id: undefined as number | undefined, description: '', price: 0, unitId: 0 }],
})

const offerBusinessId = computed(() => points.value.find((point) => point.id === form.value.pointSaleId)?.businessId || 0)

watch(offerBusinessId, async (id) => {
  if (!id) {
    offers.value = []
    return
  }
  try {
    const { data } = await http.get<{ id: number; name: string; price: string | number }[]>('/pedidos/ofertas', { params: { businessId: id } })
    offers.value = data
  } catch (err) {
    error.value = apiError(err)
  }
})

onMounted(async () => {
  const [pointRes, categoryRes, businessRes, unitRes] = await Promise.all([
    http.get<PointSale[]>('/point-sales'),
    http.get<Category[]>('/categories'),
    http.get<Business[]>('/businesses'),
    http.get<Unit[]>('/units'),
  ])
  points.value = pointRes.data
  businesses.value = businessRes.data
  units.value = unitRes.data
  const rubroIds = new Set(businessRes.data.map((business) => business.rubroId))
  categories.value = auth.userType === 'EMPRESARIO'
    ? categoryRes.data.filter((category) => rubroIds.has(category.rubroId))
    : categoryRes.data
  const requestedCategory = Number(route.query.categoria)
  if (!form.value.pointSaleId && points.value[0]) form.value.pointSaleId = points.value[0].id
  if (!editing && units.value[0]) form.value.descriptions[0].unitId = units.value[0].id
  if (requestedCategory) form.value.categoryId = requestedCategory
  else if (!form.value.categoryId && categories.value[0]) form.value.categoryId = categories.value[0].id
  if (!editing && route.query.tipo === 'menu') form.value.kind = 'MENU'
  if (!editing && route.query.tipo === 'carta') form.value.kind = 'CARTA'
  if (!editing) return
  const item = (await http.get<Item>(`/items/${route.params.id}`)).data
  form.value = {
    name: item.name,
    pointSaleId: item.pointSaleId,
    categoryId: item.categoryId,
    isActive: item.isActive,
    kind: item.kind || 'CARTA',
    menuPart: item.menuPart || '',
    menuOfferId: item.menuOfferId || item.menuOfferIds?.[0] || 0,
    menuOfferIds: item.menuOfferIds?.length ? [...item.menuOfferIds] : item.menuOfferId ? [item.menuOfferId] : [],
    descriptions: item.descriptions.length
      ? item.descriptions.map((line) => ({
          id: line.id,
          description: line.description,
          price: Number(line.price),
          unitId: line.unitId,
        }))
      : [{ id: undefined, description: '', price: 0, unitId: units.value[0]?.id || 0 }],
  }
  pendingApproval.value = Boolean(item.pendingApproval)
  rejected.value = Boolean(item.rejected)
  currentImage.value = item.imageUrl || ''
  removeImage.value = false
})

const selectedBusiness = computed(() => {
  const point = points.value.find((item) => item.id === form.value.pointSaleId)
  return businesses.value.find((business) => business.id === point?.businessId)
})
const lockedCategoryId = computed(() => {
  const business = selectedBusiness.value
  if (auth.userType !== 'EMPRESARIO' || !/profesional|alimento|comercio|servicio/i.test(business?.rubro?.name || '')) return 0
  return business?.categoryId || -1
})
const selectedCategory = computed(() => categories.value.find((category) => category.id === form.value.categoryId))
const menuCategory = computed(() => /comida criolla|men[uú]/i.test(selectedCategory.value?.name || ''))
const plateChip = computed(() => {
  const kind = form.value.kind === 'MENU' ? 'Parte del menú' : 'Platos a la carta'
  return selectedCategory.value ? `${selectedCategory.value.name} · ${kind}` : kind
})
const submitLabel = computed(() => {
  if (loading.value) return 'Guardando…'
  if (editing) return 'Actualizar ítem'
  if (form.value.kind === 'MENU') return 'Registrar plato para menú del día'
  return 'Registrar plato a la carta'
})
const visibleCategories = computed(() => {
  if (!lockedCategoryId.value || lockedCategoryId.value < 0) return categories.value
  return categories.value.filter((category) => category.id === lockedCategoryId.value)
})

watch(lockedCategoryId, (categoryId) => {
  if (categoryId > 0) form.value.categoryId = categoryId
})

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

function onOfferCheck(id: number, event: Event) {
  toggleOffer(id, (event.target as HTMLInputElement).checked)
}

function toggleOffer(id: number, checked: boolean) {
  const current = new Set(form.value.menuOfferIds)
  if (checked) current.add(id)
  else current.delete(id)
  form.value.menuOfferIds = [...current]
}

function addLine() {
  form.value.descriptions.push({ id: undefined, description: '', price: 0, unitId: units.value[0]?.id || 0 })
}

async function quitar() {
  error.value = ''
  try {
    const deleted = await dismissRejection('ITEM', Number(route.params.id))
    if (deleted) {
      await router.push(
        route.query.categoria
          ? { name: 'category-items', params: { categoryId: String(route.query.categoria) } }
          : { name: 'items' },
      )
      return
    }
    window.location.reload()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function submit() {
  error.value = ''
  if (lockedCategoryId.value < 0) {
    error.value = 'Elige primero la categoría de tu negocio'
    return
  }
  if (lockedCategoryId.value > 0) form.value.categoryId = lockedCategoryId.value
  const menuPlate = menuCategory.value && form.value.kind === 'MENU'
  if (menuPlate && !form.value.menuPart) {
    error.value = 'Elige si el plato es entrada, segundo o refresco'
    return
  }
  const chosenOffers = form.value.menuPart === 'SEGUNDO'
    ? (form.value.menuOfferId ? [form.value.menuOfferId] : [])
    : form.value.menuOfferIds
  if (menuPlate && !chosenOffers.length) {
    error.value = 'Elige el tipo de menú'
    return
  }
  if (menuPlate && form.value.menuPart === 'SEGUNDO' && chosenOffers.length !== 1) {
    error.value = 'El segundo pertenece a un solo tipo de menú'
    return
  }
  const descriptions = form.value.descriptions
    .filter((line) => line.description.trim())
    .map((line) => (menuPlate
      ? { id: line.id, description: line.description, price: null, unitId: null }
      : { id: line.id, description: line.description, price: line.price, unitId: line.unitId }))
  if (!menuPlate && descriptions.some((line) => !line.unitId || line.price == null || Number(line.price) < 0)) {
    error.value = 'El precio puede ser cero y cada descripción debe tener unidad'
    return
  }
  loading.value = true
  const isActive = String(form.value.isActive) === 'true'
  try {
    if (imageFile.value) {
      const body = new FormData()
      body.append('name', form.value.name)
      body.append('pointSaleId', String(form.value.pointSaleId))
      body.append('categoryId', String(form.value.categoryId))
      body.append('isActive', String(isActive))
      body.append('kind', form.value.kind)
      if (form.value.menuPart) body.append('menuPart', form.value.menuPart)
      if (chosenOffers.length) body.append('menuOfferIds', chosenOffers.join(','))
      body.append('descriptions', JSON.stringify(descriptions))
      body.append('image', imageFile.value)
      if (editing) await http.patch(`/items/${route.params.id}`, body)
      else await http.post('/items', body)
    } else {
      const payload = {
        ...form.value,
        isActive,
        descriptions,
        menuPart: form.value.menuPart || null,
        menuOfferIds: chosenOffers,
        removeImage: removeImage.value,
      }
      if (editing) await http.patch(`/items/${route.params.id}`, payload)
      else await http.post('/items', payload)
    }
    const categoria = route.query.categoria
    if (typeof categoria === 'string' && categoria) {
      await router.push({ name: 'category-items', params: { categoryId: categoria } })
    } else {
      await router.push({ name: 'items' })
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
    <header class="head">
      <h2>{{ editing ? 'Actualizar ítem' : 'Crear ítem' }}</h2>
      <p class="chip">{{ plateChip }}</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
    <RejectionNote :rejected="rejected" @dismiss="quitar" />
    <p v-if="!points.length" class="hint">Crea un punto de venta antes de publicar ítems.</p>
    <form v-else class="sheet" @submit.prevent="submit">
      <div class="line">
        <span>Imagen</span>
        <div class="upload">
          <div class="file">
            <label class="pick">
              Seleccionar archivo
              <input :key="fileKey" type="file" accept="image/jpeg,image/png,image/webp" @change="onImage" />
            </label>
            <em>{{ imageName || (currentImage ? 'Foto actual' : 'Ningún archivo seleccionado') }}</em>
          </div>
          <p>Formatos recomendados: JPG, PNG (máx. 5MB)</p>
          <img v-if="currentImage" :src="currentImage" alt="Imagen del ítem" />
          <button v-if="currentImage || removeImage" class="quiet" type="button" @click="clearImage">Quitar foto</button>
        </div>
      </div>
      <label class="line">
        <span>Nombre del plato</span>
        <input v-model="form.name" required placeholder="Ej. Lomo Saltado tradicional" />
      </label>
      <label class="line">
        <span>Punto de venta</span>
        <select v-model.number="form.pointSaleId">
          <option v-for="point in points" :key="point.id" :value="point.id">{{ point.name }}</option>
        </select>
      </label>
      <p v-if="lockedCategoryId < 0" class="error">Elige primero la categoría de tu negocio en Productos/Servicios.</p>
      <label v-else class="line">
        <span>Categoría</span>
        <select v-model.number="form.categoryId" :disabled="lockedCategoryId > 0">
          <option v-for="category in visibleCategories" :key="category.id" :value="category.id">
            {{ category.rubro?.name ? `${category.rubro.name} · ` : '' }}{{ category.name }}
          </option>
        </select>
        <p v-if="lockedCategoryId > 0" class="hint">Tus ítems se publican en esta categoría.</p>
        <p v-else-if="visibleCategories.length > 1" class="hint">Puedes registrar ítems en cualquiera de estas categorías.</p>
        <p v-else-if="!visibleCategories.length" class="hint">El administrador todavía no registró categorías en el rubro de tu negocio.</p>
      </label>
      <label v-if="menuCategory" class="line">
        <span>Tipo de plato</span>
        <select v-model="form.kind">
          <option value="CARTA">Plato a la carta</option>
          <option value="MENU">Parte del menú</option>
        </select>
      </label>
      <label v-if="menuCategory && form.kind === 'MENU'" class="line">
        <span>Parte del menú</span>
        <select v-model="form.menuPart">
          <option value="ENTRADA">Entrada</option>
          <option value="SEGUNDO">Segundo</option>
          <option value="REFRESCO">Refresco</option>
        </select>
        <p class="hint">Este plato no lleva precio propio. El costo es el del tipo de menú.</p>
      </label>
      <label v-if="menuCategory && form.kind === 'MENU' && form.menuPart === 'SEGUNDO'" class="line">
        <span>Tipo de menú</span>
        <select v-model.number="form.menuOfferId" required>
          <option :value="0">Elige el tipo</option>
          <option v-for="offer in offers" :key="offer.id" :value="offer.id">{{ offer.name }} · S/ {{ Number(offer.price).toFixed(2) }}</option>
        </select>
        <p class="hint">El segundo pertenece a un solo tipo de menú.</p>
      </label>
      <div v-else-if="menuCategory && form.kind === 'MENU'" class="line">
        <span>Tipos de menú</span>
        <label v-for="offer in offers" :key="offer.id" class="check">
          <input type="checkbox" :checked="form.menuOfferIds.includes(offer.id)" @change="onOfferCheck(offer.id, $event)" />
          <em>{{ offer.name }} · S/ {{ Number(offer.price).toFixed(2) }}</em>
        </label>
        <p class="hint">Una entrada o un refresco puede estar en varios menús.</p>
        <p v-if="!offers.length" class="hint">Primero registra el tipo de menú y su precio en Productos/Servicios.</p>
      </div>
      <div class="line">
        <div class="status">
          <span>Estado</span>
          <b :class="String(form.isActive) === 'false' ? 'off' : 'on'">{{ String(form.isActive) === 'false' ? 'No visible' : 'Visible al cliente' }}</b>
        </div>
        <select v-model="form.isActive">
          <option :value="true">Activo</option>
          <option :value="false">Inactivo</option>
        </select>
      </div>
      <div class="variants">
        <header>
          <strong>{{ menuCategory && form.kind === 'MENU' ? 'Descripciones' : 'Descripciones y precios' }}</strong>
          <span>Variante principal</span>
        </header>
        <div v-for="(line, index) in form.descriptions" :key="index" class="grid">
          <label>
            <span>Descripción</span>
            <input v-model="line.description" placeholder="Carne, papas y arroz" />
          </label>
          <label v-if="!(menuCategory && form.kind === 'MENU')">
            <span>Precio (S/)</span>
            <input v-model.number="line.price" type="number" min="0" step="0.01" />
          </label>
          <label v-if="!(menuCategory && form.kind === 'MENU')">
            <span>Unidad</span>
            <select v-model.number="line.unitId">
              <option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.name }}</option>
            </select>
          </label>
        </div>
        <p v-if="!(menuCategory && form.kind === 'MENU') && !units.length" class="hint">El administrador todavía no registró unidades.</p>
        <button class="more" type="button" @click="addLine">+ Agregar otra descripción / variante</button>
      </div>
      <button class="save" type="submit" :disabled="loading">{{ submitLabel }}</button>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 16px;
  text-align: center;
}

.head h2 {
  margin: 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.chip {
  display: inline-flex;
  margin: 8px 0 0;
  padding: 4px 12px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.line,
.grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.line > span,
.grid span,
.variants strong {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.line input:not([type='checkbox']),
.line select,
.grid input,
.grid select {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-control);
  background: #fff;
  color: var(--color-ink);
  font: inherit;
  font-size: 13px;
}

.line select,
.grid select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23475569' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 10px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 32px;
}

.line select:disabled {
  background-color: #f8fafc;
  color: #64748b;
}

.line input:focus,
.line select:focus,
.grid input:focus,
.grid select:focus {
  outline: none;
  border-color: var(--color-brand);
}

.hint {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 16px;
}

.upload {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-card);
  background: #fff;
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
  background: #f1f5f9;
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
  height: 140px;
  margin-top: 10px;
  object-fit: cover;
  border-radius: 12px;
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
}

.status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.status b {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.status .on {
  border: 1px solid #a7f3d0;
  background: #ecfdf5;
  color: #047857;
}

.status .off {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
}

.variants header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.variants header span {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 0.8fr;
  gap: 8px;
  margin-bottom: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-card);
  background: #f8fafc;
}

.grid input[type='number'] {
  font-weight: 700;
  text-align: right;
}

.check {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-height: 36px;
}

.check input {
  width: 18px;
  height: 18px;
  min-height: 18px;
  margin: 0;
  padding: 0;
  flex: none;
  accent-color: var(--color-brand);
}

.check em {
  flex: 1;
  color: var(--color-ink);
  font-size: 14px;
  font-style: normal;
  line-height: 18px;
  white-space: nowrap;
}

.more,
.save {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.more {
  background: #e2e8f0;
  color: #334155;
}

.save {
  background: var(--color-brand);
  color: #fff;
}

.save:disabled {
  opacity: 0.6;
}
</style>
