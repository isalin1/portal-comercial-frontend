<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'

interface AuditCard {
  businessId: number
  commercialName: string
  rubroName: string
  categoryName: string
  label: string
  count: number
  oldestAt: string
}

const rows = ref<AuditCard[]>([])
const error = ref('')
const pendingLabel = computed(() => {
  const total = rows.value.length
  return total === 1 ? '1 por revisar' : `${total} por revisar`
})

function when(value: string) {
  const date = new Date(value)
  const day = date.toLocaleDateString('es-PE', { day: 'numeric', month: 'numeric', year: '2-digit' })
  const time = date.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })
  return `Enviado el ${day} a las ${time}`
}

function summary(row: AuditCard) {
  const changes = row.count === 1 ? '1 cambio pendiente' : `${row.count} cambios pendientes`
  return row.count === 1 ? `${row.label} (${changes})` : changes
}

onMounted(async () => {
  try {
    const { data } = await http.get<AuditCard[]>('/auditoria')
    rows.value = data
  } catch (err) {
    error.value = apiError(err)
  }
})
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <h2>Auditoría de Publicaciones</h2>
      <p>Revisión y aprobación de modificaciones solicitadas por los comercios afiliados</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <section v-else>
      <header class="band">
        <h3><i />Solicitudes pendientes</h3>
        <span v-if="rows.length">{{ pendingLabel }}</span>
      </header>
      <router-link v-for="row in rows" :key="row.businessId" class="request" :to="{ name: 'audit-detail', params: { id: row.businessId } }">
        <div class="top">
          <div>
            <p class="meta"><b>{{ row.rubroName }}</b><em>·</em>{{ row.categoryName }}</p>
            <h4>{{ row.commercialName }}</h4>
          </div>
          <span class="state">Pendiente</span>
        </div>
        <div class="note">
          <p>{{ summary(row) }}</p>
          <small>{{ when(row.oldestAt) }}</small>
        </div>
        <p class="go">Revisar modificación</p>
      </router-link>
      <div class="done">
        <p>{{ rows.length ? 'No hay más publicaciones pendientes' : 'No hay publicaciones pendientes' }}</p>
        <small v-if="rows.length">Todas las demás solicitudes han sido procesadas.</small>
      </div>
    </section>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 18px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
.head p { max-width: 280px; margin: 6px auto 0; color: #64748b; font-size: 12px; font-weight: 500; line-height: 16px; }
.band { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.band h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.band i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-brand);
  animation: pulse 1.6s ease-in-out infinite;
}
.band span {
  padding: 2px 10px;
  border: 1px solid #fde68a;
  border-radius: 999px;
  background: #fffbeb;
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}
.request {
  display: block;
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
  text-decoration: none;
}
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600; }
.meta b { padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 11px; }
.meta em { color: #cbd5e1; font-style: normal; }
.request h4 { margin: 0; font-size: 16px; line-height: 1.3; }
.state {
  flex: none;
  padding: 2px 8px;
  border: 1px solid #fde68a;
  border-radius: 999px;
  background: #fffbeb;
  color: #b45309;
  font-size: 11px;
  font-weight: 700;
}
.note { margin: 12px 0; padding: 10px 12px; border: 1px solid #f1f5f9; border-radius: 12px; background: #f8fafc; }
.note p, .note small { margin: 0; }
.note p { color: #334155; font-size: 12px; font-weight: 700; line-height: 16px; }
.note small { display: block; margin-top: 4px; color: #64748b; font-size: 11px; }
.go { margin: 0; color: var(--color-brand); font-size: 12px; font-weight: 800; }
.done {
  margin-top: 8px;
  padding: 16px;
  border: 1px dashed #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
  text-align: center;
}
.done p { margin: 0; color: #475569; font-size: 12px; font-weight: 800; }
.done small { display: block; margin-top: 4px; color: #94a3b8; font-size: 11px; }
@keyframes pulse {
  50% { opacity: 0.35; }
}
</style>
