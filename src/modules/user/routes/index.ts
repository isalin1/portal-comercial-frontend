import UserCreateRolView from '../views/UserCreateRolView.vue'
import UserCreateRegisterView from '../views/UserCreateRegisterView.vue'
import UserAutorizationView from '../views/UserAutorizationView.vue'

export const userRoutes = [
  {
    path: '/user/create-rol',
    name: 'UserCreateRol',
    component: UserCreateRolView,
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/user/create-register',
    name: 'UserCreateRegister',
    component: UserCreateRegisterView,
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/user/authorization',
    name: 'UserAuthorization',
    component: UserAutorizationView,
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
]
