import { onUnmounted, ref } from 'vue'

/** Mensaje breve de éxito junto al botón que acaba de ejecutar la acción. */
export function useActionNotice(durationMs = 6000) {
  const notice = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined

  function clearNotice() {
    notice.value = ''
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function showNotice(text: string) {
    notice.value = text
    if (timer) clearTimeout(timer)
    timer = setTimeout(clearNotice, durationMs)
  }

  onUnmounted(clearNotice)

  return { notice, showNotice, clearNotice }
}
