<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import { apiError, http } from '../api'
import type { Category, Rubro } from '../types'

const route = useRoute()
const router = useRouter()
const rubros = ref<Rubro[]>([])
const categories = ref<Category[]>([])
const name = ref('')
const rubroId = ref(0)
const imageFile = ref<File | null>(null)
const imageName = ref('')
const currentImage = ref('')
const removeImage = ref(false)
const fileKey = ref(0)
const error = ref('')
const message = ref('')
const saving = ref(false)
const pendingDelete = ref<Category | null>(null)
const selectedId = ref(0)

const editingId = () => (route.params.id ? Number(route.params.id) : 0)
const requestedRubroId = () => Number(route.query.rubro) || 0

const visibleCategories = computed(() =>
  rubroId.value
    ? categories.value.filter((category) => category.rubroId === rubroId.value)
    : categories.value,
)

const selectedRubroName = computed(
  () => rubros.value.find((rubro) => rubro.id === rubroId.value)?.name || '',
)

function applyCategory(category?: Category) {
  selectedId.value = category?.id || 0
  name.value = category?.name || ''
  if (category) rubroId.value = category.rubroId
  currentImage.value = category?.imageUrl || ''
  imageFile.value = null
  imageName.value = ''
  removeImage.value = false
}

async function load() {
  const [rubroRes, categoryRes] = await Promise.all([
    http.get<Rubro[]>('/rubros'),
    http.get<Category[]>('/categories'),
  ])
  rubros.value = rubroRes.data
  categories.value = categoryRes.data
  const current = categories.value.find((category) => category.id === editingId())
  applyCategory(current)
  if (!current && requestedRubroId()) rubroId.value = requestedRubroId()
  else if (!rubroId.value && rubros.value[0]) rubroId.value = rubros.value[0].id
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

watch(() => [route.params.id, route.query.rubro], async () => {
  try {
    await load()
  } catch (err) {
    error.value = apiError(err)
  }
})

function selectCategory(category: Category) {
  error.value = ''
  message.value = ''
  pendingDelete.value = null
  applyCategory(category)
  if (editingId() !== category.id) {
    router.replace({ name: 'category-edit', params: { id: category.id } })
  }
}

function startCreate() {
  error.value = ''
  message.value = ''
  pendingDelete.value = null
  const rubro = rubroId.value
  applyCategory(undefined)
  rubroId.value = rubro
  const query = rubro ? { rubro: String(rubro) } : {}
  if (route.name !== 'category-form') router.push({ name: 'category-form', query })
}

async function removeCategory() {
  const category = pendingDelete.value
  if (!category) return
  error.value = ''
  message.value = ''
  saving.value = true
  try {
    await http.delete(`/categories/${category.id}`)
    pendingDelete.value = null
    if (selectedId.value === category.id) startCreate()
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    saving.value = false
  }
}

function onImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] || null
  imageFile.value = file
  imageName.value = file?.name || ''
  if (file) {
    currentImage.value = URL.createObjectURL(file)
    removeImage.value = false
  }
}

function clearImage() {
  imageFile.value = null
  imageName.value = ''
  currentImage.value = ''
  removeImage.value = true
  fileKey.value += 1
}

async function submit() {
  error.value = ''
  message.value = ''
  if (!rubroId.value) {
    error.value = 'Elige el rubro de la categoría'
    return
  }
  if (!name.value.trim()) {
    error.value = 'Escribe el nombre de la categoría'
    return
  }
  saving.value = true
    const id = selectedId.value
    const removedPhoto = removeImage.value && !imageFile.value
    const addedPhoto = Boolean(imageFile.value)
  try {
    let savedId = id
    if (imageFile.value) {
      const body = new FormData()
      body.append('name', name.value.trim())
      body.append('rubroId', String(rubroId.value))
      body.append('image', imageFile.value)
      const response = id
        ? await http.patch<Category>(`/categories/${id}`, body)
        : await http.post<Category>('/categories', body)
      savedId = response.data.id
    } else if (id) {
      await http.patch(`/categories/${id}`, {
        name: name.value.trim(),
        rubroId: rubroId.value,
        removeImage: removeImage.value,
      })
    } else {
      const response = await http.post<Category>('/categories', {
        name: name.value.trim(),
        rubroId: rubroId.value,
      })
      savedId = response.data.id
    }
    message.value = addedPhoto ? 'Foto guardada' : removedPhoto ? 'Foto quitada' : 'Categoría guardada'
    if (id && savedId && editingId() !== savedId) {
      await router.replace({ name: 'category-edit', params: { id: savedId } })
    }
    await load()
    if (id) {
      const saved = categories.value.find((category) => category.id === savedId)
      if (saved) applyCategory(saved)
    } else {
      const rubro = requestedRubroId() || rubroId.value
      applyCategory(undefined)
      rubroId.value = rubro
    }
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
      <h2>{{ selectedId ? 'Editar categoría' : 'Agregar categoría' }}</h2>
      <p v-if="selectedRubroName">{{ selectedRubroName }}</p>
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="ok">{{ message }}</p>
    <section class="sheet">
      <h3>Categorías actuales</h3>
      <p v-if="!visibleCategories.length" class="empty">Este rubro no tiene categorías.</p>
      <article v-for="category in visibleCategories" :key="category.id" :class="{ on: selectedId === category.id }">
        <img v-if="category.imageUrl" :src="category.imageUrl" :alt="category.name" />
        <div v-else class="blank" />
        <strong>{{ category.name }}</strong>
        <div class="pair">
          <button class="yes" type="button" @click="selectCategory(category)">Editar</button>
          <button class="no" type="button" @click="pendingDelete = category">Eliminar</button>
        </div>
        <div v-if="pendingDelete?.id === category.id" class="warn">
          <p>Eliminar la categoría «{{ category.name }}». Si tiene productos, también se eliminan.</p>
          <div class="pair">
            <button class="yes" type="button" :disabled="saving" @click="removeCategory">Eliminar</button>
            <button class="no" type="button" :disabled="saving" @click="pendingDelete = null">Cancelar</button>
          </div>
        </div>
      </article>
    </section>
    <form class="sheet" @submit.prevent="submit">
      <h3>{{ selectedId ? 'Datos de la categoría' : 'Nueva categoría' }}</h3>
      <img v-if="currentImage" :src="currentImage" alt="Imagen de la categoría" class="preview" />
      <label>
        <span>Nombre</span>
        <input v-model="name" required placeholder="Nombre de la categoría" />
      </label>
      <label>
        <span>Imagen</span>
        <input :key="fileKey" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" @change="onImage" />
      </label>
      <p v-if="imageName" class="hint">Foto lista para guardar: {{ imageName }}</p>
      <button v-if="currentImage || removeImage" class="no wide" type="button" @click="clearImage">Quitar foto</button>
      <button class="save" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : selectedId ? 'Guardar categoría' : 'Registrar categoría' }}</button>
      <button v-if="selectedId" class="drop" type="button" @click="startCreate">Volver al registro</button>
    </form>
  </ScreenFrame>
</template>

<style scoped>
.head { margin-bottom: 16px; text-align: center; }
.head h2 { margin: 0; font-size: 22px; font-weight: 800; }
.head p { margin: 6px 0 0; color: #64748b; font-size: 13px; font-weight: 700; }
.sheet {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-soft);
}
.sheet h3 { margin: 0 0 10px; font-size: 14px; }
.sheet article {
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 12px;
  background: #f8fafc;
}
.sheet article.on { background: #fff5f5; outline: 1px solid #fecaca; }
.sheet img, .blank, .preview {
  display: block;
  width: 100%;
  height: 96px;
  object-fit: cover;
  border-radius: 8px;
  background: #e2e8f0;
}
.preview { height: 140px; margin-bottom: 10px; }
.sheet strong { display: block; margin-top: 8px; font-size: 13px; text-align: center; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.yes, .no, .save, .drop {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}
.yes, .save { background: var(--color-brand); color: #fff; }
.no { background: #e2e8f0; color: #334155; }
.save { width: 100%; min-height: 44px; margin-top: 8px; border-radius: 12px; }
.save:disabled, .yes:disabled, .no:disabled { opacity: 0.6; }
.drop { width: 100%; min-height: 36px; margin-top: 4px; background: transparent; color: #64748b; }
.no.wide { width: 100%; margin-bottom: 8px; }
label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
label span { font-size: 13px; font-weight: 700; }
label input[type='text'], label input:not([type='file']) {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  font: inherit;
}
label input[type='file'] { font: inherit; font-size: 12px; }
.empty, .hint { margin: 0 0 8px; color: #64748b; font-size: 12px; }
.warn { margin-top: 8px; padding: 8px; border-radius: 10px; background: #fff; color: #9f1239; font-size: 12px; }
.warn p { margin: 0; }
</style>
