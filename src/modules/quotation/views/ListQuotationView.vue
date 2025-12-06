<template>
  <div class="list-quotation">
    <button class="back-btn" @click="goToDashboard" aria-label="Volver al Dashboard">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="#ff7a2f" stroke-width="2" fill="none" />
      </svg>
    </button>
    <header>
      <input v-model="search" placeholder="Buscar Programa o Lote" class="search-input" />
      <button class="search-btn"><span>🔍</span></button>
    </header>
    <div class="quotation-list">
      <div
        v-for="q in filteredQuotations"
        :key="q.id"
        class="quotation-card"
        @click="goToQuotation(q.id)"
      >
        <div class="card-header">
          <span class="client"
            >{{ q.simulation?.client?.firstname }} {{ q.simulation?.client?.lastname }}</span
          >
          <span class="value">Valor: S/ {{ q.saleValue }}</span>
        </div>
        <div class="card-body">
          <div>Creación: {{ new Date(q.createdAt).toLocaleString() }}</div>
          <div><strong>Programa</strong>: {{ q.simulation?.lot?.program?.programname }}</div>
          <div><strong>Lote</strong>: {{ q.simulation?.lot?.lotCode }}</div>
          <div><strong># Cuotas</strong>: {{ q.simulation?.numquotas }}</div>
          <div><strong>Última cuota</strong>: {{ q.lastQuota }}</div>
        </div>
        <div class="card-footer">
          <span class="status pending">{{ q.status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { getQuotationsByUser, getAllQuotations, getQuotationById } from '@/api/lavanderiaApi'
import { useSimulationStore } from '@/modules/simulation/stores/simulation.store'

const router = useRouter()
const authStore = useAuthStore()
const simulationStore = useSimulationStore()
const quotations = ref([])

onMounted(async () => {
  if (
    authStore.user?.role?.toUpperCase() === 'ADMIN' ||
    authStore.user?.role?.toUpperCase() === 'SUPERADMIN'
  ) {
    quotations.value = await getAllQuotations()
  } else if (authStore.user?.id) {
    quotations.value = await getQuotationsByUser(authStore.user.id)
  }
})

const search = ref('')
const filteredQuotations = computed(() => {
  return quotations.value
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter(
      (q) =>
        q.simulation?.lot?.program?.programname
          ?.toLowerCase()
          .includes(search.value.toLowerCase()) ||
        q.simulation?.lot?.lotCode?.toLowerCase().includes(search.value.toLowerCase()),
    )
})

function goToDashboard() {
  router.push({ name: 'dashboard' })
}
async function goToQuotation(id) {
  const data = await getQuotationById(id)
  simulationStore.setQuotationFormData(data)
  router.push({ name: 'quotation-view', params: { id } })
}
</script>

<style scoped>
.list-quotation {
  max-width: 400px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}
.back-btn svg {
  display: block;
}
header {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.search-input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #eee;
}
.search-btn,
.filter-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}
.quotation-list {
  margin-top: 1rem;
}
.quotation-card {
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 1rem;
  padding: 0.8rem;
  box-shadow: 0 1px 3px #0001;
  cursor: pointer;
  transition: background 0.2s;
}
.quotation-card:hover {
  background: #ffeaea;
}
.card-header {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  margin-bottom: 0.3rem;
}
.card-body {
  font-size: 0.95rem;
  margin-bottom: 0.3rem;
}
.card-footer {
  text-align: right;
}
.status.pending {
  background: #ffbdbd;
  color: #a00;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  font-size: 0.9rem;
}
</style>
