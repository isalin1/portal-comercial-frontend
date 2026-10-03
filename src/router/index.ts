import { createRouter, createWebHistory } from 'vue-router'
import { needsTerms, usePortalAuth } from '@/portal/auth'
import { readZone } from '@/portal/zone'
import PanelView from '@/portal/views/PanelView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes: [
    { path: '/', name: 'home', component: () => import('@/portal/views/DirectoryHomeView.vue') },
    { path: '/bienvenida', name: 'welcome', component: () => import('@/portal/views/WelcomeView.vue') },
    { path: '/login', name: 'login', component: () => import('@/portal/views/LoginView.vue') },
    { path: '/registro/cliente/beneficios', name: 'client-benefits', component: () => import('@/portal/views/ClientBenefitsView.vue') },
    { path: '/registro/empresario/beneficios', name: 'empresario-benefits', component: () => import('@/portal/views/EmpresarioPlansView.vue') },
    { path: '/registro/empresario/planes', name: 'empresario-plans', component: () => import('@/portal/views/EmpresarioPlansView.vue') },
    {
      path: '/cuenta/sorteos',
      name: 'raffles',
      component: () => import('@/portal/views/ClientPerksView.vue'),
      meta: { requiresAuth: true, roles: ['CLIENTE'] },
    },
    {
      path: '/cuenta/promociones',
      name: 'promos',
      component: () => import('@/portal/views/ClientPerksView.vue'),
      meta: { requiresAuth: true, roles: ['CLIENTE'] },
    },
    { path: '/registro', name: 'register-type', component: () => import('@/portal/views/RegisterTypeView.vue') },
    { path: '/registro/:tipo', name: 'register', component: () => import('@/portal/views/RegisterView.vue') },
    { path: '/terminos', name: 'terms', component: () => import('@/portal/views/TermsView.vue') },
    { path: '/cuenta', name: 'account', component: () => import('@/portal/views/AccountView.vue'), meta: { requiresAuth: true } },
    { path: '/cuenta/pedidos/:id', name: 'client-order', component: () => import('@/portal/views/ClientOrderView.vue'), meta: { requiresAuth: true, roles: ['CLIENTE', 'EMPRESARIO'] } },
    { path: '/categorias/:id', name: 'category', component: () => import('@/portal/views/CategoryView.vue') },
    { path: '/mercados/:id', name: 'market', component: () => import('@/portal/views/MarketView.vue') },
    { path: '/negocios/:id', name: 'business', component: () => import('@/portal/views/BusinessPublicView.vue') },
    { path: '/negocios/:id/carta', name: 'menu', component: () => import('@/portal/views/MenuView.vue') },
    {
      path: '/panel',
      name: 'panel',
      component: PanelView,
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/agenda',
      name: 'agenda',
      component: () => import('@/portal/views/AgendaView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/agenda/horario',
      name: 'agenda-settings',
      component: () => import('@/portal/views/AgendaSettingsView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/agenda/servicios',
      name: 'agenda-services',
      component: () => import('@/portal/views/AgendaServicesView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/agenda/citas/nueva',
      name: 'agenda-appointment',
      component: () => import('@/portal/views/AgendaAppointmentView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/agenda/citas',
      name: 'agenda-board',
      component: () => import('@/portal/views/AgendaBoardView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/datos',
      name: 'profile',
      component: () => import('@/portal/views/ProfileView.vue'),
      meta: { requiresAuth: true, roles: ['CLIENTE', 'EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/negocios',
      name: 'businesses',
      component: () => import('@/portal/views/BusinessListView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/negocios/nuevo',
      name: 'business-form',
      component: () => import('@/portal/views/BusinessFormView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/negocios/:id',
      name: 'business-edit',
      component: () => import('@/portal/views/BusinessFormView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/puntos',
      name: 'points',
      component: () => import('@/portal/views/PointListView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/puntos/nuevo',
      name: 'point-form',
      component: () => import('@/portal/views/PointFormView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/puntos/:id',
      name: 'point-edit',
      component: () => import('@/portal/views/PointFormView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/resumen',
      name: 'day-summary',
      component: () => import('@/portal/views/DaySummaryView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/clientes',
      name: 'clients',
      component: () => import('@/portal/views/ClientsView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/pedidos',
      name: 'orders',
      component: () => import('@/portal/views/OrdersView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/disponibilidad',
      name: 'availability',
      component: () => import('@/portal/views/AvailabilityView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/servicios',
      name: 'services',
      component: () => import('@/portal/views/ServicesView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/servicios/:categoryId',
      name: 'category-items',
      component: () => import('@/portal/views/ItemListView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/items',
      name: 'items',
      component: () => import('@/portal/views/ItemListView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/items/nuevo',
      name: 'item-form',
      component: () => import('@/portal/views/ItemFormView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/items/:id',
      name: 'item-edit',
      component: () => import('@/portal/views/ItemFormView.vue'),
      meta: { requiresAuth: true, roles: ['EMPRESARIO', 'ADMIN'] },
    },
    {
      path: '/panel/catalogo',
      name: 'catalog',
      component: () => import('@/portal/views/CatalogView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/catalogo/rubros/nuevo',
      name: 'rubro-form',
      component: () => import('@/portal/views/RubroFormView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/catalogo/rubros/:id',
      name: 'rubro-edit',
      component: () => import('@/portal/views/RubroFormView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/catalogo/categorias/nuevo',
      name: 'category-form',
      component: () => import('@/portal/views/CategoryFormView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/catalogo/categorias/:id',
      name: 'category-edit',
      component: () => import('@/portal/views/CategoryFormView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/auditoria',
      name: 'audit',
      component: () => import('@/portal/views/AuditView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/auditoria/:id',
      name: 'audit-detail',
      component: () => import('@/portal/views/AuditDetailView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/zonas',
      name: 'zones',
      component: () => import('@/portal/views/ZonesView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/planes',
      name: 'plans',
      component: () => import('@/portal/views/PlansView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/reportes',
      name: 'reports',
      component: () => import('@/portal/views/ReportsView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/usuarios',
      name: 'empresarios',
      component: () => import('@/portal/views/EmpresariosView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
      path: '/panel/usuarios/:id',
      name: 'vigencia',
      component: () => import('@/portal/views/VigenciaView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = usePortalAuth()
  if (auth.isAuthenticated && needsTerms(auth.user) && to.name !== 'terms') {
    await auth.confirmTerms()
  }
  if (auth.isAuthenticated && needsTerms(auth.user) && to.name !== 'terms') {
    if (to.meta.requiresAuth) return { name: 'terms', query: { next: to.fullPath } }
    auth.logout()
  }
  if (to.name === 'terms' && auth.isAuthenticated && !needsTerms(auth.user)) {
    return auth.homeFor(auth.userType)
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(auth.userType || '')) {
    return { name: 'home' }
  }
  const needsZone = ['category', 'market', 'business', 'menu'].includes(String(to.name))
  if (needsZone && !readZone()) return { name: 'home' }
  return true
})

router.onError((error) => {
  console.error(error)
  const root = document.getElementById('app')
  if (!root?.querySelector('.phone')) {
    root?.insertAdjacentHTML(
      'beforeend',
      '<div class="phone"><main class="body"><p class="error">No se pudo abrir esta pantalla.</p><p><a href="/">Volver al inicio</a></p></main></div>',
    )
  }
})

export default router
