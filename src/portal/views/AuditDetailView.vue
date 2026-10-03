<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

interface Change {
  id: number
  label: string
  kind: 'ALTA' | 'CAMBIO'
  field: string
  beforeText: string | null
  afterText: string | null
  image: boolean
  createdAt: string
}

const route = useRoute()
const router = useRouter()
const error = ref('')
const loading = ref(false)
const title = ref('Cambios pendientes')
const rubroName = ref('')
const categoryName = ref('')
const changes = ref<Change[]>([])
const pendingLabel = computed(() => (changes.value.length === 1 ? '1 pendiente' : `${changes.value.length} pendientes`))

function when(value: string) {
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

async function load() {
  const { data } = await http.get<{
    commercialName: string
    rubroName: string
    categoryName: string
    changes: Change[]
  }>(`/auditoria/negocios/${route.params.id}`)
  title.value = data.commercialName
  rubroName.value = data.rubroName
  categoryName.value = data.categoryName
  changes.value = data.changes
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

async function approve(id: number) {
  error.value = ''
  loading.value = true
  try {
    await http.post(`/auditoria/cambios/${id}/aprobar`)
    await load()
    if (!changes.value.length) await router.push({ name: 'audit' })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

async function reject(id: number) {
  error.value = ''
  loading.value = true
  try {
    await http.post(`/auditoria/cambios/${id}/rechazar`)
    await load()
    if (!changes.value.length) await router.push({ name: 'audit' })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

async function approveAll() {
  error.value = ''
  loading.value = true
  try {
    await http.post(`/auditoria/negocios/${route.params.id}/aprobar`)
    await router.push({ name: 'audit' })
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
      <h2>{{ title }}</h2>
      <div class="chips">
        <span v-if="rubroName" class="rubro">{{ rubroName }} · {{ categoryName }}</span>
        <span v-if="changes.length" class="state">{{ pendingLabel }}</span>
      </div>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!changes.length" class="empty">No hay cambios pendientes en este negocio.</p>
    <article v-for="change in changes" :key="change.id" class="sheet">
      <h3>{{ change.label }}</h3>
      <p class="meta"><b>{{ change.kind === 'ALTA' ? 'Nuevo' : 'Cambio' }}</b><span>·</span><time>{{ when(change.createdAt) }}</time></p>
      <template v-if="change.image">
        <div class="value">
          <span>Publicado</span>
          <img v-if="change.beforeText" :src="change.beforeText" alt="Imagen publicada" />
          <p v-else>Sin foto</p>
        </div>
        <div class="value">
          <span>Dato propuesto</span>
          <img v-if="change.afterText" :src="change.afterText" alt="Imagen pendiente" />
          <p v-else>Sin foto</p>
        </div>
      </template>
      <template v-else-if="change.kind === 'CAMBIO'">
        <div class="value">
          <span>Publicado</span>
          <p>{{ change.beforeText || 'Sin texto' }}</p>
        </div>
        <div class="value">
          <span>Dato propuesto</span>
          <p>{{ change.afterText || 'Sin texto' }}</p>
        </div>
      </template>
      <div v-else class="value">
        <span>Dato propuesto</span>
        <p>{{ change.afterText || 'Sin texto' }}</p>
      </div>
      <div class="actions">
        <button class="ok" type="button" :disabled="loading" @click="approve(change.id)">Aprobar</button>
        <button class="no" type="button" :disabled="loading" @click="reject(change.id)">Rechazar</button>
      </div>
    </article>
    <button v-if="changes.length" class="all" type="button" :disabled="loading" @click="approveAll">Aprobar todos</button>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 16px; text-align: center; }
.head h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
.chips { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; }
.rubro {
  padding: 4px 10px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}
.state {
  padding: 4px 10px;
  border: 1px solid #fde68a;
  border-radius: 999px;
  background: #fffbeb;
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}
.empty { margin: 0; color: #64748b; font-size: 13px; text-align: center; }
.sheet {
  margin-bottom: 14px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.sheet h3 { margin: 0; font-size: 16px; line-height: 1.3; }
.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}
.meta b { color: #64748b; }
.value {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  background: #f8fafc;
}
.value span {
  display: block;
  margin-bottom: 4px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.value p { margin: 0; color: #1e293b; font-size: 14px; font-weight: 600; }
.value img { display: block; width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.ok, .no, .all {
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
}
.ok, .all { background: var(--color-brand); color: #fff; }
.no { background: #e2e8f0; color: #334155; }
.ok:disabled, .no:disabled, .all:disabled { opacity: 0.6; }
.all { width: 100%; min-height: 48px; margin-bottom: 8px; }
</style>
