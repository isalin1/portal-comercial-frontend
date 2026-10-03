import { http } from './api'

export async function dismissRejection(scope: string, recordId: number) {
  const { data } = await http.post<{ deleted: boolean }>('/auditoria/rechazos/quitar', { scope, recordId })
  return data.deleted
}
