import type { RouteRecordRaw } from 'vue-router'

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/auth-presentation',
    name: 'auth-presentation',
    component: () => import('@/modules/auth/views/AuthPresentationView.vue'),
  },
  {
    path: '/auth',
    name: 'auth',
    redirect: { name: 'auth-presentation' },
    component: () => import('@/modules/auth/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/modules/auth/views/LoginView.vue'),
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/modules/auth/views/RegisterFormView.vue'),
      },
      {
        path: 'register-type',
        name: 'register-type',
        component: () => import('@/modules/auth/views/RegisterTypeView.vue'),
      },
      {
        path: 'register-form',
        name: 'register-form',
        component: () => import('@/modules/auth/views/RegisterFormView.vue'),
      },
    ],
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/modules/auth/views/ForgotPasswordView.vue'),
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('@/modules/auth/views/VerifyEmailView.vue'),
  },
]
