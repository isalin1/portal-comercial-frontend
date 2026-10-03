<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import RejectionNote from '../components/RejectionNote.vue'
import { apiError, http } from '../api'
import { dismissRejection } from '../publication'
import { usePortalAuth } from '../auth'
import { menuOfferIdsOf, type Business, type Category, type Item } from '../types'

type Offer = { id: number; name: string; price: string; pendingApproval?: boolean; rejected?: boolean }

const route = useRoute()
const auth = usePortalAuth()
const items = ref<Item[]>([])
const category = ref<Category | null>(null)
const error = ref('')
const message = ref('')
const offers = ref<Offer[]>([])
const offerDraft = ref<Record<number, number>>({})
const offerName = ref('')
const offerPrice = ref(0)
const menuBusinessId = ref(0)

const isMenuCategory = computed(() => /comida criolla|men[uú]/i.test(category.value?.name || ''))

const categoryId = computed(() =>
  route.params.categoryId ? Number(route.params.categoryId) : undefined,
)

const visible = computed(() =>
  categoryId.value
    ? items.value.filter((item) => item.categoryId === categoryId.value)
    : items.value,
)

const cartaItems = computed(() => visible.value.filter((item) => item.kind !== 'MENU'))

const menuParts = [
  { key: 'ENTRADA', label: 'Entradas' },
  { key: 'SEGUNDO', label: 'Segundos' },
  { key: 'REFRESCO', label: 'Refrescos' },
] as const

function platesOf(part: string) {
  return visible.value.filter((item) => item.kind === 'MENU' && item.menuPart === part)
}

const unassignedMenu = computed(() => visible.value.filter((item) => item.kind === 'MENU' && !menuOfferIdsOf(item).length))
const assignChoice = ref<Record<number, number>>({})
const assignMany = ref<Record<number, number[]>>({})

function rememberAssignments(list: Item[]) {
  const choice: Record<number, number> = {}
  const many: Record<number, number[]> = {}
  for (const item of list) {
    if (item.kind !== 'MENU') continue
    const ids = menuOfferIdsOf(item)
    if (item.menuPart === 'SEGUNDO') choice[item.id] = ids[0] || 0
    else many[item.id] = [...ids]
  }
  assignChoice.value = choice
  assignMany.value = many
}

function toggleOffer(itemId: number, offerId: number, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const current = new Set(assignMany.value[itemId] || [])
  if (checked) current.add(offerId)
  else current.delete(offerId)
  assignMany.value = { ...assignMany.value, [itemId]: [...current] }
}

async function assign(item: Item) {
  error.value = ''
  message.value = ''
  const ids = item.menuPart === 'SEGUNDO'
    ? (assignChoice.value[item.id] ? [assignChoice.value[item.id]] : [])
    : assignMany.value[item.id] || []
  if (!ids.length) {
    error.value = 'Elige el tipo de menú'
    return
  }
  try {
    await http.patch(`/items/${item.id}`, { menuOfferIds: ids })
    message.value = `${item.name} quedó asignado al menú`
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function load() {
  error.value = ''
  const requests: Promise<unknown>[] = [http.get<Item[]>('/items')]
  if (categoryId.value) requests.push(http.get<Category>(`/categories/${categoryId.value}`))
  try {
    const [itemRes, categoryRes] = await Promise.all(requests)
    items.value = (itemRes as { data: Item[] }).data
    rememberAssignments(items.value)
    category.value = categoryRes ? (categoryRes as { data: Category }).data : null
    await loadOffers()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function loadOffers() {
  offers.value = []
  menuBusinessId.value = 0
  if (!isMenuCategory.value || !categoryId.value) return
  const { data } = await http.get<Business[]>('/businesses')
  const business = data.find((item) => item.categoryId === categoryId.value)
  if (!business) return
  menuBusinessId.value = business.id
  try {
    const { data: list } = await http.get<Offer[]>('/pedidos/ofertas', { params: { businessId: business.id } })
    offers.value = list
    offerDraft.value = Object.fromEntries(list.map((offer) => [offer.id, Number(offer.price)]))
  } catch (err) {
    error.value = apiError(err)
  }
}

async function updateOffer(offer: Offer) {
  error.value = ''
  message.value = ''
  try {
    await http.patch(`/pedidos/ofertas/${offer.id}`, { name: offer.name, price: offerDraft.value[offer.id] })
    message.value = 'Tipo de menú actualizado'
    await loadOffers()
  } catch (err) {
    error.value = apiError(err)
  }
}

async function saveOffer() {
  error.value = ''
  message.value = ''
  try {
    await http.post('/pedidos/ofertas', { businessId: menuBusinessId.value, name: offerName.value, price: offerPrice.value })
    offerName.value = ''
    offerPrice.value = 0
    message.value = 'Tipo de menú registrado'
    await loadOffers()
  } catch (err) {
    error.value = apiError(err)
  }
}

onMounted(load)
watch(() => route.params.categoryId, load)

async function quitar(scope: string, recordId: number) {
  error.value = ''
  try {
    await dismissRejection(scope, recordId)
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
}

function money(price: string | number) {
  return `S/ ${Number(price).toFixed(2)}`
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <h2>{{ category ? category.name : 'Nuestros productos y servicios' }}</h2>
      <p v-if="category?.rubro">{{ category.rubro.name }}</p>
    </header>
    <p v-if="isMenuCategory" class="lead">Cada plato de menú se asigna a un tipo. Sin esa asignación no aparece en la tienda.</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>
    <section v-if="isMenuCategory" class="group">
      <header class="banner">
        <h3>Menús del día</h3>
        <p>Precios vigentes y platos asignados</p>
      </header>
      <template v-if="menuBusinessId">
      <p v-if="!offers.length" class="hint">Todavía no hay tipos de menú. Registra el primero abajo.</p>
      <article v-for="(offer, index) in offers" :key="offer.id" class="sheet">
        <header>
          <strong>Tipo {{ index + 1 }}</strong>
          <span>{{ offer.name }}</span>
        </header>
        <label class="line">
          <span>Nombre del tipo</span>
          <input v-model="offer.name" />
        </label>
        <div class="split">
          <label class="line">
            <span>Precio (S/)</span>
            <input v-model.number="offerDraft[offer.id]" type="number" min="0.01" step="0.01" />
          </label>
          <p class="now">Precio actual <b>{{ money(offer.price) }}</b></p>
        </div>
        <p v-if="offer.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
        <RejectionNote :rejected="offer.rejected" @dismiss="quitar('MENU_OFFER', offer.id)" />
        <button class="ghost" type="button" @click="updateOffer(offer)">Actualizar precio</button>
      </article>
      <article class="sheet">
        <header>
          <strong>Crear nuevo tipo de menú</strong>
        </header>
        <label class="line">
          <span>Nombre</span>
          <input v-model="offerName" placeholder="Ej: Menú estudiantil" />
        </label>
        <label class="line">
          <span>Precio de venta</span>
          <input v-model.number="offerPrice" type="number" min="0.01" step="0.01" placeholder="0.00" />
        </label>
        <button class="ghost" type="button" @click="saveOffer">Registrar nuevo tipo de menú</button>
      </article>
      </template>
      <router-link
        v-if="auth.userType === 'EMPRESARIO'"
        class="add"
        :to="{ name: 'item-form', query: categoryId ? { categoria: categoryId, tipo: 'menu' } : { tipo: 'menu' } }"
      >Registrar plato para menú del día</router-link>
      <h4 class="inside">Asignación de platos</h4>
      <p v-if="unassignedMenu.length" class="hint">Hay platos sin tipo de menú. No salen en la tienda hasta asignarlos.</p>
      <section v-for="part in menuParts" :key="part.key">
        <h4>{{ part.label }}</h4>
        <p v-if="!platesOf(part.key).length" class="hint">No hay {{ part.label.toLowerCase() }}.</p>
        <article v-for="item in platesOf(part.key)" :key="item.id" class="dish">
          <div v-if="item.imageUrl" class="photo">
            <img :src="item.imageUrl" :alt="item.name" />
            <span :class="item.isActive ? 'on' : 'off'">{{ item.isActive ? 'Activo' : 'Inactivo' }}</span>
          </div>
          <div class="body">
            <div class="top">
              <h3>{{ item.name }}</h3>
              <router-link class="edit" :to="{ name: 'item-edit', params: { id: item.id }, query: categoryId ? { categoria: categoryId } : {} }">Editar</router-link>
            </div>
            <p v-if="!item.imageUrl" class="state">{{ item.isActive ? 'Activo' : 'Inactivo' }}</p>
            <p v-for="line in item.descriptions" :key="line.id" class="desc">{{ line.description }}</p>
            <p v-if="!item.descriptions.length" class="hint">Sin descripciones.</p>
            <p v-if="item.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
            <RejectionNote :rejected="item.rejected" @dismiss="quitar('ITEM', item.id)" />
            <div v-if="item.menuPart && offers.length" class="assign">
              <p>{{ item.menuPart === 'SEGUNDO' ? 'Un solo tipo de menú' : 'Puede ir en varios tipos' }}</p>
              <label v-if="item.menuPart === 'SEGUNDO'" class="line">
                <span>Tipo de menú</span>
                <select v-model.number="assignChoice[item.id]">
                  <option :value="0">Elige el tipo</option>
                  <option v-for="type in offers" :key="type.id" :value="type.id">{{ type.name }}</option>
                </select>
              </label>
              <template v-else>
                <label v-for="type in offers" :key="type.id" class="check">
                  <input type="checkbox" :checked="(assignMany[item.id] || []).includes(type.id)" @change="toggleOffer(item.id, type.id, $event)" />
                  <span>{{ type.name }}</span>
                </label>
              </template>
              <button class="ghost" type="button" @click="assign(item)">Guardar asignación</button>
            </div>
          </div>
        </article>
      </section>
    </section>
    <section v-if="isMenuCategory" class="group">
      <header class="banner">
        <h3>Platos a la carta</h3>
        <p>Venta por porción, sin tipo de menú</p>
      </header>
      <router-link
        v-if="auth.userType === 'EMPRESARIO'"
        class="add soft"
        :to="{ name: 'item-form', query: categoryId ? { categoria: categoryId, tipo: 'carta' } : { tipo: 'carta' } }"
      >Registrar plato a la carta</router-link>
      <p v-if="!cartaItems.length" class="hint">No hay platos a la carta.</p>
      <article v-for="item in cartaItems" :key="item.id" class="dish">
        <div v-if="item.imageUrl" class="photo">
          <img :src="item.imageUrl" :alt="item.name" />
          <span :class="item.isActive ? 'on' : 'off'">{{ item.isActive ? 'Activo' : 'Inactivo' }}</span>
        </div>
        <div class="body">
          <div class="top">
            <h3>{{ item.name }}</h3>
            <router-link class="edit" :to="{ name: 'item-edit', params: { id: item.id }, query: categoryId ? { categoria: categoryId } : {} }">Editar</router-link>
          </div>
          <p v-if="!item.imageUrl" class="state">{{ item.isActive ? 'Activo' : 'Inactivo' }}</p>
          <p v-for="line in item.descriptions" :key="line.id" class="desc">
            {{ line.description }}
            <b>{{ line.price == null ? 'Sin precio' : money(line.price) }}</b>
          </p>
          <p v-if="!item.descriptions.length" class="hint">Sin descripciones.</p>
          <p v-if="item.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
          <RejectionNote :rejected="item.rejected" @dismiss="quitar('ITEM', item.id)" />
        </div>
      </article>
    </section>
    <template v-else>
      <p v-if="!visible.length" class="hint">No hay ítems en esta categoría.</p>
      <article v-for="item in visible" :key="item.id" class="dish">
        <div v-if="item.imageUrl" class="photo">
          <img :src="item.imageUrl" :alt="item.name" />
        </div>
        <div class="body">
          <div class="top">
            <h3>{{ item.name }}</h3>
            <router-link class="edit" :to="{ name: 'item-edit', params: { id: item.id }, query: categoryId ? { categoria: categoryId } : {} }">Editar</router-link>
          </div>
          <p class="state">{{ item.isActive ? 'Activo' : 'Inactivo' }}</p>
          <p v-for="line in item.descriptions" :key="line.id" class="desc">
            {{ line.description }}
            <b>{{ line.price == null ? 'Sin precio' : money(line.price) }}</b>
          </p>
          <p v-if="!item.descriptions.length" class="hint">Sin descripciones.</p>
          <p v-if="item.pendingApproval" class="pending">Pendiente de aprobación de textos e imágenes</p>
          <RejectionNote :rejected="item.rejected" @dismiss="quitar('ITEM', item.id)" />
        </div>
      </article>
      <router-link
        v-if="auth.userType === 'EMPRESARIO'"
        class="add"
        :to="{ name: 'item-form', query: categoryId ? { categoria: categoryId } : {} }"
      >Registrar ítem</router-link>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 8px;
  text-align: center;
  font-family: var(--font-ui);
}

.head h2 {
  margin: 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.head p,
.lead,
.hint,
.assign > p,
.desc,
.state {
  margin: 6px 0 0;
  color: #5c5e65;
  font-size: 13px;
  line-height: 18px;
}

.lead {
  margin-bottom: 14px;
  text-align: center;
}

.group {
  margin-bottom: 16px;
}

.banner {
  margin-bottom: 12px;
  padding: 14px;
  border-radius: var(--radius-card);
  background: var(--color-brand);
}

.banner h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.banner p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  line-height: 16px;
}

.inside,
h4 {
  margin: 14px 0 8px;
  color: var(--color-ink);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sheet header strong {
  margin: 0;
  color: var(--color-ink);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sheet header span {
  color: #5c5e65;
  font-size: 11px;
  font-weight: 700;
}

.block,
.sheet,
.dish {
  margin-bottom: 12px;
}

.sheet,
.dish {
  overflow: hidden;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.sheet {
  padding: 14px;
}

.sheet header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-line);
}

.line {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.line span,
.now {
  color: #5c5e65;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.line input,
.line select {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-control);
  background: #f8fafc;
  color: var(--color-ink);
  font: inherit;
  font-weight: 600;
}

.split {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
}

.now {
  margin: 0 0 10px;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 600;
}

.now b {
  display: block;
  color: var(--color-brand);
  font-size: 18px;
}

.photo {
  position: relative;
  height: 128px;
  background: #e2e8f0;
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo span,
.state {
  font-size: 11px;
  font-weight: 800;
}

.photo span {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  color: #fff;
}

.on {
  background: #059669;
}

.off {
  background: #64748b;
}

.body {
  padding: 14px;
}

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.top h3 {
  margin: 0;
  font-size: 16px;
}

.edit {
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.desc b {
  display: block;
  color: var(--color-ink);
}

.assign {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-line);
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.ghost,
.add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.ghost {
  background: #e2e8f0;
  color: var(--color-ink);
}

.add {
  min-height: 48px;
  margin-bottom: 12px;
  background: var(--color-brand-soft);
  color: var(--color-brand);
}

.add.soft {
  background: #d1fae5;
  color: #047857;
}
</style>
