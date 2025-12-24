# Guía: Configurar Variable de Entorno en GitHub Secrets

## Problema
El frontend en producción necesita conocer la URL del backend. Esta configuración se hace mediante GitHub Secrets.

## Pasos para Configurar

### 1. Acceder a GitHub Secrets

1. Ve a tu repositorio en GitHub: `https://github.com/tu-usuario/lavanderia-frontend`
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral izquierdo, busca **Secrets and variables** → **Actions**
4. Haz clic en **New repository secret** (Nuevo secreto del repositorio)

### 2. Crear el Secret

1. **Name (Nombre):** 
   ```
   VITE_LAVANDERIA_API_URL
   ```
   (Debe ser exactamente este nombre, con mayúsculas y guiones bajos)

2. **Secret (Valor):**
   ```
   https://api.namiatech.com/api
   ```
   (Reemplaza con la URL real de tu backend en producción)

3. Haz clic en **Add secret** (Agregar secreto)

### 3. Verificar que se Creó Correctamente

Deberías ver en la lista de secrets:
- ✅ `VITE_LAVANDERIA_API_URL` (con el icono de ojo para ver/editar)

### 4. Activar el Despliegue

Una vez configurado el secret, el próximo push a la rama `main` activará automáticamente el despliegue con la nueva configuración.

## URLs Comunes para el Backend

Dependiendo de tu configuración, la URL puede ser:

- `https://api.namiatech.com/api`
- `https://backend.namiatech.com/api`
- `https://namiatech.com/api` (si el backend está en el mismo dominio)
- `https://tu-backend.com/api` (si está en otro dominio)

## Verificación Después del Despliegue

1. Abre `https://namiatech.com` en el navegador
2. Abre la consola del desarrollador (F12)
3. Busca el log: `🔧 API Base URL Final:`
4. Debe mostrar la URL de tu backend en producción, **NO** `http://localhost:3002/api`

## Troubleshooting

### El secret no se aplica

**Causa:** El workflow necesita ser ejecutado después de crear el secret.

**Solución:**
1. Haz un pequeño cambio en cualquier archivo (o un commit vacío)
2. Haz push a `main`
3. El workflow se ejecutará automáticamente

### Error: "VITE_LAVANDERIA_API_URL no está configurada"

**Causa:** El secret no está configurado en GitHub.

**Solución:**
1. Sigue los pasos arriba para crear el secret
2. Verifica que el nombre sea exactamente: `VITE_LAVANDERIA_API_URL`
3. Haz push a `main` para activar el despliegue

### La URL sigue siendo localhost

**Causa:** El frontend fue construido antes de configurar el secret.

**Solución:**
1. Verifica que el secret esté configurado correctamente
2. Haz push a `main` para activar un nuevo despliegue
3. Espera a que termine el workflow
4. Verifica en la consola del navegador

## Notas Importantes

- ⚠️ **NUNCA** subas archivos `.env` o `.env.production` al repositorio
- ✅ Los secrets de GitHub son seguros y no se muestran en los logs
- ✅ Puedes actualizar el secret en cualquier momento
- ✅ Después de actualizar el secret, necesitas hacer push a `main` para redesplegar


