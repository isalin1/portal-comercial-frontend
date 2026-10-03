import { ref } from 'vue'

export interface ChosenZone {
  id: number
  name: string
  districtId: number
  districtName: string
  provinceName: string
  departmentName: string
}

const KEY = 'portal_zone'
export const zoneRevision = ref(0)

export function readZone(): ChosenZone | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const zone = JSON.parse(raw) as ChosenZone
    if (!zone?.id || !zone.districtId) return null
    return zone
  } catch {
    return null
  }
}

export function saveZone(zone: ChosenZone) {
  localStorage.setItem(KEY, JSON.stringify(zone))
  zoneRevision.value += 1
}

export function clearZone() {
  localStorage.removeItem(KEY)
  zoneRevision.value += 1
}

export function zoneParams() {
  const zone = readZone()
  return zone ? { zoneId: zone.id } : {}
}
