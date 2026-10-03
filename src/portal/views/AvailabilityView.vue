<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

type Row = {
  id: number
  name: string
  kind: 'CARTA' | 'MENU'
  menuPart: 'ENTRADA' | 'SEGUNDO' | 'REFRESCO' | null
  menuOfferName?: string
  menuOfferNames?: string[]
  categoryName: string
  available: boolean
}

function limaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}

const date = ref(limaToday())
const trackingToday = ref(true)
const items = ref<Row[]>([])
const error = ref('')
const message = ref('')
const saving = ref(false)

const menuGroups = [
  { key: 'ENTRADA', label: 'Entrada' },
  { key: 'SEGUNDO', label: 'Segundo' },
  { key: 'REFRESCO', label: 'Refresco' },
] as const

const hasMenu = computed(() => items.value.some((item) => item.kind === 'MENU'))
const carta = computed(() => items.value.filter((item) => item.kind !== 'MENU'))
const cartaReady = computed(() => carta.value.filter((item) => item.available).length)
const menuTypes = computed(() => {
  const grouped = new Map<string, Row[]>()
  for (const item of items.value.filter((entry) => entry.kind === 'MENU')) {
    const labels = item.menuOfferNames?.length ? item.menuOfferNames : [item.menuOfferName || 'Sin tipo de menú']
    for (const label of labels) {
      grouped.set(label, [...(grouped.get(label) || []), item])
    }
  }
  return [...grouped.entries()].map(([name, rows]) => ({
    name,
    parts: menuGroups.map((group) => ({
      ...group,
      items: rows.filter((item) => item.menuPart === group.key),
    })),
  }))
})

async function load() {
  error.value = ''
  const { data } = await http.get<{ items: Row[] }>('/items/availability', { params: { date: date.value } })
  items.value = data.items
}

let clock: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
  clock = setInterval(() => {
    const today = limaToday()
    if (trackingToday.value && date.value !== today) date.value = today
  }, 15000)
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch(date, async (value) => {
  trackingToday.value = value === limaToday()
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

onUnmounted(() => {
  if (clock) clearInterval(clock)
})

async function save() {
  error.value = ''
  message.value = ''
  saving.value = true
  try {
    const { data } = await http.put<{ items: Row[] }>('/items/availability', {
      date: date.value,
      itemIds: items.value.filter((item) => item.available).map((item) => item.id),
    })
    items.value = data.items
    message.value = 'Disponibilidad guardada'
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <h2>Disponibilidad del día</h2>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>
    <label class="when">
      <span>Fecha de vigencia</span>
      <input v-model="date" type="date" />
    </label>
    <p class="note">Los productos y servicios salen marcados. El menú se desmarca a las 00:00 y hay que marcarlo de nuevo cada día. Quitar la marca oculta ese ítem en la fecha elegida.</p>
    <p v-if="!items.length" class="hint">No hay platos registrados.</p>
    <template v-else-if="hasMenu">
      <header class="band">
        <h3>Platos a la carta</h3>
        <span>{{ cartaReady }} disponible{{ cartaReady === 1 ? '' : 's' }}</span>
      </header>
      <p v-if="!carta.length" class="hint">No hay platos a la carta.</p>
      <label v-for="item in carta" :key="item.id" class="dish">
        <span>
          <strong>{{ item.name }}</strong>
          <small>{{ item.categoryName }}</small>
        </span>
        <input v-model="item.available" class="mark" type="checkbox" />
      </label>
      <section v-for="type in menuTypes" :key="type.name" class="menu">
        <header>
          <div>
            <h3>{{ type.name }}</h3>
            <p>Configuración diaria de entradas, segundos y refrescos</p>
          </div>
          <span>Menú del día</span>
        </header>
        <section v-for="group in type.parts" :key="`${type.name}-${group.key}`">
          <h4>{{ group.label }} <small>Seleccionar activas</small></h4>
          <p v-if="!group.items.length" class="hint">No hay opciones de {{ group.label.toLowerCase() }}.</p>
          <label v-for="item in group.items" :key="`${type.name}-${item.id}`" class="dish">
            <span>
              <strong>{{ item.name }}</strong>
              <small>{{ item.categoryName }}</small>
            </span>
            <input v-model="item.available" class="mark" type="checkbox" />
          </label>
        </section>
      </section>
    </template>
    <template v-else>
      <header class="band">
        <h3>Productos y servicios</h3>
        <span>{{ items.filter((item) => item.available).length }} disponible{{ items.filter((item) => item.available).length === 1 ? '' : 's' }}</span>
      </header>
      <label v-for="item in items" :key="item.id" class="dish">
        <span>
          <strong>{{ item.name }}</strong>
          <small>{{ item.categoryName }}</small>
        </span>
        <input v-model="item.available" class="mark" type="checkbox" />
      </label>
    </template>
    <button class="save" type="button" :disabled="saving || !items.length" @click="save">
      {{ saving ? 'Guardando…' : 'Guardar disponibilidad' }}
    </button>
  </ScreenFrame>
</template>

<style scoped>
.head {
  margin-bottom: 14px;
  text-align: center;
  font-family: var(--font-ui);
}

.head h2 {
  margin: 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.when,
.note,
.dish,
.menu {
  margin-bottom: 12px;
  background: #fff;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.when {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
}

.when span,
.band span,
.menu header span {
  color: #5c5e65;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.when input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid #fecdd3;
  border-radius: 12px;
  background: #fff;
  font: inherit;
}

.note,
.hint {
  margin: 0 0 14px;
  color: #5c5e65;
  font-size: 13px;
  line-height: 18px;
}

.note {
  padding: 14px;
}

.band,
.menu header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.band h3,
.menu h3,
.menu h4 {
  margin: 0;
}

.band h3 {
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.menu {
  padding: 14px;
}

.menu header {
  margin-bottom: 12px;
}

.menu h3 {
  font-size: 16px;
}

.menu header p,
.menu h4 small,
.dish small {
  display: block;
  margin: 2px 0 0;
  color: #5c5e65;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.menu h4 {
  margin: 12px 0 8px;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.menu h4 small {
  display: inline;
  margin-left: 4px;
  font-weight: 600;
  text-transform: none;
}

.dish {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  cursor: pointer;
}

.dish strong {
  display: block;
  font-size: 16px;
}

.mark {
  appearance: none;
  flex: none;
  width: 24px;
  height: 24px;
  margin: 0;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.mark:checked {
  border-color: var(--color-brand);
  background: var(--color-brand);
}

.mark:checked::after {
  content: '';
  display: block;
  width: 6px;
  height: 12px;
  margin: 2px 0 0 7px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.save {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  margin-top: 4px;
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
</style>
