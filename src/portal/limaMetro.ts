/** Lima Metropolitana: provincia Lima (dpto. Lima) + Callao. */

function normalize(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function isLimaMetropolitana(departmentName?: string | null, provinceName?: string | null) {
  const department = normalize(departmentName)
  if (department === 'callao') return true
  return department === 'lima' && normalize(provinceName) === 'lima'
}

export function isLimaMetroGeo(item: {
  departmentName?: string | null
  provinceName?: string | null
  department?: { name?: string | null } | null
  province?: { name?: string | null; department?: { name?: string | null } | null } | null
  district?: {
    province?: {
      name?: string | null
      department?: { name?: string | null } | null
    } | null
  } | null
}) {
  const department =
    item.departmentName ||
    item.department?.name ||
    item.province?.department?.name ||
    item.district?.province?.department?.name ||
    ''
  const province = item.provinceName || item.province?.name || item.district?.province?.name || ''
  return isLimaMetropolitana(department, province)
}

export type LocationRegion = 'lima' | 'otros'
