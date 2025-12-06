import type { RouteRecordRaw } from 'vue-router'

export const plansRoutes: RouteRecordRaw[] = [
  {
    path: '/vigencia-planes',
    name: 'plans-main',
    component: () => import('@/modules/plans/views/PlansMainView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/configure',
    name: 'plans-configure',
    component: () => import('@/modules/plans/views/PlansConfigureView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/register-payment',
    name: 'plans-register-payment',
    component: () => import('@/modules/plans/views/RegisterPaymentView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/validity-list',
    name: 'plans-validity-list',
    component: () => import('@/modules/plans/views/PlansValidityListView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/business/:businessId',
    name: 'business-plan-detail',
    component: () => import('@/modules/plans/views/BusinessPlanDetailView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/business/:businessId/payments',
    name: 'payment-history',
    component: () => import('@/modules/plans/views/PaymentHistoryView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/update-validity',
    name: 'plans-update-validity',
    component: () => import('@/modules/plans/views/UpdateValidityView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['SUPERADMIN'] },
  },
]

