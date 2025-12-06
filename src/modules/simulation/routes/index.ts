export const simulationRoutes = [
  {
    path: '/simulacion-financiera',
    name: 'simulacion-financiera',
    component: () => import('../views/SimulacionFormView.vue'),
  },
  {
    path: '/simulation-calculated',
    name: 'simulation-calculated',
    component: () => import('../views/SimulationCalculatedView.vue'),
  },
]
