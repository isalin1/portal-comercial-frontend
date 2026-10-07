export type UserType = 'ADMIN' | 'CLIENTE' | 'EMPRESARIO'

export interface AuthUser {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string
  userType: UserType
  isActive: boolean
  termsAccepted?: boolean
}

export interface DailyOffer {
  id: string
  kind: 'OFERTA_DIA'
  title: string
  detail?: string
  businessId: number
  businessName: string
  categoryId: number | null
  imageUrl?: string | null
  price: number | null
  compareAtPrice?: number | null
  descriptionId?: number
  itemId?: number
  footer: string
  cta: string
  clientOrders: boolean
  whatsappUrl?: string | null
}

export interface Rubro {
  id: number
  name: string
  imageUrl?: string | null
  businessCount?: number
  dailyOffers?: DailyOffer[]
  categories?: Category[]
}

export interface Category {
  id: number
  name: string
  imageUrl?: string | null
  rubroId: number
  rubro?: Rubro
}

export interface Unit {
  id: number
  name: string
}

export interface Market {
  id: number
  name: string
  imageUrl?: string | null
  groupId?: number
  zoneId?: number | null
  zone?: Zone | null
}

export interface Zone {
  id: number
  name: string
  districtId: number
  assignedBusinesses?: number
  businessCount?: number
  district?: {
    id: number
    name: string
    provinceId: number
    province?: {
      id: number
      name: string
      departmentId: number
      department?: { id: number; name: string }
    }
  }
}

export interface ItemDescription {
  id?: number
  description: string
  price: string | number | null
  unitId?: number | null
  unit?: Unit | null
  pendingApproval?: boolean
  rejected?: boolean
}

export interface Item {
  id: number
  name: string
  imageUrl?: string | null
  isActive: boolean
  pointSaleId: number
  categoryId: number
  category?: Category
  kind?: 'CARTA' | 'MENU' | 'OFERTA_DIA'
  menuPart?: 'ENTRADA' | 'SEGUNDO' | 'REFRESCO' | null
  compareAtPrice?: string | number | null
  menuOfferId?: number | null
  menuOfferIds?: number[]
  menuOffer?: { id: number; name: string; price: string | number } | null
  descriptions: ItemDescription[]
  pendingApproval?: boolean
  rejected?: boolean
}

export function menuOfferIdsOf(item: { menuOfferIds?: number[] | null; menuOfferId?: number | null }) {
  if (item.menuOfferIds?.length) return item.menuOfferIds
  return item.menuOfferId ? [item.menuOfferId] : []
}

export function isKgUnit(name?: string | null) {
  return /^kg$/i.test((name || '').trim())
}

export function quantityError(unitName: string | null | undefined, quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Indica la cantidad'
  if (isKgUnit(unitName)) {
    const rounded = Math.round(quantity * 100) / 100
    if (Math.abs(quantity - rounded) > 0.000001) return 'En kilogramos la cantidad admite hasta dos decimales'
    return ''
  }
  if (Math.abs(quantity - Math.round(quantity)) > 0.000001) return 'En Unidad la cantidad debe ser un número entero'
  return ''
}

export interface Address {
  id: number
  street: string
  urbanZone?: string | null
  reference?: string | null
  districtId: number
  district?: {
    id: number
    name: string
    provinceId: number
    province?: { id: number; name: string; departmentId: number }
  }
}

export interface PointSale {
  id: number
  name: string
  phone: string
  businessId: number
  opensAt?: string | null
  closesAt?: string | null
  openDays?: string | null
  isOpen?: boolean | null
  scheduleLabel?: string | null
  whatsappUrl?: string
  chargesDelivery?: boolean
  deliveryFee?: string | number
  address?: Address
  business?: Business
  items?: Item[]
  pendingApproval?: boolean
  rejected?: boolean
}

export interface Business {
  id: number
  legalName: string
  commercialName: string
  commercialDescription?: string
  imageUrl?: string | null
  numDoc: string
  docType: 'RUC' | 'DNI'
  rubroId: number
  rubro?: Rubro
  category?: { id: number; name: string } | null
  categoryId?: number | null
  marketId?: number | null
  market?: Market | null
  zoneId?: number | null
  zone?: Zone | null
  pointSales?: PointSale[]
  requireOrderPayment?: boolean
  chargesDelivery?: boolean
  deliveryFee?: string | number
  menuOffers?: { id: number; name: string; price: string }[]
  publicOffer?: boolean
  showPhone?: boolean
  clientOrders?: boolean
  hasMenu?: boolean
  affiliationLabel?: string
  affiliationTone?: 'gold' | 'green' | 'blue' | 'gray'
  pendingApproval?: boolean
  rejected?: boolean
  professionals?: { id: number; name: string; phone: string | null; agendaControl: boolean; isActive: boolean }[]
  user?: { planCatalog?: { name: string; agenda: boolean } | null }
}

export interface GeoItem {
  id: number
  name: string
  departmentId?: number
  provinceId?: number
}

export interface AccountPlan {
  id: number
  name: string
  commercialName: string
  days: number
  price?: string | number
  showProducts?: boolean
  whatsappButton?: boolean
  operatorOrders?: boolean
  agenda?: boolean
  clientOrders?: boolean
  daySummary?: boolean
}

export interface AccountUser {
  id: number
  isActive: boolean
  pendingEmpresario?: boolean
  termsAcceptedAt?: string | null
  plan?: string | null
  planCatalog?: AccountPlan | null
  pendingPlan?: AccountPlan | null
  vigenciaStart?: string | null
  vigenciaEnd?: string | null
  vigenciaDays?: number | null
  datUser: {
    firstName: string
    lastName: string
    email: string
    phone: string
    userType: UserType
  }
  businesses?: { id: number; commercialName: string; legalName: string; rubro?: { id: number; name: string; allowsOrders?: boolean; allowsAgenda?: boolean }; category?: { id: number; name: string } | null }[]
}
