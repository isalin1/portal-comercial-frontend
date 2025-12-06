# Lavandería Frontend

Frontend de la aplicación de gestión de lavandería desarrollado con Vue 3, TypeScript y Vite.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js (versión 16 o superior)
- npm o yarn

### Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   - Copia el archivo `env.example` a `.env`
   - Ajusta la URL de la API según tu configuración:
   ```
   VITE_LAVANDERIA_API_URL=http://localhost:3002/api
   ```

3. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador:**
   - La aplicación estará disponible en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
src/
├── api/                    # Configuración de la API
├── components/             # Componentes reutilizables
├── modules/               # Módulos de la aplicación
│   ├── auth/             # Autenticación
│   ├── busines/          # Gestión de empresa
│   ├── listservice/      # Servicios de lavandería
│   ├── pointsale/        # Puntos de venta
│   ├── quotation/        # Cotizaciones
│   ├── simulation/       # Simulaciones financieras
│   └── user/             # Gestión de usuarios
├── router/               # Configuración de rutas
├── stores/               # Stores de Pinia
└── views/                # Vistas principales
```

## 🔧 Scripts Disponibles

- `npm run dev` - Ejecuta el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción

## 🔐 Autenticación

La aplicación incluye un sistema de autenticación completo con:

- Login/Registro de usuarios
- Verificación de email
- Recuperación de contraseña
- Gestión de roles (ADMIN, SUPERADMIN, COLABORADOR, CLIENT)
- Guards de rutas basados en roles

## 🌐 API Backend

Asegúrate de que el backend esté ejecutándose en `http://localhost:3002` antes de usar la aplicación.

## 🐛 Solución de Problemas

### Error 500 en login
- Verifica que el backend esté ejecutándose
- Revisa la URL de la API en el archivo `.env`

### WebSocket connection refused
- Reinicia el servidor de desarrollo con `npm run dev`
- Verifica que no haya conflictos de puertos

### Error de rutas
- Verifica que todas las vistas estén creadas
- Revisa la configuración de rutas en `src/router/index.ts`

## 📝 Notas de Desarrollo

- El proyecto usa Vue 3 con Composition API
- Estado gestionado con Pinia
- Routing con Vue Router 4
- Peticiones HTTP con Axios
- Styling con CSS vanilla (puedes agregar un framework CSS si lo deseas)

