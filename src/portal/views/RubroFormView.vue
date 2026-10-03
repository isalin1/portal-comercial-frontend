<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { Rubro } from '../types'

const route = useRoute()
const router = useRouter()
const rubros = ref<Rubro[]>([])
const name = ref('')
const imageFile = ref<File | null>(null)
const imageName = ref('')
const currentImage = ref('')
const error = ref('')
const saving = ref(false)
const pendingRubroId = ref(0)
const adding = ref(false)
const formEl = ref<HTMLElement | null>(null)

const editingId = () => (route.params.id ? Number(route.params.id) : 0)
const showForm = computed(() => Boolean(editingId()) || adding.value)

async function load() {
  error.value = ''
  const { data } = await http.get<Rubro[]>('/rubros')
  rubros.value = data
  const id = editingId()
  const current = rubros.value.find((rubro) => rubro.id === id)
  name.value = current?.name || ''
  currentImage.value = current?.imageUrl || ''
  imageFile.value = null
  imageName.value = ''
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch(() => route.params.id, async () => {
  if (route.params.id) adding.value = false
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

function clearDraft() {
  name.value = ''
  currentImage.value = ''
  imageFile.value = null
  imageName.value = ''
}

async function startAdd() {
  adding.value = true
  error.value = ''
  pendingRubroId.value = 0
  clearDraft()
  if (route.name !== 'rubro-form') await router.push({ name: 'rubro-form' })
  await nextTick()
  formEl.value?.scrollIntoView({ block: 'start' })
}

function onImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] || null
  imageFile.value = file
  imageName.value = file?.name || ''
  if (file) currentImage.value = URL.createObjectURL(file)
}

function categoryLabel(rubro: Rubro) {
  const count = rubro.categories?.length || 0
  return count === 1 ? '1 categoría' : `${count} categorías`
}

function fileSize(file: File) {
  const kb = file.size / 1024
  const size = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`
  const kind = file.type.includes('png') ? 'PNG' : file.type.includes('webp') ? 'WEBP' : 'JPG'
  return `${size} · ${kind}`
}

async function discard() {
  adding.value = false
  clearDraft()
  if (editingId()) await router.push({ name: 'rubro-form' })
}

async function removeRubro() {
  if (!pendingRubroId.value) return
  error.value = ''
  saving.value = true
  try {
    const deletedId = pendingRubroId.value
    await http.delete(`/rubros/${deletedId}`)
    pendingRubroId.value = 0
    if (editingId() === deletedId) await router.replace({ name: 'rubro-form' })
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

async function submit() {
  error.value = ''
  saving.value = true
  const id = editingId()
  try {
    if (imageFile.value) {
      const body = new FormData()
      body.append('name', name.value)
      body.append('image', imageFile.value)
      if (id) await http.patch(`/rubros/${id}`, body)
      else await http.post('/rubros', body)
    } else if (id) {
      await http.patch(`/rubros/${id}`, { name: name.value })
    } else {
      await http.post('/rubros', { name: name.value })
    }
    await router.push({ name: 'catalog' })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ScreenFrame storefront back bar>
    <header class="head">
      <h2>Editar / Agregar rubro</h2>
      <p>Administración y catálogo de rubros comerciales en la plataforma</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <section class="sheet">
      <header>
        <h3>Rubros registrados</h3>
        <span>{{ rubros.length === 1 ? '1 en total' : `${rubros.length} en total` }}</span>
      </header>
      <article v-for="rubro in rubros" :key="rubro.id" :class="{ on: editingId() === rubro.id }">
        <div class="row">
          <b>{{ rubro.name.slice(0, 1) }}</b>
          <div>
            <strong>{{ rubro.name }}</strong>
            <small v-if="editingId() === rubro.id">Editando ahora</small>
            <small v-else>{{ categoryLabel(rubro) }}</small>
          </div>
          <router-link :class="{ solid: editingId() === rubro.id }" :to="{ name: 'rubro-edit', params: { id: rubro.id } }">Editar</router-link>
          <button type="button" aria-label="Eliminar rubro" @click="pendingRubroId = rubro.id">Eliminar</button>
        </div>
        <div v-if="pendingRubroId === rubro.id" class="warn">
          <p>Eliminar el rubro «{{ rubro.name }}». Si tiene categorías, también se eliminan.</p>
          <div class="pair">
            <button class="yes" type="button" :disabled="saving" @click="removeRubro">Eliminar</button>
            <button class="no" type="button" :disabled="saving" @click="pendingRubroId = 0">Cancelar</button>
          </div>
        </div>
      </article>
      <p v-if="!rubros.length" class="empty">No hay rubros registrados.</p>
      <button class="add" type="button" @click="startAdd">+ Agregar rubro</button>
    </section>
    <form v-if="showForm" ref="formEl" class="sheet" @submit.prevent="submit">
      <header>
        <h3>Datos del rubro</h3>
        <em>{{ editingId() ? 'Modo edición' : 'Modo alta' }}</em>
        <button class="close" type="button" aria-label="Cerrar formulario" @click="discard">×</button>
      </header>
      <label>
        <span>Nombre del rubro</span>
        <input v-model="name" required placeholder="Nombre del rubro" />
        <small>Visible para todos los clientes en la pantalla principal.</small>
      </label>
      <div class="upload">
        <span>Imagen representativa</span>
        <div class="file">
          <img v-if="currentImage" :src="currentImage" alt="Imagen del rubro" />
          <div v-else class="blank" />
          <div>
            <strong>{{ imageName || (currentImage ? 'Imagen actual' : 'Ninguna imagen seleccionada') }}</strong>
            <small>{{ imageFile ? fileSize(imageFile) : 'JPG, PNG o WEBP' }}</small>
            <small class="ready">{{ imageFile ? 'Lista para guardar' : currentImage ? 'Imagen registrada' : 'Sin imagen' }}</small>
          </div>
        </div>
        <label class="pick">
          Seleccionar archivo nuevo
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="onImage" />
        </label>
        <small>Resolución recomendada: 800x600 px (JPG, PNG o WEBP).</small>
      </div>
      <p class="note">El nombre se muestra en la pantalla principal. La imagen queda guardada en el rubro.</p>
      <button class="save" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar rubro' }}</button>
      <button class="drop" type="button" @click="discard">Descartar cambios</button>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 16px; text-align: center; }
.head h2 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.head p { margin: 6px 0 0; color: #64748b; font-size: 12px; }
.sheet {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.sheet > header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
.sheet h3 { margin: 0; font-size: 14px; }
.sheet header span, .sheet header em {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}
.sheet header em { margin-left: auto; background: #fee2e2; color: var(--color-brand); letter-spacing: 0.04em; text-transform: uppercase; }
.close {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  font: inherit;
  font-size: 18px;
}
.sheet article { margin-bottom: 8px; padding: 10px; border-radius: 12px; background: #f8fafc; }
.sheet article.on { background: #fff5f5; outline: 1px solid #fecaca; }
.row { display: flex; align-items: center; gap: 8px; }
.row b {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #e2e8f0;
  font-size: 14px;
}
.sheet article.on .row b { background: var(--color-brand); color: #fff; }
.row div { min-width: 0; flex: 1; }
.row strong, .file strong { display: block; font-size: 14px; line-height: 1.25; }
.row small, .file small, label small, .upload > small { display: block; color: #64748b; font-size: 11px; }
.row small { color: var(--color-brand); font-weight: 700; }
.sheet article:not(.on) .row small { color: #64748b; font-weight: 500; }
.row a, .row > button, .yes, .no {
  flex: none;
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: #fee2e2;
  color: var(--color-brand);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}
.row a.solid, .yes { background: var(--color-brand); color: #fff; }
.row > button, .no { width: 32px; padding: 0; background: #f1f5f9; color: #64748b; font-size: 0; }
.row > button::before, .no::before { content: '×'; font-size: 16px; }
.no { width: auto; padding: 0 10px; font-size: 12px; }
.no::before { content: none; }
.warn { margin-top: 8px; padding: 8px; border-radius: 10px; background: #fff; color: #9f1239; font-size: 12px; }
.warn p { margin: 0 0 8px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pair .yes, .pair .no { width: 100%; }
.add, .save, .drop, .pick {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  font: inherit;
  font-weight: 700;
  text-decoration: none;
}
.add, .save { margin-top: 8px; background: var(--color-brand); color: #fff; }
.save:disabled { opacity: 0.6; }
.drop { min-height: 36px; background: transparent; color: #64748b; font-size: 13px; }
label, .upload { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
label span, .upload > span { font-size: 14px; font-weight: 700; }
label input[type='text'], label input:not([type='file']) {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: #f8fafc;
  font: inherit;
  font-weight: 600;
}
.file { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 12px; background: #f8fafc; }
.file img, .blank { width: 56px; height: 56px; flex: none; border-radius: 8px; object-fit: cover; background: #e2e8f0; }
.ready { color: #047857; font-weight: 700; }
.pick { position: relative; min-height: 40px; background: #fff; color: #0f172a; border: 1px solid #e2e8f0; cursor: pointer; }
.pick input { position: absolute; inset: 0; opacity: 0; }
.note { margin: 0 0 8px; padding: 10px; border-radius: 12px; background: #f8fafc; color: #64748b; font-size: 12px; line-height: 1.4; }
.empty { margin: 0 0 8px; color: #64748b; font-size: 13px; }
</style>
