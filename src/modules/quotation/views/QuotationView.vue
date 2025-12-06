<template>
  <div class="cotizacion-financiera">
    <h2>Cotizacion Financiera</h2>
    <div class="cliente">
      <div>
        <strong>{{ nombre }}</strong>
      </div>
      <div>Programa {{ programa }}</div>
      <div>Lote {{ lote }}</div>
      <div>Área Lote: {{ areaLote }}</div>
      <div>Asesor: {{ asesor }}</div>
      <div>{{ contacto }}</div>
    </div>
    <div class="tasas">
      <span
        >TEA <span class="badge">{{ teaAnual }} %</span></span
      >
      <span
        >TEM (mes) <span class="badge">{{ teaMensual }} %</span></span
      >
    </div>
    <form @submit.prevent="enviarCotizacion">
      <div class="row">
        <div>
          <label>Valor Lote</label>
          <input :value="valorLote" readonly />
        </div>
        <div>
          <label>Área Lote</label>
          <input :value="areaLote" readonly />
        </div>
      </div>
      <div class="row">
        <div>
          <label>Cuota inicial</label>
          <input :value="cuotaInicial" readonly />
        </div>
        <div>
          <label># Cuotas</label>
          <input :value="totalCuotas" readonly />
        </div>
      </div>
      <div class="row">
        <div>
          <label>Monto a Financiar</label>
          <input :value="montoFinanciado" readonly />
        </div>
        <div>
          <label>Total a pagar credito</label>
          <input :value="totalPagado" readonly />
        </div>
      </div>
      <div>
        <label>Interes generado</label>
        <input :value="interesGenerado" readonly />
      </div>
      <div>
        <label>Precio Venta</label>
        <input :value="precioVenta" readonly />
      </div>
      <div class="row">
        <div>
          <label>Valor cuotas</label>
          <input :value="cuotaMensual" readonly />
        </div>
        <div>
          <label>Valor ult. cuota</label>
          <input :value="valorUltimaCuota" readonly />
        </div>
      </div>
      <button type="submit" class="btn-enviar" :disabled="isReadOnly">Enviar</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSimulationStore } from '@/modules/simulation/stores/simulation.store'

const router = useRouter()
const route = useRoute()
const simulationStore = useSimulationStore()
const quotationFormData = computed(() => simulationStore.quotationFormData)

const nombre = computed(() =>
  quotationFormData.value?.client
    ? `${quotationFormData.value.client.firstname} ${quotationFormData.value.client.lastname}`
    : '',
)
const programa = computed(() => quotationFormData.value?.program?.programname || '')
const lote = computed(() => quotationFormData.value?.lot?.lotCode || '')
const areaLote = computed(() => quotationFormData.value?.lot?.area || '')
const asesor = computed(() =>
  quotationFormData.value?.simulation?.user?.firstname
    ? `${quotationFormData.value.simulation.user.firstname} ${quotationFormData.value.simulation.user.lastname}`
    : '',
)
const contacto = computed(() => quotationFormData.value?.simulation?.contacttype || '')
const teaAnual = computed(() => quotationFormData.value?.tea?.teaValue || '')
const teaMensual = computed(() => quotationFormData.value?.tea?.temValue || '')
const valorLote = computed(() => quotationFormData.value?.lot?.price || '')
const cuotaInicial = computed(() => quotationFormData.value?.simulation?.initialquote || '')
const montoFinanciado = computed(() => quotationFormData.value?.simulation?.montoFinanciar || '')
const totalCuotas = computed(() => quotationFormData.value?.simulation?.numquotas || '')
const totalPagado = computed(() => quotationFormData.value?.simulation?.totalPagarCredito || '')
const interesGenerado = computed(() => quotationFormData.value?.simulation?.intGenerate || '')
const precioVenta = computed(() => quotationFormData.value?.simulation?.saleValue || '')
const cuotaMensual = computed(() => quotationFormData.value?.simulation?.cuotabase || '')
const valorUltimaCuota = computed(
  () =>
    quotationFormData.value?.simulation?.valorUltimaCuota ||
    quotationFormData.value?.simulation?.ultimaCuota ||
    '',
)

const isReadOnly = computed(() => !!route.params.id)

function enviarCotizacion() {
  router.push({ name: 'dashboard' })
}
</script>

<style scoped>
.cotizacion-financiera {
  max-width: 400px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
}
h2 {
  text-align: center;
}
.row {
  display: flex;
  gap: 1rem;
}
input[readonly] {
  background: #ffeaea;
  border: none;
  border-radius: 6px;
  padding: 0.5rem;
  width: 100%;
  margin-bottom: 0.5rem;
}
.badge {
  background: #ffbdbd;
  color: #a00;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  margin-left: 0.5rem;
}
.btn-enviar {
  width: 100%;
  background: #ff8000;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  padding: 14px 0;
  cursor: pointer;
  margin-top: 16px;
  transition: background 0.2s;
}
.btn-enviar:hover {
  background: #ff9900;
}
</style>
