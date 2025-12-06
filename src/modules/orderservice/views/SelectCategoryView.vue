<template>
  <div class="select-category-container">
    <!-- Header -->
    <header class="category-header">
      <button class="back-button" @click="goBack" title="Volver">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#ff6b35" stroke-width="2" fill="none" />
        </svg>
      </button>
      <h1 class="title">Seleccionar Categoría de Servicio</h1>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando categorías...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="categories.length === 0" class="empty-container">
      <p class="empty-message">📦 No hay categorías de servicio configuradas</p>
      <p class="empty-hint">Por favor, configure servicios en "Nuestros Servicios" primero.</p>
      <button class="btn-back" @click="goBack">Volver al Dashboard</button>
    </div>

    <!-- Categories Grid -->
    <div v-else class="categories-grid">
      <div 
        v-for="category in categories" 
        :key="category.value"
        class="category-card"
        @click="selectCategory(category.value)"
      >
        <div class="category-icon">
          <component :is="getCategoryIcon(category.value)" />
        </div>
        <h3 class="category-name">{{ category.label }}</h3>
        <p class="category-unit">{{ getUnitLabel(category.unit) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { lavanderiaApi } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Estado
const loading = ref(false)
const categories = ref<Array<{ value: string; label: string; unit: string; hasServices: boolean }>>([])

// Mapeo de labels para categorías
const categoryDisplayNames: Record<string, string> = {
  'LAVADO': 'Lavado',
  'LAVADO_ESPECIAL': 'Lavado Especial',
  'LAVADO_EN_SECO': 'Lavado en Seco',
  'PLANCHADO': 'Planchado',
  'FRAZADAS': 'Frazadas',
  'EDREDONES': 'Edredones',
  'ZAPATILLAS': 'Zapatillas',
  'ALFOMBRAS': 'Alfombras',
  'CORTINAS': 'Cortinas'
}

// Mapeo de unidades
const unitDisplayNames: Record<string, string> = {
  'KILOGRAM': 'Por Kilogramo (kg)',
  'UNIT': 'Por Unidad',
  'PAIR': 'Por Par',
  'METER': 'Por Metro (mt)'
}

// Métodos
const goBack = () => {
  router.push({ name: 'dashboard' })
}

const getUnitLabel = (unit: string): string => {
  return unitDisplayNames[unit] || unit
}

const selectCategory = (categoryValue: string) => {
  console.log('📦 Categoría seleccionada:', categoryValue)
  
  // Verificar si venimos de agregar items a una orden existente
  const isAddingItems = route.query.addItems === 'true'
  
  // Navegar a CreateOrderServiceView con la categoría preseleccionada
  // La validación de si hay servicios disponibles se hará allá
  const query: any = { 
    category: categoryValue,
    fromCategorySelection: 'true'
  }
  
  // Si venimos de agregar items, pasar el parámetro
  if (isAddingItems) {
    query.addItems = 'true'
    console.log('➕ Modo: Agregando items a orden existente')
  }
  
  router.push({
    name: 'create-service-order',
    query
  })
}

const getCategoryIcon = (categoryValue: string) => {
  // SVG icons para cada categoría
  const icons: Record<string, any> = {
    'LAVADO': () => h('svg', {
      width: '48',
      height: '48',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#ff6b35',
      'stroke-width': '2'
    }, [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('path', { d: 'M12 8v8' }),
      h('path', { d: 'M8 12h8' })
    ]),
    'LAVADO_ESPECIAL': () => h('svg', {
      width: '48',
      height: '48',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#ff6b35',
      'stroke-width': '2'
    }, [
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('path', { d: 'M12 6l2 6-2 6-2-6z' })
    ]),
    'LAVADO_EN_SECO': () => h('svg', {
      width: '48',
      height: '48',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#ff6b35',
      'stroke-width': '2'
    }, [
      h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }),
      h('path', { d: 'M12 8v8' })
    ]),
    'PLANCHADO': () => h('svg', {
      width: '48',
      height: '48',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#ff6b35',
      'stroke-width': '2'
    }, [
      h('path', { d: 'M12 2l9 9-9 9-9-9z' })
    ]),
    'FRAZADAS': () => h('svg', {
      width: '48',
      height: '48',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#ff6b35',
      'stroke-width': '2'
    }, [
      h('rect', { x: '4', y: '6', width: '16', height: '12', rx: '1' }),
      h('line', { x1: '4', y1: '10', x2: '20', y2: '10' }),
      h('line', { x1: '4', y1: '14', x2: '20', y2: '14' })
    ]),
    'EDREDONES': () => h('svg', {
      width: '48',
      height: '48',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#ff6b35',
      'stroke-width': '2'
    }, [
      h('rect', { x: '3', y: '7', width: '18', height: '10', rx: '2' }),
      h('path', { d: 'M3 11h18' })
    ]),
    'ZAPATILLAS': () => h('svg', {
      width: '48',
      height: '48',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#ff6b35',
      'stroke-width': '2'
    }, [
      h('path', { d: 'M4 16l4-8 4 4 4-4 4 8H4z' })
    ]),
    'ALFOMBRAS': () => h('svg', {
      width: '48',
      height: '48',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#ff6b35',
      'stroke-width': '2'
    }, [
      h('rect', { x: '5', y: '5', width: '14', height: '14', rx: '1' }),
      h('line', { x1: '5', y1: '9', x2: '19', y2: '9' }),
      h('line', { x1: '5', y1: '12', x2: '19', y2: '12' }),
      h('line', { x1: '5', y1: '15', x2: '19', y2: '15' })
    ]),
    'CORTINAS': () => h('svg', {
      width: '48',
      height: '48',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: '#ff6b35',
      'stroke-width': '2'
    }, [
      h('line', { x1: '4', y1: '4', x2: '20', y2: '4' }),
      h('path', { d: 'M6 4v16c0 1 1 2 2 2' }),
      h('path', { d: 'M18 4v16c0 1-1 2-2 2' }),
      h('path', { d: 'M12 4v16' })
    ])
  }

  return icons[categoryValue] || icons['LAVADO']
}

const loadCategories = async () => {
  try {
    loading.value = true
    console.log('🔍 Cargando categorías con servicios configurados...')
    
    const user = authStore.user
    console.log('👤 Usuario logueado:', { id: user?.id, role: user?.role, email: user?.email })
    
    let businessId: number | undefined
    
    // Obtener información completa del usuario logueado con sus relaciones
    const userResponse = await lavanderiaApi.get('/user')
    const currentUser = userResponse.data.find((u: any) => u.id === user?.id)
    console.log('👤 Usuario completo con relaciones:', currentUser)
    
    if (!currentUser) {
      console.error('❌ No se encontró el usuario logueado')
      return
    }
    
    // Obtener businessId según el rol del usuario
    if (currentUser.role === 'ADMIN') {
      // Para ADMIN, buscar su negocio en la lista de negocios
      const businessResponse = await lavanderiaApi.get('/busines')
      console.log('🏢 Todos los negocios:', businessResponse.data)
      
      const adminBusiness = businessResponse.data.find((b: any) => b.userId === currentUser.id)
      console.log('🏢 Negocio del ADMIN:', adminBusiness)
      
      if (adminBusiness) {
        businessId = adminBusiness.id
        console.log('🏢 ADMIN - BusinessId encontrado:', businessId)
      } else {
        console.error('❌ ADMIN no tiene negocio asignado')
      }
    } else if (currentUser.role === 'SUPERADMIN') {
      // Para SUPERADMIN, obtener el primer negocio disponible
      const businessResponse = await lavanderiaApi.get('/busines')
      if (businessResponse.data.length > 0) {
        businessId = businessResponse.data[0].id
        console.log('🏢 SUPERADMIN - Primer businessId:', businessId)
      }
    } else if (currentUser.role === 'COLABORADOR') {
      // Para COLABORADOR, obtener el businessId de su punto de venta asignado
      if (currentUser.pointsales && currentUser.pointsales.length > 0) {
        const assignedPointsale = currentUser.pointsales[0]
        console.log('🏪 COLABORADOR - Punto de venta asignado:', assignedPointsale)
        
        // Si el punto de venta tiene el business incluido, usarlo directamente
        if (assignedPointsale.business && assignedPointsale.business.id) {
          businessId = assignedPointsale.business.id
          console.log('🏢 COLABORADOR - BusinessId desde pointsale.business:', businessId)
        } else if (assignedPointsale.businesId) {
          // Si no, usar el businesId directamente
          businessId = assignedPointsale.businesId
          console.log('🏢 COLABORADOR - BusinessId desde pointsale.businesId:', businessId)
        }
      }
    }
    
    console.log('🏢 BusinessId final del usuario:', businessId)
    
    if (!businessId) {
      console.error('❌ No se pudo obtener el businessId del usuario')
      // No mostrar alert, solo dejar que se muestre el estado vacío
      return
    }
    
    // Cargar las categorías de servicio que tienen servicios asociados
    const categoriesResponse = await lavanderiaApi.get(`/servicecategory?businesId=${businessId}`)
    console.log('📦 Categorías con servicios:', categoriesResponse.data)
    
    const unitMap: Record<string, string> = {
      'KILOGRAM': 'Por Kilogramo (kg)',
      'UNIT': 'Por Unidad',
      'PAIR': 'Por Par',
      'METER': 'Por Metro (mt)'
    }
    
    // Filtrar solo las categorías que tienen al menos un servicio configurado
    const categoriesWithServices = categoriesResponse.data.filter((cat: any) => 
      cat.listservices && cat.listservices.length > 0
    )
    
    console.log(`✅ Categorías con servicios: ${categoriesWithServices.length}`)
    
    // Mapear a nuestro formato
    categories.value = categoriesWithServices.map((cat: any) => ({
      value: cat.categoryType,
      label: categoryDisplayNames[cat.categoryType] || cat.name,
      unit: unitMap[cat.unit] || cat.unit,
      hasServices: true
    }))
    
    console.log('✅ Categorías finales:', categories.value)
    
  } catch (error: any) {
    console.error('❌ Error al cargar categorías:', error)
    alert('Error al cargar las categorías de servicio')
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadCategories()
})
</script>

<style>
/* Estilos globales para sobrescribir el body solo en esta vista */
body:has(.select-category-container) {
  display: block !important;
  place-items: unset !important;
  padding: 0 !important;
  margin: 0 !important;
}
</style>

<style scoped>
.select-category-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding-bottom: 2rem;
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
}

/* Header */
.category-header {
  background-color: #fff;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #f5f5f5;
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #ff6b35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container p {
  margin-top: 1rem;
  color: #666;
  font-size: 1rem;
}

/* Empty State */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-message {
  font-size: 1.25rem;
  color: #333;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.empty-hint {
  font-size: 1rem;
  color: #666;
  margin: 0 0 2rem 0;
}

.btn-back {
  background-color: #ff6b35;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-back:hover {
  background-color: #ff8c5f;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

/* Categories Grid */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.category-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 1rem;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 2px solid transparent;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.category-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(255, 107, 53, 0.3);
  border-color: #ff6b35;
}

.category-card:active {
  transform: translateY(-4px);
}

.category-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #ffe5dc 0%, #ffd4c4 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
}

.category-card:hover .category-icon {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5f 100%);
  transform: scale(1.1);
}

.category-card:hover .category-icon svg {
  stroke: white;
}

.category-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
  word-wrap: break-word;
  max-width: 100%;
}

.category-unit {
  font-size: 0.875rem;
  color: #666;
  margin: 0;
  font-style: italic;
  word-wrap: break-word;
  max-width: 100%;
}

/* Responsive */
@media (max-width: 480px) {
  .select-category-container {
    padding-bottom: 1rem;
  }

  .category-header {
    padding: 0.75rem;
  }

  .title {
    font-size: 1rem;
  }

  .categories-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }

  .category-card {
    padding: 1.25rem;
  }

  .category-icon {
    width: 60px;
    height: 60px;
  }

  .category-icon svg {
    width: 32px;
    height: 32px;
  }

  .category-name {
    font-size: 1rem;
  }

  .category-unit {
    font-size: 0.75rem;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .category-card {
    padding: 1.5rem;
  }

  .category-icon {
    width: 70px;
    height: 70px;
  }

  .category-icon svg {
    width: 40px;
    height: 40px;
  }

  .category-name {
    font-size: 1.1rem;
  }
}

@media (min-width: 769px) {
  .select-category-container {
    padding: 0 2rem 2rem;
  }

  .category-header {
    padding: 1.5rem 2rem;
  }

  .title {
    font-size: 1.5rem;
  }

  .categories-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    padding: 3rem 2rem;
    max-width: 100%;
    margin: 0;
  }

  .category-card {
    padding: 2rem;
  }

  .category-icon {
    width: 80px;
    height: 80px;
  }
}

@media (min-width: 1024px) {
  .categories-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
    padding: 3rem;
    max-width: 100%;
  }

  .category-card {
    padding: 2rem;
  }
}

@media (min-width: 1280px) {
  .categories-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 2.5rem;
    padding: 3rem 4rem;
  }

  .category-card {
    padding: 2.25rem;
  }
}

@media (min-width: 1600px) {
  .categories-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 2.5rem;
    padding: 3rem 5rem;
  }

  .category-card {
    padding: 2.5rem;
  }

  .category-icon {
    width: 90px;
    height: 90px;
  }
}
</style>

