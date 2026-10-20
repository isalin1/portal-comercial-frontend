const MAX_SIDE = 1600

export async function prepareImage(file: File): Promise<File> {
  const name = file.name || 'foto'
  const type = (file.type || '').toLowerCase()
  const looksLikeImage = /image\/(jpeg|jpg|pjpeg|png|webp)/.test(type) || /\.(jpe?g|png|webp)$/i.test(name)
  if (!looksLikeImage) {
    throw new Error('Usa una imagen JPG, PNG o WEBP.')
  }
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) {
    throw new Error('No se pudo leer esa foto. Elige un JPG o PNG.')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob) return file
  const base = name.replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}
