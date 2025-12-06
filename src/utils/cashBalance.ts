/**
 * Utilidades para el manejo del cuadre de caja
 */

/**
 * Verifica si un cuadre de caja está aprobado para un punto de venta y fecha específicos
 * @param pointsaleId ID del punto de venta
 * @param date Fecha en formato YYYY-MM-DD
 * @returns true si el cuadre está aprobado, false en caso contrario
 */
export function isCashBalanceApproved(pointsaleId: number | null, date: string): boolean {
  if (!pointsaleId || !date) return false
  
  const key = `${pointsaleId}-${date}`
  const stored = localStorage.getItem('approvedCashBalances')
  if (!stored) return false
  
  const approvedSet = new Set(JSON.parse(stored))
  return approvedSet.has(key)
}

/**
 * Aprueba un cuadre de caja para un punto de venta y fecha específicos
 * @param pointsaleId ID del punto de venta
 * @param date Fecha en formato YYYY-MM-DD
 */
export function approveCashBalance(pointsaleId: number, date: string): void {
  const key = `${pointsaleId}-${date}`
  const stored = localStorage.getItem('approvedCashBalances')
  const approvedSet = stored ? new Set(JSON.parse(stored)) : new Set()
  approvedSet.add(key)
  localStorage.setItem('approvedCashBalances', JSON.stringify(Array.from(approvedSet)))
}

/**
 * Desaprueba (reactiva) un cuadre de caja para un punto de venta y fecha específicos
 * Solo ADMIN y SUPERADMIN pueden hacer esto
 * @param pointsaleId ID del punto de venta
 * @param date Fecha en formato YYYY-MM-DD
 */
export function disapproveCashBalance(pointsaleId: number, date: string): void {
  const key = `${pointsaleId}-${date}`
  const stored = localStorage.getItem('approvedCashBalances')
  if (!stored) return
  
  const approvedSet = new Set(JSON.parse(stored))
  approvedSet.delete(key)
  localStorage.setItem('approvedCashBalances', JSON.stringify(Array.from(approvedSet)))
}

/**
 * Obtiene la fecha del pago en formato YYYY-MM-DD
 * @param payment Objeto de pago con datepaid
 * @returns Fecha en formato YYYY-MM-DD
 */
export function getPaymentDate(payment: any): string {
  if (!payment?.datepaid) return ''
  const date = new Date(payment.datepaid)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}



