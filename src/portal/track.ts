import { http } from './api'

export type EngagementKind = 'BUSINESS_OPEN' | 'WHATSAPP_CLICK'

export function trackEngagement(kind: EngagementKind, businessId: number) {
  const id = Number(businessId)
  if (!Number.isFinite(id) || id < 1) return
  void http.post('/public/metrics/events', { kind, businessId: id }).catch(() => undefined)
}

export function trackBusinessOpen(businessId: number) {
  trackEngagement('BUSINESS_OPEN', businessId)
}

export function trackWhatsAppClick(businessId: number) {
  trackEngagement('WHATSAPP_CLICK', businessId)
}
