# Proceso de Registro de Empresario

## Flujo Completo del Registro

### Paso 1: Registro de Usuario (`RegisterFormView.vue`)

**Ubicación:** `/auth/register?role=ADMIN`

**Campos del formulario:**
1. **Nombres** (texto libre)
2. **Apellidos** (texto libre)
3. **Documento de Identidad** (DNI)
   - Validación: Exactamente 8 dígitos numéricos
   - Regex: `/^\d{8}$/`
4. **Teléfono** (celular)
   - Validación: Exactamente 9 dígitos numéricos
   - Regex: `/^\d{9}$/`
5. **Email** (formato email)
6. **Contraseña** (mínimo 6 caracteres)
7. **Repetir contraseña** (debe coincidir)

**Validaciones en este paso:**
- Las contraseñas deben coincidir
- DNI debe tener exactamente 8 dígitos
- Teléfono debe tener exactamente 9 dígitos

**Acción al completar:**
- Se crea el usuario en el sistema con rol `ADMIN`
- Si el usuario está activo (SUPERADMIN), se hace login automático
- Si el usuario está inactivo, se muestra mensaje de activación pendiente
- **Redirección:** Se redirige a `/register-company-form?userId={id}`

---

### Paso 2: Registro de Datos de la Empresa (`RegisterCompanyFormView.vue`)

**Ubicación:** `/auth/register-company-form?userId={id}`

**Campos del formulario:**
1. **Razón social** (texto libre, requerido)
2. **Nombre comercial** (texto libre, requerido)
3. **Tipo de documento** (select, requerido)
   - Opciones: RUC, DNI, CE, PASAPORTE
4. **Número de documento** (texto, requerido)
   - **Validaciones según tipo:**
     - **DNI:** Exactamente 8 dígitos numéricos
     - **RUC:** Exactamente 11 dígitos numéricos
     - **CE/PASAPORTE:** Entre 6 y 20 caracteres
   - **Validación en tiempo real:**
     - Filtra automáticamente caracteres no numéricos para DNI y RUC
     - Muestra mensaje de error si no cumple el formato
     - Limita la longitud según el tipo de documento
5. **Teléfono** (texto, requerido) ⭐ **NUEVO CAMPO**
   - **Validación:** Exactamente 9 dígitos numéricos
   - **maxlength:** 9
   - **Validación en tiempo real:**
     - Filtra automáticamente caracteres no numéricos
     - Muestra mensaje de error si no tiene 9 dígitos

**Validaciones implementadas:**

#### Validación en Tiempo Real:
- **Número de documento:**
  - Se valida mientras el usuario escribe
  - Filtra caracteres no numéricos para DNI y RUC
  - Muestra mensaje de error debajo del campo si no cumple
  - El campo se marca visualmente con borde rojo si hay error

- **Teléfono:**
  - Se valida mientras el usuario escribe
  - Filtra automáticamente caracteres no numéricos
  - Muestra mensaje de error si no tiene exactamente 9 dígitos
  - El campo se marca visualmente con borde rojo si hay error

#### Validación al Enviar:
1. **Formato del documento:** Verifica que el número de documento cumpla con el formato según su tipo
2. **Formato del teléfono:** Verifica que tenga exactamente 9 dígitos
3. **Unicidad del documento:** Verifica que el número de documento no esté registrado por otro negocio

**Feedback Visual:**
- Campos con error muestran borde rojo (`input-error`)
- Mensajes de error aparecen debajo de cada campo (`error-message`)
- Los mensajes desaparecen cuando el campo es válido

**Diseño Responsive:**
- **Mobile:** Formulario ocupa todo el ancho disponible
- **Desktop (≥769px):** Formulario centrado con max-width 600px
- **Desktop grande (≥1024px):** max-width 700px
- **Desktop extra grande (≥1280px):** max-width 800px

**Acción al completar:**
- Si es creación nueva: Crea el negocio asociado al `userId` recibido
- Si es edición: Actualiza el negocio existente del usuario
- **Redirección:** Se redirige a `/business-presentation`

---

## Resumen de Validaciones Implementadas

### Documento de Identidad (Empresa)
| Tipo | Validación | Longitud Máxima |
|------|------------|-----------------|
| DNI | Exactamente 8 dígitos numéricos | 8 |
| RUC | Exactamente 11 dígitos numéricos | 11 |
| CE | Entre 6 y 20 caracteres | 20 |
| PASAPORTE | Entre 6 y 20 caracteres | 20 |

### Teléfono (Empresa) ⭐ NUEVO
- **Validación:** Exactamente 9 dígitos numéricos
- **Longitud máxima:** 9 caracteres
- **Filtrado automático:** Solo acepta números

### Documento de Identidad (Usuario)
- **Validación:** Exactamente 8 dígitos numéricos (DNI)
- **Longitud máxima:** 8 caracteres

### Teléfono (Usuario)
- **Validación:** Exactamente 9 dígitos numéricos
- **Longitud máxima:** 9 caracteres

---

## Cambios Técnicos Implementados

### Frontend
1. ✅ Campo `phone` agregado al formulario de empresa
2. ✅ Validación en tiempo real para número de documento
3. ✅ Validación en tiempo real para teléfono
4. ✅ Feedback visual con mensajes de error
5. ✅ Diseño responsive y centrado en desktop
6. ✅ Filtrado automático de caracteres no numéricos

### Backend
1. ✅ Campo `phone String?` agregado al modelo `Busines` en Prisma
2. ✅ Campo `phone` agregado al DTO `CreateBusinesDto`
3. ⚠️ **Pendiente:** Ejecutar migración de Prisma:
   ```bash
   cd ../lavanderia-backend
   npx prisma db push
   npx prisma generate
   ```

---

## Flujo Visual del Proceso

```
1. Usuario accede a /auth/register?role=ADMIN
   ↓
2. Completa formulario de registro de usuario
   - DNI: 8 dígitos
   - Teléfono: 9 dígitos
   ↓
3. Sistema crea usuario y redirige a registro de empresa
   ↓
4. Usuario completa formulario de datos de empresa
   - Tipo de documento (RUC/DNI/CE/PASAPORTE)
   - Número de documento (validado según tipo)
   - Teléfono: 9 dígitos ⭐ NUEVO
   ↓
5. Validaciones en tiempo real muestran errores si aplica
   ↓
6. Al enviar, se valida formato y unicidad
   ↓
7. Sistema crea/actualiza negocio
   ↓
8. Redirección a /business-presentation
```

---

## Notas Importantes

1. **El campo teléfono es obligatorio** en el formulario de empresa
2. **Las validaciones son estrictas:** No se aceptan formatos incorrectos
3. **El número de documento de la empresa debe ser único** en el sistema
4. **El formulario es responsive** y se ve bien en mobile y desktop
5. **Los errores se muestran en tiempo real** para mejor experiencia de usuario

