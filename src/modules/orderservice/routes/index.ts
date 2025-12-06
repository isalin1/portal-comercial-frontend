import type { RouteRecordRaw } from 'vue-router'

export const orderServiceRoutes: RouteRecordRaw[] = [
  {
    path: '/select-category',
    name: 'select-category',
    component: () => import('@/modules/orderservice/views/SelectCategoryView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
  {
    path: '/order-service/:id',
    name: 'order-service-detail',
    component: () => import('@/modules/orderservice/views/OrderServiceView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
  {
    path: '/create-service-order',
    name: 'create-service-order',
    component: () => import('@/modules/orderservice/views/CreateOrderServiceView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
  {
    path: '/order-service/list',
    name: 'order-service-list',
    component: () => import('@/modules/orderservice/views/ListItemOrderServiceView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
  {
    path: '/orders-service-state',
    name: 'orders-service-state',
    component: () => import('@/modules/orderservice/views/OrderServiceStateView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
]

