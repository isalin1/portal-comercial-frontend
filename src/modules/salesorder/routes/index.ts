import type { RouteRecordRaw } from 'vue-router'

export const salesOrderRoutes: RouteRecordRaw[] = [
  {
    path: '/sales-orders',
    name: 'sales-orders-list',
    component: () => import('@/modules/salesorder/views/SalesOrderListView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
  {
    path: '/sales-order/:id',
    name: 'sales-order-detail',
    component: () => import('@/modules/salesorder/views/SalesOrderView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
  {
    path: '/sales-order/:id/payment',
    name: 'sales-order-payment',
    component: () => import('@/modules/salesorder/views/PaymentView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
  {
    path: '/daily/sales',
    name: 'sales-payment-today',
    component: () => import('@/modules/salesorder/views/SalesPaymentToDayView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
]


