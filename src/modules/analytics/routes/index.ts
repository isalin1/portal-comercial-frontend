import type { RouteRecordRaw } from 'vue-router'

export const analyticsRoutes: RouteRecordRaw[] = [
  {
    path: '/analytics/client-ranking',
    name: 'client-ranking',
    component: () => import('../views/ClientRankingView.vue'),
    meta: {
      requiresAuth: true,
      allowedRoles: ['SUPERADMIN', 'ADMIN', 'COLABORADOR']
    }
  },
  {
    path: '/analytics/month-sales',
    name: 'month-sales',
    component: () => import('../views/MonthSalesView.vue'),
    meta: {
      requiresAuth: true,
      allowedRoles: ['SUPERADMIN', 'ADMIN', 'COLABORADOR']
    }
  },
  {
    path: '/analytics/stock-sales',
    name: 'stock-sales',
    component: () => import('../views/StockSalesView.vue'),
    meta: {
      requiresAuth: true,
      allowedRoles: ['SUPERADMIN', 'ADMIN', 'COLABORADOR']
    }
  }
]

