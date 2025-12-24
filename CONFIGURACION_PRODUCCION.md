# Configuración para Producción

## Problema: Error CORS al registrar usuario

El error ocurre porque el frontend desplegado en `https://namiatech.com` está intentando conectarse a `http://localhost:3002/api` en lugar de la URL del backend en producción.

## Solución

### 1. Configurar Variable de Entorno en el Frontend

El frontend necesita tener configurada la variable de entorno `VITE_LAVANDERIA_API_URL` con la URL del backend en producción.

**Opción A: Archivo `.env.production` (Recomendado)**

Crea un archivo `.env.production` en la raíz del proyecto frontend:

```env
VITE_LAVANDERIA_API_URL=https://api.namiatech.com/api
```

O si el backend está en otro dominio:

```env
VITE_LAVANDERIA_API_URL=https://tu-backend.com/api
```

**Opción B: Variables de entorno del servidor**

Si estás usando un servicio de hosting (Vercel, Netlify, etc.), configura la variable de entorno en el panel de control:

- **Nombre:** `VITE_LAVANDERIA_API_URL`
- **Valor:** `https://api.namiatech.com/api` (o la URL de tu backend)

### 2. Reconstruir el Frontend

Después de configurar la variable de entorno, necesitas reconstruir el frontend:

```bash
npm run build
```

**Importante:** Las variables de entorno de Vite (`VITE_*`) se inyectan en tiempo de build, no en tiempo de ejecución. Por lo tanto, debes reconstruir la aplicación cada vez que cambies estas variables.

### 3. Verificar Configuración de CORS en el Backend

El backend ya está configurado para permitir peticiones desde `https://namiatech.com`. Si necesitas agregar más dominios, edita `../lavanderia-backend/src/main.ts`:

```typescript
app.enableCors({
  origin: [
    'http://localhost:5173',
    'https://namiatech.com',
    'https://www.namiatech.com',
    // Agregar más dominios si es necesario
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Authorization'],
});
```

### 4. Verificar que el Backend esté Accesible

Asegúrate de que:
- El backend esté desplegado y accesible en la URL configurada
- El backend tenga CORS configurado correctamente
- El backend esté escuchando en el puerto correcto

## Verificación

Para verificar que la configuración es correcta:

1. Abre la consola del navegador en `https://namiatech.com`
2. Busca el log: `🔧 API Base URL Final:`
3. Debe mostrar la URL del backend en producción, NO `http://localhost:3002/api`

## Troubleshooting

### Error: "Access to XMLHttpRequest has been blocked by CORS policy"

**Causa:** El backend no tiene configurado CORS para permitir el dominio del frontend.

**Solución:** 
1. Verifica que `https://namiatech.com` esté en la lista de `origin` en `main.ts`
2. Reinicia el servidor del backend después de cambiar la configuración

### Error: "Network Error" o "ERR_FAILED"

**Causa:** El frontend está intentando conectarse a una URL incorrecta o el backend no está disponible.

**Solución:**
1. Verifica que `VITE_LAVANDERIA_API_URL` esté configurada correctamente
2. Reconstruye el frontend: `npm run build`
3. Verifica que el backend esté accesible desde el navegador

### La variable de entorno no se aplica

**Causa:** Las variables de entorno de Vite se inyectan en tiempo de build.

**Solución:**
1. Asegúrate de que el archivo `.env.production` esté en la raíz del proyecto
2. Reconstruye el frontend: `npm run build`
3. Vuelve a desplegar el frontend

## Estructura de Archivos de Entorno

```
lavanderia-frontend/
├── .env                    # Variables para desarrollo (NO subir a git)
├── .env.production        # Variables para producción (NO subir a git)
├── .env.local             # Variables locales (NO subir a git)
└── env.example            # Ejemplo de variables (SÍ subir a git)
```

## Notas Importantes

1. **NUNCA** subas archivos `.env` o `.env.production` al repositorio Git
2. Las variables de entorno deben configurarse en el servidor de producción
3. Después de cambiar variables de entorno, SIEMPRE reconstruye el frontend
4. Verifica que el backend esté accesible desde el navegador antes de desplegar


