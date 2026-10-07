export function clientDisplayName(user?: { firstName?: string; lastName?: string } | null) {
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'cliente'
}

/** Digits with country code for WhatsApp (Peru 51 when local 9-digit). */
export function whatsappDigits(phoneOrUrl?: string | null) {
  if (!phoneOrUrl) return ''
  const fromUrl = phoneOrUrl.match(
    /(?:phone=|wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=|web\.whatsapp\.com\/send\/?\?phone=)(\d{9,15})/i,
  )
  let digits = fromUrl?.[1] || phoneOrUrl.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 9) digits = `51${digits}`
  return digits
}

export function whatsappMessageFromUrl(url?: string | null) {
  if (!url) return ''
  try {
    const normalized = url.includes('://') ? url : `https://${url}`
    const parsed = new URL(normalized)
    return parsed.searchParams.get('text') || ''
  } catch {
    const match = url.match(/[?&]text=([^&]*)/i)
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : ''
  }
}

function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Direct chat link:
 * - Desktop: WhatsApp Web (avoids wa.me → api.whatsapp.com app-protocol prompt)
 * - Mobile: wa.me (opens the WhatsApp app chat)
 */
export function whatsappChatUrl(phoneOrUrl: string | undefined | null, text = '') {
  const digits = whatsappDigits(phoneOrUrl)
  if (!digits) return ''
  const message = (text || whatsappMessageFromUrl(phoneOrUrl)).trim()
  const encoded = message ? encodeURIComponent(message) : ''
  if (isMobileBrowser()) {
    return encoded ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/${digits}`
  }
  return encoded
    ? `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}&type=phone_number&app_absent=0`
    : `https://web.whatsapp.com/send?phone=${digits}&type=phone_number&app_absent=0`
}

/** Opens the chat in the same tab as directly as the platform allows. */
export function openWhatsAppChat(phoneOrUrl: string | undefined | null, text = '') {
  const digits = whatsappDigits(phoneOrUrl)
  if (!digits || typeof window === 'undefined') return
  const message = (text || whatsappMessageFromUrl(phoneOrUrl)).trim()
  const encoded = message ? encodeURIComponent(message) : ''
  const webUrl = encoded
    ? `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}&type=phone_number&app_absent=0`
    : `https://web.whatsapp.com/send?phone=${digits}&type=phone_number&app_absent=0`

  if (isMobileBrowser()) {
    const appUrl = encoded
      ? `whatsapp://send?phone=${digits}&text=${encoded}`
      : `whatsapp://send?phone=${digits}`
    window.location.href = appUrl
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') window.location.href = webUrl
    }, 600)
    return
  }

  window.location.assign(webUrl)
}

export function withWhatsAppText(baseUrl: string | undefined | null, text: string) {
  return whatsappChatUrl(baseUrl, text)
}

export function professionalAppointmentWhatsApp(baseUrl: string | undefined | null, clientName: string) {
  return whatsappChatUrl(
    baseUrl,
    `Hola, soy ${clientName} y deseo informacion para agendar una cita`,
  )
}
