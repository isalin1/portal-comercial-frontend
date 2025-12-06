import type { RouteRecordRaw } from 'vue-router'

export const expensesRoutes: RouteRecordRaw[] = [
  {
    path: '/daily/expenses',
    name: 'expenses-list',
    component: () => import('@/modules/expenses/views/ListExpensesRegisteredView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
  {
    path: '/daily/expenses/register',
    name: 'expenses-register',
    component: () => import('@/modules/expenses/views/ExpensesRegisterView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
  {
    path: '/daily/cash-balance',
    name: 'cash-balance',
    component: () => import('@/modules/expenses/views/CashBalanceView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR'] },
  },
]

