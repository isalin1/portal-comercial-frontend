import { createRouter, createWebHistory } from 'vue-router'
import { authRoutes } from '@/modules/auth/routes'
import { simulationRoutes } from '@/modules/simulation/routes'
import { quotationRoutes } from '@/modules/quotation/routes'
import { userRoutes } from '@/modules/user/routes'
import { listserviceRoutes } from '@/modules/listservice/routes'
import { clientRoutes } from '@/modules/client/routes'
import { orderServiceRoutes } from '@/modules/orderservice/routes'
import { salesOrderRoutes } from '@/modules/salesorder/routes'
import { expensesRoutes } from '@/modules/expenses/routes'
import { analyticsRoutes } from '@/modules/analytics/routes'
import { plansRoutes } from '@/modules/plans/routes'
import DashboardClientView from '@/views/DashboardClientView.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes: [
    { path: '/', redirect: { name: 'auth-presentation' } },
    ...authRoutes,
    ...simulationRoutes,
    ...quotationRoutes,
    ...userRoutes,
    ...listserviceRoutes,
    ...clientRoutes,
    ...orderServiceRoutes,
    ...salesOrderRoutes,
    ...expensesRoutes,
    ...analyticsRoutes,
    ...plansRoutes,

      {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
    {
    path: '/dashboard-client',
    name: 'dashboard-client',
    component: DashboardClientView,
    meta: { requiresAuth: true, allowedRoles: ['COLABORADOR', 'CLIENT'] },
  },
  {
    path: '/personalize-prices',
    name: 'personalize-prices',
    component: () => import('@/modules/pointsale/views/PersonalizePricesView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/my-profile',
    name: 'my-profile',
    component: () => import('@/modules/user/views/MyProfileView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR', 'CLIENT'] },
  },
  {
    path: '/simulation',
    name: 'simulation',
    redirect: { name: 'simulacion-financiera' },
  },
  {
    path: '/quotation',
    name: 'quotation',
    redirect: { name: 'list-quotation' },
  },
  {
    path: '/listservice',
    name: 'listservice',
    redirect: { name: 'list-presentation' },
  },
    {
      path: '/autorizacion-usuarios',
      name: 'user-authorization',
      component: () => import('@/modules/user/views/UserAutorizationView.vue'),
      meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
    },
    {
      path: '/business-presentation',
      name: 'business-presentation',
      component: () => import('@/modules/busines/views/BusinesPresentationView.vue'),
      meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
    },
               {
             path: '/business-register',
             name: 'business-register',
             component: () => import('@/modules/busines/views/BusinesRegisterView.vue'),
             meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
           },
           {
             path: '/pointsale-register',
             name: 'pointsale-register',
             component: () => import('@/modules/pointsale/views/PointSaleRegisterView.vue'),
             meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
           },
           {
             path: '/pointsale-colab',
             name: 'pointsale-colab',
             component: () => import('@/modules/pointsale/views/PointSaleColabView.vue'),
             meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
           },
  ],
})

router.beforeEach(async (to, from, next) => {
  console.log('🚀 Router beforeEach - Navegando a:', to.path, 'Nombre:', to.name)

  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth
  const allowedRoles = to.meta.allowedRoles

  console.log('🔍 Requiere auth:', requiresAuth)
  console.log('🔍 Usuario autenticado:', authStore.isAuthenticated)
  console.log('🔍 Token:', authStore.token ? 'Presente' : 'Ausente')
  console.log('🔍 Usuario:', authStore.user)
  console.log('🔍 Rol del usuario:', authStore.user?.role)

  if (requiresAuth) {
    if (!authStore.isAuthenticated) {
      console.log('❌ No autenticado, redirigiendo a login')
      return next({ name: 'login' })
    }
    const userRole = authStore.user?.role?.toUpperCase()
    console.log('🔍 Rol del usuario (uppercase):', userRole)
    console.log('🔍 Roles permitidos:', allowedRoles)

    if (Array.isArray(allowedRoles) && !allowedRoles.includes(userRole)) {
      console.log('❌ Rol no autorizado')
      alert('No autorizado')
      return next(from.fullPath)
    }
    
    // Validar plan activo para el módulo de autorizaciones
    if (to.path === '/autorizacion-usuarios' && userRole !== 'SUPERADMIN') {
      try {
        const { getBusinessPlanStatus, getBusinessData } = await import('@/api/lavanderiaApi')
        const { lavanderiaApi } = await import('@/api/lavanderiaApi')
        
        let businessId: number | null = null
        
        if (userRole === 'ADMIN') {
          const businesses = await getBusinessData()
          const userBusiness = businesses.find((b: any) => b.userId === authStore.user?.id)
          if (userBusiness) {
            businessId = userBusiness.id
          }
        } else if (userRole === 'COLABORADOR') {
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
              console.log('❌ Plan no activo, bloqueando acceso')
              alert('El módulo de autorizaciones solo está disponible cuando el negocio tiene un plan activo. Por favor, contacta al administrador para renovar tu plan.')
              return next(from.fullPath || { name: 'dashboard' })
            }
          } catch (error: any) {
            if (error.response?.status === 404) {
              console.log('❌ No tiene plan activo, bloqueando acceso')
              alert('El módulo de autorizaciones solo está disponible cuando el negocio tiene un plan activo. Por favor, contacta al administrador para renovar tu plan.')
              return next(from.fullPath || { name: 'dashboard' })
            }
            throw error
          }
        } else {
          console.log('❌ No se encontró el negocio, bloqueando acceso')
          alert('No se pudo verificar el estado del plan. Por favor, contacta al administrador.')
          return next(from.fullPath || { name: 'dashboard' })
        }
      } catch (error) {
        console.error('Error verificando plan activo:', error)
        alert('Error al verificar el estado del plan. Por favor, intenta nuevamente.')
        return next(from.fullPath || { name: 'dashboard' })
      }
    }
  }
  console.log('✅ Navegación permitida')
  next()
})

export default router
