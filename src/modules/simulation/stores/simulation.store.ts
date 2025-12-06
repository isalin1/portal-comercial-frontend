import { defineStore } from 'pinia'

interface SimulationFormData {
  nombre: string
  telefono: string
  contacto: string
  programaId: number | ''
  loteId: number | ''
  moneda: string
  tasaAnual: number | null
  cuotaInicial: number | null
  meses: number | null
  anios: number | null
  montoFinanciado: number
  tasaMensual: number
  totalCuotas: number
  teaId: number | null
  // ...otros campos que necesites
}

interface SimulationResultados {
  tem: string
  tea: string
  valorLote: number
  initialquote: number
  montoFinanciar: number
  numquotas: number
  totalPagarCredito: number
  interesGenerado: number
  ventaFinal: number
  cuotaBase: number
  ultimaCuota: number
  cuotaMensual: number
  cuotas: number[]
  // ...otros campos que devuelve el backend
}

interface QuotationData {
  id?: number
  initialquote: string
  numquotas: number
  timeunit: string
  contactType: string
  status: string
  createdAt: string
  updatedAt: string
  amountFinanced: string
  intGenerated: string
  saleValue: string
  quotaValue: string
  userId: number
  clientId: number
  teaId: number
  lotId: number
  lot: {
    lotCode: string
    area: string
    price: string
    program: {
      programname: string
      district: {
        name: string
        province: {
          name: string
          department: {
            name: string
          }
        }
      }
    }
  }
  client: {
    firstname: string
    lastname: string
    phone: string
  }
  tea: {
    id: number
    money: string
    teaValue: string
    temValue?: string
    createdAt: string
    updatedAt: string
  }
  user: {
    firstname: string
    lastname: string
    email: string
  }
  simulation?: {
    initialquote: string
    numquotas: number
    montoFinanciar: string
    totalPagarCredito: string
    intGenerate: string
    saleValue: string
    cuotabase: string
    valorUltimaCuota?: string
    ultimaCuota?: string
    contacttype: string
    user?: {
      firstname: string
      lastname: string
      email: string
    }
  }
}

export const useSimulationStore = defineStore('simulation', {
  state: () => ({
    formData: null as null | SimulationFormData,
    resultados: null as null | SimulationResultados,
    quotationFormData: null as null | QuotationData, // Para guardar los datos completos de la cotización
  }),
  actions: {
    setFormData(data: SimulationFormData) {
      this.formData = data
    },
    setResultados(data: SimulationResultados) {
      this.resultados = data
    },
    setQuotationFormData(data: QuotationData) {
      this.quotationFormData = data
    },
    reset() {
      this.formData = null
      this.resultados = null
      this.quotationFormData = null
    },
  },
})
