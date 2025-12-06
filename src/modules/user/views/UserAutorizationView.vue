<template>
  <div class="user-authorization">
    <button class="back-btn" @click="goToDashboard" aria-label="Volver al Dashboard">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="#ff7a2f" stroke-width="2" fill="none" />
      </svg>
    </button>
    <h2>Autorización de Usuarios</h2>
    <div class="subtitle">Activa / Elimina Usuarios</div>
    
    <!-- Vista para SUPERADMIN: Agrupada por negocios -->
    <div v-if="authStore.user?.role === 'SUPERADMIN'" class="business-cards">
      <div v-for="businessGroup in businessGroups" :key="businessGroup.businessId" class="business-card">
        <div class="business-card-header">
          <div class="business-header-info">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="business-icon">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="2"/>
            </svg>
            <h3 class="business-name">{{ businessGroup.businessName }}</h3>
          </div>
        </div>
        
        <div class="business-card-body">
          <!-- Grupo de Administradores -->
          <div v-if="businessGroup.admins.length > 0" class="role-group">
            <h4 class="role-group-title">
              <span class="role-badge role-admin">Administradores</span>
              <span class="role-count">({{ businessGroup.admins.length }})</span>
            </h4>
            <div class="users-list">
              <div v-for="user in businessGroup.admins" :key="user.id" class="user-item" :class="{ inactive: !user.isActive }">
                <div class="user-item-content">
                  <div class="user-item-info">
                    <div class="user-avatar-small">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </div>
                    <div class="user-item-details">
                      <span class="user-item-name">{{ user.firstname }} {{ user.lastname }}</span>
                      <span class="user-item-email">{{ user.email }}</span>
                    </div>
                  </div>
                  <div class="user-item-actions">
                    <button
                      class="toggle-btn-small"
                      :class="{ active: user.isActive }"
                      @click="toggleAuthorization(user)"
                      :aria-label="user.isActive ? 'Desactivar' : 'Activar'"
                    >
                      <span class="circle-small"></span>
                    </button>
                    <button class="icon-btn-small" @click="editUser(user)" aria-label="Editar usuario">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 21h4l11-11-4-4L4 17v4z" stroke="currentColor" stroke-width="2" fill="none" />
                        <path d="M14 7l3 3" stroke="currentColor" stroke-width="2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Grupo de Colaboradores -->
          <div v-if="businessGroup.colaboradores.length > 0" class="role-group">
            <h4 class="role-group-title">
              <span class="role-badge role-colaborador">Colaboradores</span>
              <span class="role-count">({{ businessGroup.colaboradores.length }})</span>
            </h4>
            <div class="users-list">
              <div v-for="user in businessGroup.colaboradores" :key="user.id" class="user-item" :class="{ inactive: !user.isActive }">
                <div class="user-item-content">
                  <div class="user-item-info">
                    <div class="user-avatar-small">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </div>
                    <div class="user-item-details">
                      <span class="user-item-name">{{ user.firstname }} {{ user.lastname }}</span>
                      <span class="user-item-email">{{ user.email }}</span>
                      <span v-if="user.pointsales && user.pointsales.length > 0" class="user-item-pointsale">
                        Punto de Venta: {{ user.pointsales[0].name }}
                      </span>
                    </div>
                  </div>
                  <div class="user-item-actions">
                    <button
                      class="toggle-btn-small"
                      :class="{ active: user.isActive }"
                      @click="toggleAuthorization(user)"
                      :aria-label="user.isActive ? 'Desactivar' : 'Activar'"
                    >
                      <span class="circle-small"></span>
                    </button>
                    <button class="icon-btn-small" @click="editUser(user)" aria-label="Editar usuario">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 21h4l11-11-4-4L4 17v4z" stroke="currentColor" stroke-width="2" fill="none" />
                        <path d="M14 7l3 3" stroke="currentColor" stroke-width="2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Grupo de Clientes -->
          <div v-if="businessGroup.clientes.length > 0" class="role-group">
            <h4 class="role-group-title">
              <span class="role-badge role-client">Clientes</span>
              <span class="role-count">({{ businessGroup.clientes.length }})</span>
            </h4>
            <div class="users-list">
              <div v-for="user in businessGroup.clientes" :key="user.id" class="user-item" :class="{ inactive: !user.isActive }">
                <div class="user-item-content">
                  <div class="user-item-info">
                    <div class="user-avatar-small">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </div>
                    <div class="user-item-details">
                      <span class="user-item-name">{{ user.firstname }} {{ user.lastname }}</span>
                      <span class="user-item-email">{{ user.email }}</span>
                    </div>
                  </div>
                  <div class="user-item-actions">
                    <button
                      class="toggle-btn-small"
                      :class="{ active: user.isActive }"
                      @click="toggleAuthorization(user)"
                      :aria-label="user.isActive ? 'Desactivar' : 'Activar'"
                    >
                      <span class="circle-small"></span>
                    </button>
                    <button class="icon-btn-small" @click="editUser(user)" aria-label="Editar usuario">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 21h4l11-11-4-4L4 17v4z" stroke="currentColor" stroke-width="2" fill="none" />
                        <path d="M14 7l3 3" stroke="currentColor" stroke-width="2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mensaje si no hay usuarios en este negocio -->
          <div v-if="businessGroup.admins.length === 0 && businessGroup.colaboradores.length === 0 && businessGroup.clientes.length === 0" class="no-users-message">
            <p>No hay usuarios registrados para este negocio</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista para ADMIN: Agrupada por roles -->
    <div v-else-if="authStore.user?.role === 'ADMIN'" class="role-groups-container">
      <!-- Grupo de Colaboradores -->
      <div v-if="adminRoleGroups.colaboradores.length > 0" class="role-group-card">
        <h3 class="role-group-card-title">
          <span class="role-badge role-colaborador">Colaboradores</span>
          <span class="role-count">({{ adminRoleGroups.colaboradores.length }})</span>
        </h3>
        <div class="users-list">
          <div v-for="user in adminRoleGroups.colaboradores" :key="user.id" class="user-item" :class="{ inactive: !user.isActive }">
            <div class="user-item-content">
              <div class="user-item-info">
                <div class="user-avatar-small">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="user-item-details">
                  <span class="user-item-name">{{ user.firstname }} {{ user.lastname }}</span>
                  <span class="user-item-email">{{ user.email }}</span>
                  <span v-if="user.pointsales && user.pointsales.length > 0" class="user-item-pointsale">
                    Punto de Venta: {{ user.pointsales[0].name }}
                  </span>
                </div>
              </div>
              <div class="user-item-actions">
                <button
                  class="toggle-btn-small"
                  :class="{ active: user.isActive }"
                  @click="toggleAuthorization(user)"
                  :aria-label="user.isActive ? 'Desactivar' : 'Activar'"
                >
                  <span class="circle-small"></span>
                </button>
                <button class="icon-btn-small" @click="editUser(user)" aria-label="Editar usuario">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M4 21h4l11-11-4-4L4 17v4z" stroke="currentColor" stroke-width="2" fill="none" />
                    <path d="M14 7l3 3" stroke="currentColor" stroke-width="2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grupo de Clientes -->
      <div v-if="adminRoleGroups.clientes.length > 0" class="role-group-card">
        <h3 class="role-group-card-title">
          <span class="role-badge role-client">Clientes</span>
          <span class="role-count">({{ adminRoleGroups.clientes.length }})</span>
        </h3>
        <div class="users-list">
          <div v-for="user in adminRoleGroups.clientes" :key="user.id" class="user-item" :class="{ inactive: !user.isActive }">
            <div class="user-item-content">
              <div class="user-item-info">
                <div class="user-avatar-small">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="user-item-details">
                  <span class="user-item-name">{{ user.firstname }} {{ user.lastname }}</span>
                  <span class="user-item-email">{{ user.email }}</span>
                </div>
              </div>
              <div class="user-item-actions">
                <button
                  class="toggle-btn-small"
                  :class="{ active: user.isActive }"
                  @click="toggleAuthorization(user)"
                  :aria-label="user.isActive ? 'Desactivar' : 'Activar'"
                >
                  <span class="circle-small"></span>
                </button>
                <button class="icon-btn-small" @click="editUser(user)" aria-label="Editar usuario">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M4 21h4l11-11-4-4L4 17v4z" stroke="currentColor" stroke-width="2" fill="none" />
                    <path d="M14 7l3 3" stroke="currentColor" stroke-width="2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-if="(authStore.user?.role === 'SUPERADMIN' && businessGroups.length === 0) || (authStore.user?.role === 'ADMIN' && adminRoleGroups.colaboradores.length === 0 && adminRoleGroups.clientes.length === 0)" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#ccc" stroke-width="2"/>
        <circle cx="12" cy="7" r="4" stroke="#ccc" stroke-width="2"/>
      </svg>
      <p>No hay usuarios para mostrar</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { getAllUsers, updateUserIsActive, updateUser, getBusinessData, getAllPointSales } from '@/api/lavanderiaApi'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import type { User } from '@/modules/auth/interfaces/user.interface'

const router = useRouter()
const authStore = useAuthStore()

function goToDashboard() {
  router.push({ name: 'dashboard' })
}

const users = ref<User[]>([])
const allBusinesses = ref<any[]>([])
const allPointSales = ref<any[]>([])

// Helper function para obtener el businessId de un usuario
function getUserBusinessId(user: User): number | null {
  if (user.role === 'ADMIN' && user.business && user.business.length > 0) {
    return user.business[0].id
  } else if (user.role === 'COLABORADOR' && user.pointsales && user.pointsales.length > 0) {
    return user.pointsales[0].business?.id || null
  } else if (user.role === 'CLIENT') {
    return user.clientBusinesId || null
  }
  return null
}

// Computed property para agrupar usuarios por negocio (SUPERADMIN)
const businessGroups = computed(() => {
  if (authStore.user?.role !== 'SUPERADMIN') return []
  
  const groupsMap = new Map<number, {
    businessId: number
    businessName: string
    admins: User[]
    colaboradores: User[]
    clientes: User[]
  }>()

  // Inicializar grupos con todos los negocios
  allBusinesses.value.forEach((business: any) => {
    groupsMap.set(business.id, {
      businessId: business.id,
      businessName: business.name,
      admins: [],
      colaboradores: [],
      clientes: []
    })
  })

  // Agrupar usuarios por negocio
  users.value.forEach((user: User) => {
    // Excluir SUPERADMIN de la agrupación
    if (user.role === 'SUPERADMIN') return

    const businessId = getUserBusinessId(user)
    if (!businessId) return

    const group = groupsMap.get(businessId)
    if (!group) return

    if (user.role === 'ADMIN') {
      group.admins.push(user)
    } else if (user.role === 'COLABORADOR') {
      group.colaboradores.push(user)
    } else if (user.role === 'CLIENT') {
      group.clientes.push(user)
    }
  })

  // Convertir Map a Array y filtrar grupos vacíos
  return Array.from(groupsMap.values()).filter(group => 
    group.admins.length > 0 || group.colaboradores.length > 0 || group.clientes.length > 0
  )
})

// Computed property para agrupar usuarios por rol (ADMIN)
const adminRoleGroups = computed(() => {
  if (authStore.user?.role !== 'ADMIN') {
    return { colaboradores: [], clientes: [] }
  }

  const colaboradores: User[] = []
  const clientes: User[] = []

  users.value.forEach((user: User) => {
    if (user.role === 'COLABORADOR') {
      colaboradores.push(user)
    } else if (user.role === 'CLIENT') {
      clientes.push(user)
    }
  })

  return { colaboradores, clientes }
})

async function loadBusinessesAndPointSales() {
  try {
    const [businesses, pointSales] = await Promise.all([
      getBusinessData(),
      getAllPointSales()
    ])
    allBusinesses.value = businesses
    allPointSales.value = pointSales
    console.log('📊 Negocios cargados:', allBusinesses.value.length)
    console.log('📍 Puntos de venta cargados:', allPointSales.value.length)
  } catch (error) {
    console.error('Error cargando negocios y puntos de venta:', error)
  }
}

async function loadUsers() {
  const all = await getAllUsers()
  console.log('📦 Todos los usuarios recibidos del backend:', all)
  
  // Log detallado del primer usuario para debugging
  if (all.length > 0) {
    console.log('🔍 Primer usuario (ejemplo):', all[0])
    console.log('   - business:', all[0].business)
    console.log('   - pointsales:', all[0].pointsales)
    console.log('   - clientBusines:', all[0].clientBusines)
  }
  
  // Filtrar usuarios basándose en el rol del usuario logueado
  let filteredUsers = all
  
  if (authStore.user?.role === 'ADMIN') {
    // Los ADMIN pueden ver colaboradores de sus puntos de venta Y todos los clientes
    try {
      // Obtener el negocio del usuario ADMIN
      const businessData = await getBusinessData()
      const userBusiness = businessData.find((business: any) => business.userId === authStore.user?.id)
      
      let collaboratorUsers: User[] = []
      let clientUsers: User[] = []
      
      if (userBusiness) {
        // Obtener todos los puntos de venta
        const allPointSales = await getAllPointSales()
        // Filtrar solo los puntos de venta del negocio del usuario ADMIN
        const userPointSales = allPointSales.filter((pointSale: any) => pointSale.businesId === userBusiness.id)
        
        // Obtener los IDs de los colaboradores de esos puntos de venta
        const collaboratorIds = userPointSales
          .filter((pointSale: any) => pointSale.colaborador)
          .map((pointSale: any) => pointSale.colaborador.id)
        
        // Filtrar solo los colaboradores de los puntos de venta del usuario ADMIN
        collaboratorUsers = all.filter((user: User) => 
          user.role === 'COLABORADOR' && collaboratorIds.includes(user.id)
        )
        
        // Filtrar solo los clientes que pertenecen al negocio del ADMIN
        clientUsers = all.filter((user: User) => 
          user.role === 'CLIENT' && user.clientBusinesId === userBusiness.id
        )
        
        console.log('👥 ADMIN - Negocio:', userBusiness.name)
        console.log('👥 ADMIN - Colaboradores encontrados:', collaboratorUsers.length)
        console.log('👥 ADMIN - Clientes del negocio:', clientUsers.length)
      }
      
      // Combinar colaboradores y clientes
      filteredUsers = [...collaboratorUsers, ...clientUsers]
      
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      filteredUsers = []
    }
  } else if (authStore.user?.role === 'SUPERADMIN') {
    // Los SUPERADMIN pueden ver todos los usuarios
    filteredUsers = all
  } else {
    // Otros roles no pueden ver usuarios
    filteredUsers = []
  }
  
  // Ordenar del más reciente al más antiguo
  users.value = filteredUsers.sort((a: User, b: User) => {
    if (b.createdAt && a.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    // Si no hay createdAt, usar id descendente
    return (b.id || 0) - (a.id || 0)
  })
}

onMounted(async () => {
  // Verificar que el plan esté activo antes de cargar usuarios
  if (authStore.user?.role !== 'SUPERADMIN') {
    try {
      const { getBusinessPlanStatus, getBusinessData } = await import('@/api/lavanderiaApi')
      const { lavanderiaApi } = await import('@/api/lavanderiaApi')
      
      let businessId: number | null = null
      
      if (authStore.user?.role === 'ADMIN') {
        const businesses = await getBusinessData()
        const userBusiness = businesses.find((b: any) => b.userId === authStore.user?.id)
        if (userBusiness) {
          businessId = userBusiness.id
        }
      } else if (authStore.user?.role === 'COLABORADOR') {
        const { data: pointsales } = await lavanderiaApi.get('/pointsale')
        const userPointsale = pointsales.find((ps: any) => ps.userId === authStore.user?.id)
        if (userPointsale?.businesId) {
          businessId = userPointsale.businesId
        }
      }
      
      if (businessId) {
        try {
          const planStatus = await getBusinessPlanStatus(businessId)
          const estado = planStatus?.estado
          const isExpired = planStatus?.isExpired
          
          if (estado !== 'ACTIVO' || isExpired) {
            alert('El módulo de autorizaciones solo está disponible cuando el negocio tiene un plan activo. Por favor, contacta al administrador para renovar tu plan.')
            router.push({ name: 'dashboard' })
            return
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            alert('El módulo de autorizaciones solo está disponible cuando el negocio tiene un plan activo. Por favor, contacta al administrador para renovar tu plan.')
            router.push({ name: 'dashboard' })
            return
          }
        }
      }
    } catch (error) {
      console.error('Error verificando plan activo:', error)
      alert('Error al verificar el estado del plan. Por favor, intenta nuevamente.')
      router.push({ name: 'dashboard' })
      return
    }
  }
  
  await loadUsers()
  await loadBusinessesAndPointSales()
})

onActivated && onActivated(async () => {
  await loadUsers()
  await loadBusinessesAndPointSales()
})

async function toggleAuthorization(user: User) {
  const newStatus = !user.isActive
  
  // Mostrar confirmación especial para usuarios ADMIN
  if (user.role === 'ADMIN') {
    const action = newStatus ? 'activar' : 'desactivar'
    const message = newStatus 
      ? `¿Estás seguro de activar a ${user.firstname} ${user.lastname}?\n\n✅ El usuario ADMIN será activado.\nℹ️ Sus colaboradores mantendrán su estado actual.`
      : `¿Estás seguro de desactivar a ${user.firstname} ${user.lastname}?\n\n⚠️ El usuario ADMIN será desactivado.\n🔄 TODOS sus colaboradores también serán desactivados automáticamente.`
    
    if (!confirm(message)) {
      return // Cancelar la operación
    }
  }
  
  user.isActive = newStatus
  try {
    await updateUserIsActive(user.id, user.isActive)
    
    // Recargar la lista de usuarios para reflejar los cambios de cascada
    await loadUsers()
    
    // Mostrar mensaje de confirmación
    if (user.role === 'ADMIN') {
      const message = user.isActive 
        ? `✅ ${user.firstname} ${user.lastname} ha sido activado.\nLos colaboradores mantienen su estado actual.`
        : `✅ ${user.firstname} ${user.lastname} ha sido desactivado.\nTodos sus colaboradores han sido desactivados automáticamente.`
      alert(message)
    }
  } catch (e) {
    // Si falla, revertir el cambio
    user.isActive = !user.isActive
    alert('No se pudo actualizar el estado del usuario')
  }
}


async function editUser(user: User) {
  // Crear un formulario de edición simple
  const newFirstname = prompt(`Editar nombre de ${user.firstname} ${user.lastname}:`, user.firstname)
  if (newFirstname === null) return // Usuario canceló
  
  const newLastname = prompt(`Editar apellido de ${user.firstname} ${user.lastname}:`, user.lastname)
  if (newLastname === null) return // Usuario canceló
  
  const newPhone = prompt(`Editar teléfono de ${user.firstname} ${user.lastname}:`, user.phone)
  if (newPhone === null) return // Usuario canceló
  
  const newDni = prompt(`Editar DNI de ${user.firstname} ${user.lastname}:`, user.dni || '')
  if (newDni === null) return // Usuario canceló
  
  // Validar que los campos obligatorios no estén vacíos
  if (!newFirstname.trim() || !newLastname.trim() || !newPhone.trim() || !newDni.trim()) {
    alert('Los campos nombre, apellido, teléfono y DNI son obligatorios')
    return
  }
  
  // Validar formato del teléfono
  if (newPhone.length !== 9 || !/^\d+$/.test(newPhone)) {
    alert('El número de teléfono debe tener 9 dígitos numéricos')
    return
  }
  
  // Validar formato del DNI
  if (newDni.length !== 8 || !/^\d+$/.test(newDni)) {
    alert('El DNI debe tener 8 dígitos numéricos')
    return
  }
  
  // Validar que el DNI sea único (si es diferente al actual)
  if (newDni !== user.dni) {
    try {
      const allUsers = await getAllUsers()
      const existingUser = allUsers.find((u: any) => u.dni === newDni && u.id !== user.id)
      if (existingUser) {
        alert(`❌ NO se puede usar un DNI que ya está en uso.\n\nEl DNI ${newDni} ya está registrado por: ${existingUser.firstname} ${existingUser.lastname}`)
        return
      }
    } catch (error) {
      console.error('Error al validar DNI único:', error)
      alert('Error al validar el DNI. Por favor, intente nuevamente.')
      return
    }
  }
  
  try {
    // Actualizar el usuario en el backend
    await updateUser(user.id, { 
      firstname: newFirstname.trim(), 
      lastname: newLastname.trim(), 
      phone: newPhone,
      dni: newDni.trim()
    })
    
    // Recargar la lista de usuarios
    await loadUsers()
    
    alert(`✅ Usuario actualizado exitosamente:\nNombre: ${newFirstname}\nApellido: ${newLastname}\nTeléfono: ${newPhone}\nDNI: ${newDni}`)
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    alert('❌ Error al actualizar el usuario. Por favor, intente nuevamente.')
  }
}

// Helper functions para etiquetas de roles
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    'SUPERADMIN': 'Super Administrador',
    'ADMIN': 'Administrador',
    'COLABORADOR': 'Colaborador',
    'CLIENT': 'Cliente'
  }
  return labels[role] || role
}

function getRoleClass(role: string): string {
  return `role-${role.toLowerCase()}`
}

</script>

<style scoped>
.user-authorization {
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  background-color: #f8f9fa;
  padding: 20px;
  box-sizing: border-box;
}

h2 {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
}

.back-btn:hover {
  background-color: #f0f0f0;
}

/* Contenedor de tarjetas de negocios (SUPERADMIN) */
.business-cards {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

@media (min-width: 768px) {
  .business-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 24px;
  }
}

@media (min-width: 1024px) {
  .business-cards {
    grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
    gap: 28px;
  }
}

@media (min-width: 1280px) {
  .business-cards {
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
    gap: 32px;
  }
}

@media (min-width: 1536px) {
  .business-cards {
    grid-template-columns: repeat(auto-fill, minmax(550px, 1fr));
    gap: 36px;
  }
}

/* Tarjeta de negocio */
.business-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  border-left: 4px solid #ff7a2f;
  overflow: hidden;
}

.business-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.business-card-header {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  padding: 20px;
  border-bottom: 2px solid #ff7a2f;
}

.business-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.business-icon {
  color: #ff7a2f;
  flex-shrink: 0;
}

.business-name {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.business-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Grupos de roles */
.role-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.role-badge {
  font-size: 14px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 12px;
  display: inline-block;
}

.role-badge.role-admin {
  background: #e3f2fd;
  color: #1976d2;
}

.role-badge.role-colaborador {
  background: #f3e5f5;
  color: #7b1fa2;
}

.role-badge.role-client {
  background: #e8f5e9;
  color: #388e3c;
}

.role-count {
  font-size: 14px;
  color: #666;
  font-weight: 400;
}

/* Lista de usuarios */
.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid #ff7a2f;
  transition: all 0.2s;
}

.user-item:hover {
  background: #f0f0f0;
  transform: translateX(2px);
}

.user-item.inactive {
  opacity: 0.6;
  border-left-color: #ccc;
}

.user-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.user-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.user-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7a2f 0%, #ff944d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.user-item-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.user-item-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.user-item-email {
  font-size: 13px;
  color: #666;
}

.user-item-pointsale {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.user-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-btn-small {
  width: 40px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: #e0e0e0;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 3px;
}

.toggle-btn-small.active {
  background: #4caf50;
  justify-content: flex-end;
}

.circle-small {
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s;
}

.icon-btn-small {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background-color 0.2s;
  color: #ff7a2f;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn-small:hover {
  background-color: #f0f0f0;
}

/* Contenedor de grupos de roles (ADMIN) */
.role-groups-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

@media (min-width: 768px) {
  .role-groups-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 24px;
  }
}

@media (min-width: 1024px) {
  .role-groups-container {
    grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
    gap: 28px;
  }
}

@media (min-width: 1280px) {
  .role-groups-container {
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
    gap: 32px;
  }
}

@media (min-width: 1536px) {
  .role-groups-container {
    grid-template-columns: repeat(auto-fill, minmax(550px, 1fr));
    gap: 36px;
  }
}

.role-group-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #ff7a2f;
}

.role-group-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.no-users-message {
  text-align: center;
  padding: 20px;
  color: #999;
  font-style: italic;
}


/* Estado vacío */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.empty-state svg {
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

/* Responsive */
@media (max-width: 767px) {
  .user-authorization {
    padding: 16px;
  }
  
  .business-card-header {
    padding: 16px;
  }
  
  .business-name {
    font-size: 18px;
  }
  
  .business-card-body {
    padding: 16px;
  }
  
  .role-group-card {
    padding: 16px;
  }
}

@media (min-width: 768px) {
  .user-authorization {
    padding: 24px;
    width: 100%;
    max-width: 100%;
  }

  h2 {
    font-size: 28px;
  }

  .subtitle {
    font-size: 16px;
  }
}

@media (min-width: 1024px) {
  .user-authorization {
    padding: 32px;
    width: 100%;
    max-width: 100%;
  }

  h2 {
    font-size: 32px;
  }
}

@media (min-width: 1280px) {
  .user-authorization {
    padding: 40px 48px;
    width: 100%;
    max-width: 100%;
  }
}

@media (min-width: 1536px) {
  .user-authorization {
    padding: 48px 64px;
    width: 100%;
    max-width: 100%;
  }
}
</style>

<style>
/* Override global body styles for full width */
body:has(.user-authorization) {
  display: block !important;
  place-items: unset !important;
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

#app:has(.user-authorization) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
}

router-view:has(.user-authorization) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Asegurar que el contenedor principal use todo el ancho */
.user-authorization {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

@media (min-width: 768px) {
  .user-authorization {
    width: 100% !important;
    max-width: 100% !important;
  }
}
</style>
