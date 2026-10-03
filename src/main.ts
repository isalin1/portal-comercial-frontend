import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.config.errorHandler = (err) => {
  console.error(err)
  const root = document.getElementById('app')
  if (root && !root.querySelector('.phone')) {
    root.textContent = 'No se pudo abrir esta pantalla. Actualiza la página.'
  }
}

app.mount('#app')
