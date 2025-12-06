import type { RouteRecordRaw } from 'vue-router'
import ListServicePresentationView from '../views/ListServicePresentationView.vue'
import CreateServiceView from '../views/CreateServiceView.vue'
import EditServiceView from '../views/EditServiceView.vue'

export const listserviceRoutes: RouteRecordRaw[] = [
  {
    path: '/list-presentation',
    name: 'list-presentation',
    component: ListServicePresentationView,
    meta: {
      requiresAuth: true,
      allowedRoles: ['ADMIN', 'SUPERADMIN']
    }
  },
  {
    path: '/create-service',
    name: 'create-service',
    component: CreateServiceView,
    meta: {
      requiresAuth: true,
      allowedRoles: ['ADMIN', 'SUPERADMIN']
    }
  },
  {
    path: '/edit-service/:id',
    name: 'edit-service',
    component: EditServiceView,
    meta: {
      requiresAuth: true,
      allowedRoles: ['ADMIN', 'SUPERADMIN']
    }
  }
]
