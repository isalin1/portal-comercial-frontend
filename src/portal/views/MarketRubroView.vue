<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

type GroupKey = 'lima' | 'otros'

interface ZoneRow {
  id: number
  name: string
  districtName: string
  provinceName: string
  departmentName: string
  enabled: boolean
  marketBusinessCount: number
}

interface Group {
  key: GroupKey
  name: string
  enabled: boolean
  zones: ZoneRow[]
}

const groups = ref<Group[]>([])
const filter = ref<GroupKey>('lima')
const search = ref('')
const error = ref('')
const notice = ref('')
const loading = ref(true)
const saving = ref<number | 'group' | null>(null)

const current = computed(() => groups.value.find((group) => group.key === filter.value))

const visibleZones = computed(() => {
  const query = search.value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  const zones = current.value?.zones || []
  if (!query) return zones
  return zones.filter((zone) =>
    [zone.name, zone.districtName, zone.provinceName, zone.departmentName]
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes(query),
  )
})

const activeCount = computed(() => (current.value?.zones || []).filter((zone) => zone.enabled).length)

function place(zone: ZoneRow) {
  return [zone.districtName, zone.departmentName].filter(Boolean).join(' · ')
}

function stalls(count: number) {
  if (!count) return 'Sin puestos en un mercado'
  return count === 1 ? '1 puesto en un mercado' : `${count} puestos en un mercado`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get<{ groups: Group[] }>('/settings/mercado-en-rubro')
    groups.value = data.groups
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

async function save(zoneIds: number[], enabled: boolean, mark: number | 'group') {
  if (saving.value != null || !zoneIds.length) return
  saving.value = mark
  error.value = ''
  notice.value = ''
  try {
    const { data } = await http.patch<{ groups: Group[] }>('/settings/mercado-en-rubro', { zoneIds, enabled })
    groups.value = data.groups
    const group = data.groups.find((item) => item.key === filter.value)
    notice.value = enabled
      ? 'Esas zonas ya muestran el puesto también en su rubro y categoría.'
      : 'Esas zonas volvieron a mostrar el puesto solo dentro de su mercado.'
    if (group && mark === 'group') {
      notice.value = enabled
        ? `${group.name}: todas las zonas quedaron activas.`
        : `${group.name}: todas las zonas quedaron apagadas.`
    }
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = null
  }
}

function toggleZone(zone: ZoneRow) {
  save([zone.id], !zone.enabled, zone.id)
}

function toggleGroup() {
  const group = current.value
  if (!group?.zones.length) return
  save(group.zones.map((zone) => zone.id), !group.enabled, 'group')
}

onMounted(load)
</script>

<template>
  <ScreenFrame storefront back bar fluid>
    <header class="head">
      <h2>Mercados en el rubro</h2>
      <p>Un puesto dentro de un mercado puede verse también en su rubro y categoría. Apagado, solo aparece dentro del mercado.</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="notice" class="ok">{{ notice }}</p>
    <p v-if="loading" class="empty">Cargando zonas…</p>
    <template v-else>
      <div class="segment" role="tablist">
        <button type="button" :class="{ on: filter === 'lima' }" @click="filter = 'lima'">Lima Metropolitana</button>
        <button type="button" :class="{ on: filter === 'otros' }" @click="filter = 'otros'">Otros departamentos</button>
      </div>
      <article class="group">
        <div>
          <h3>{{ current?.name }}</h3>
          <p>{{ activeCount }} de {{ current?.zones.length || 0 }} zonas activas</p>
        </div>
        <button
          class="switch"
          type="button"
          role="switch"
          :aria-checked="Boolean(current?.enabled)"
          :class="{ on: current?.enabled }"
          :disabled="!current?.zones.length || saving != null"
          @click="toggleGroup"
        >
          <i></i>
          <span class="sr">{{ current?.enabled ? 'Desactivar todo el grupo' : 'Activar todo el grupo' }}</span>
        </button>
      </article>
      <label class="seek">
        <span>Buscar zona</span>
        <input v-model="search" type="search" placeholder="Zona o distrito" />
      </label>
      <p v-if="!current?.zones.length" class="empty">Este grupo todavía no tiene zonas.</p>
      <p v-else-if="!visibleZones.length" class="empty">Ninguna zona coincide con la búsqueda.</p>
      <ul v-else class="list">
        <li v-for="zone in visibleZones" :key="zone.id">
          <div>
            <h3>{{ zone.name }}</h3>
            <p>{{ place(zone) }}</p>
            <p class="stalls">{{ stalls(zone.marketBusinessCount) }}</p>
          </div>
          <button
            class="switch"
            type="button"
            role="switch"
            :aria-checked="zone.enabled"
            :class="{ on: zone.enabled }"
            :disabled="saving != null"
            @click="toggleZone(zone)"
          >
            <i></i>
            <span class="sr">{{ zone.enabled ? `Desactivar ${zone.name}` : `Activar ${zone.name}` }}</span>
          </button>
        </li>
      </ul>
    </template>
  </ScreenFrame>
</template>

<style scoped>
.head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.head p, .group p, .stalls {
  margin: 6px 0 0;
  color: var(--color-muted);
  font-size: 13px;
  line-height: 18px;
}
.error { color: var(--color-brand); font-size: 13px; font-weight: 700; }
.ok { color: #047857; font-size: 13px; font-weight: 700; }
.empty { color: var(--color-muted); font-size: 13px; }
.segment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 14px 0 12px;
  padding: 4px;
  border-radius: var(--radius-control);
  background: #e8eef5;
}
.segment button {
  min-height: 44px;
  border: 0;
  border-radius: var(--radius-mark);
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.segment button.on { background: var(--color-brand); color: #fff; }
.group, .list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.group {
  margin-bottom: 12px;
  padding: 14px;
  border-radius: var(--radius-card);
  background: var(--color-brand-soft);
}
.group h3, .list h3 { margin: 0; font-size: 16px; line-height: 22px; }
.seek { display: block; margin-bottom: 12px; }
.seek span { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 700; }
.seek input {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: #fff;
  font: inherit;
  font-weight: 600;
}
.list { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
.list li {
  padding: 12px;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.stalls { font-size: 12px; }
.switch {
  position: relative;
  flex: none;
  width: 52px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: #cbd5e1;
  cursor: pointer;
}
.switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}
.switch.on { background: var(--color-brand); }
.switch.on i { transform: translateX(20px); }
.switch:disabled { opacity: 0.6; cursor: default; }
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (min-width: 1024px) {
  .head h2 { font-size: 28px; }
  .head p { max-width: 640px; font-size: 15px; line-height: 22px; }
  .list {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
