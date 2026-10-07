<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import { usePortalAuth } from '../auth'
import type { Business, Category, Rubro } from '../types'

interface Section {
  rubro: Rubro
  singleCategory: boolean
  businesses: Business[]
  categories: Category[]
}

const auth = usePortalAuth()
const businesses = ref<Business[]>([])
const sections = ref<Section[]>([])
const error = ref('')
const message = ref('')
const choosing = ref(false)

function locksToOneCategory(rubro?: Rubro) {
  return /profesional|alimento|comercio|servicio/i.test(rubro?.name || '')
}

function categoryOf(section: Section, business: Business) {
  return section.categories.find((category) => category.id === business.categoryId)
}

function itemCount(business: Business, categoryId?: number | null) {
  const points = (business.pointSales || []) as { items?: { categoryId: number }[] }[]
  return points.reduce((sum, point) => sum + (point.items || []).filter((item) => item.categoryId === categoryId).length, 0)
}

function countLabel(total: number) {
  return `${total} ítem${total === 1 ? '' : 's'}`
}

async function load() {
  const { data } = await http.get<Business[]>('/businesses')
  businesses.value = data
  const rubros = new Map<number, { rubro: Rubro; businesses: Business[] }>()
  for (const business of data) {
    if (!business.rubro) continue
    const current = rubros.get(business.rubro.id)
    if (current) current.businesses.push(business)
    else rubros.set(business.rubro.id, { rubro: business.rubro, businesses: [business] })
  }
  sections.value = await Promise.all(
    [...rubros.values()].map(async ({ rubro, businesses: group }) => {
      const { data: categories } = await http.get<Category[]>('/categories', {
        params: { rubroId: rubro.id },
      })
      return { rubro, singleCategory: locksToOneCategory(rubro), businesses: group, categories }
    }),
  )
}

function takesOrders(rubro?: Rubro) {
  return !/profesional/i.test(rubro?.name || '')
}

async function saveRule(business: Business, requireOrderPayment: boolean) {
  error.value = ''
  message.value = ''
  try {
    await http.patch('/pedidos/exigencia', { businessId: business.id, requireOrderPayment })
    business.requireOrderPayment = requireOrderPayment
    message.value = 'Configuración de pedidos guardada'
  } catch (err) {
    error.value = apiError(err)
  }
}

async function choose(businessId: number, categoryId: number) {
  error.value = ''
  choosing.value = true
  try {
    await http.patch(`/businesses/${businessId}/category`, { categoryId })
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    choosing.value = false
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
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>
    <template v-if="!businesses.length">
      <p class="hint">Primero registra el negocio. Las categorías pertenecen al rubro de ese negocio.</p>
      <router-link v-if="auth.userType === 'EMPRESARIO'" class="open" :to="{ name: 'business-form' }">
        Registrar negocio
      </router-link>
    </template>
    <section v-for="section in sections" :key="section.rubro.id" class="block">
      <header class="head">
        <h2>{{ section.rubro.name }}</h2>
        <p>Gestiona las categorías y productos de tu negocio</p>
      </header>
      <p v-if="!section.categories.length" class="hint">Este rubro todavía no tiene categorías. Las crea el administrador.</p>
      <template v-else>
        <template v-for="business in section.businesses" :key="business.id">
          <template v-if="!business.categoryId && section.singleCategory">
            <p class="hint">Elige una categoría para {{ business.commercialName }}. Después solo podrás publicar ítems en esa categoría.</p>
            <article v-for="category in section.categories" :key="category.id" class="offer pick">
              <div class="photo">
                <img v-if="category.imageUrl" :src="category.imageUrl" :alt="category.name" />
              </div>
              <div class="body">
                <h3>{{ category.name }}</h3>
                <button class="open" type="button" :disabled="choosing" @click="choose(business.id, category.id)">
                  {{ choosing ? 'Guardando…' : 'Elegir' }}
                </button>
              </div>
            </article>
          </template>
          <template v-else-if="business.categoryId">
            <article class="offer">
              <div class="photo">
                <img v-if="categoryOf(section, business)?.imageUrl" :src="categoryOf(section, business)?.imageUrl || ''" :alt="categoryOf(section, business)?.name" />
                <span class="badge">Tu categoría</span>
                <span class="count">{{ countLabel(itemCount(business, business.categoryId)) }}</span>
              </div>
              <div class="body">
                <h3>{{ categoryOf(section, business)?.name }}</h3>
                <p>Puedes agregar los ítems que necesites en esta categoría.</p>
                <router-link class="open" :to="{ name: 'category-items', params: { categoryId: business.categoryId } }">Ver ítems</router-link>
                <router-link class="add" :to="{ name: 'item-form', query: { categoria: business.categoryId } }">Agregar ítem</router-link>
              </div>
            </article>
            <section v-if="takesOrders(section.rubro)" class="approval">
              <h3>Configuración de Aprobación de Registro de Pedido</h3>
              <label class="pay">
                <input :checked="business.requireOrderPayment" type="checkbox" @change="saveRule(business, ($event.target as HTMLInputElement).checked)" />
                <span>Se requiere pago del pedido para Registrarlo para su atención</span>
              </label>
              <p>Si NO marcas la casilla, los pedidos de tus clientes se registrarán automáticamente para su atención.</p>
            </section>
          </template>
          <p v-else class="hint">
            Elige la categoría de tu negocio en
            <router-link :to="{ name: 'business-edit', params: { id: business.id } }">Mi negocio</router-link>
            para ver y agregar ítems.
          </p>
        </template>
      </template>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.block {
  margin-bottom: 18px;
}

.head {
  margin-bottom: 14px;
  text-align: center;
  font-family: var(--font-ui);
}

.head h2 {
  margin: 0;
  font-size: 22px;
  line-height: 28px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.head p,
.hint,
.offer .body > p {
  margin: 6px 0 0;
  color: #5c5e65;
  font-size: 13px;
  line-height: 18px;
}

.hint {
  margin-bottom: 12px;
}

.offer {
  margin-bottom: 14px;
  overflow: hidden;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.photo {
  position: relative;
  height: 176px;
  background: #e2e8f0;
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge,
.count {
  position: absolute;
  font-size: 11px;
  font-weight: 700;
}

.badge {
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff;
  color: var(--color-brand);
}

.badge::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 999px;
  background: var(--color-brand);
}

.count {
  right: 12px;
  bottom: 10px;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.body h3 {
  margin: 0;
  font-size: 20px;
  line-height: 26px;
}

.open,
.add {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.open {
  background: var(--color-brand);
  color: #fff;
}

.add {
  background: #d1d5db;
  color: var(--color-ink);
}

.open:disabled {
  opacity: 0.55;
}

.pay {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--color-line);
  cursor: pointer;
}

.pay input {
  appearance: none;
  flex: none;
  width: 18px;
  height: 18px;
  margin: 1px 0 0;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
}

.pay input:checked {
  border-color: var(--color-brand);
  background: var(--color-brand);
}

.pay input:checked::after {
  content: '';
  display: block;
  width: 4px;
  height: 8px;
  margin: 1px 0 0 5px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.pay span {
  color: #334155;
  font-size: 13px;
  line-height: 18px;
}

.approval {
  margin-bottom: 14px;
  padding: 16px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.approval h3 {
  margin: 0 0 12px;
  color: var(--color-ink);
  font-size: 16px;
  line-height: 22px;
  font-weight: 800;
}

.approval .pay {
  margin: 0;
  padding: 0;
  border: 0;
}

.approval p {
  margin: 10px 0 0;
  color: #5c5e65;
  font-size: 13px;
  line-height: 18px;
}

@media (min-width: 1024px) {
  .block {
    margin-bottom: 28px;
  }

  .head {
    margin-bottom: 20px;
  }

  .head h2 {
    font-size: 28px;
    line-height: 34px;
  }

  .head p,
  .hint,
  .offer .body > p {
    font-size: 14px;
    line-height: 20px;
  }

  .block {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
  }

  .head,
  .block > .hint {
    grid-column: 1 / -1;
  }

  .offer {
    margin-bottom: 0;
    display: grid;
    grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.1fr);
    min-height: 220px;
  }

  .photo {
    height: 100%;
    min-height: 220px;
  }

  .body {
    padding: 22px 24px;
    justify-content: center;
  }

  .body h3 {
    font-size: 22px;
    line-height: 28px;
  }

  .body .open,
  .body .add {
    max-width: 280px;
  }

  .approval {
    margin-bottom: 0;
    padding: 22px 24px;
  }

  .approval h3 {
    font-size: 18px;
    line-height: 24px;
  }

  .pay span,
  .approval p {
    font-size: 14px;
    line-height: 20px;
  }
}
</style>
