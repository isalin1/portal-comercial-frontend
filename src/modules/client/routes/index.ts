import type { RouteRecordRaw } from 'vue-router'
import ClientListView from '../views/ClientListView.vue'
import ClientCreateRegisterView from '../views/ClientCreateRegisterView.vue'

export const clientRoutes: RouteRecordRaw[] = [
  {
    path: '/clients',
    name: 'client-list',
    component: ClientListView,
    meta: {
      requiresAuth: true,
      allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR']
    }
  },
  {
    path: '/clients/create',
    name: 'client-create',
    component: ClientCreateRegisterView,
    meta: {
      requiresAuth: true,
      allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR']
    }
  },
  // {
  //   path: '/clients/:id',
  //   name: 'client-details',
  //   component: () => import('../views/ClientDetailsView.vue'),
  //   meta: {
  //     requiresAuth: true,
  //     allowedRoles: ['ADMIN', 'SUPERADMIN', 'COLABORADOR']
  //   }
  // }
]
