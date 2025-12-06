export const quotationRoutes = [
  {
    path: '/quotation/:id',
    name: 'quotation-view',
    component: () => import('../views/QuotationView.vue'),
    props: true, // para que el id llegue como prop
  },
  {
    path: '/quotations',
    name: 'list-quotation',
    component: () => import('../views/ListQuotationView.vue'),
  },
]
