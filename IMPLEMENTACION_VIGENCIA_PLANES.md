
# Propuesta de Implementación: Módulo de Vigencia de Planes

## 1. Estructura de Base de Datos

### Tabla: `plans` (ya existe según la imagen)
```sql
CREATE TABLE plans (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL, -- 'premium', 'pro', 'emprendedor'
  nombrePeriodo VARCHAR(50) NOT NULL, -- 'mensual', 'semestral', 'anual'
  diasPeriodo INTEGER NOT NULL, -- Días de duración del período
  costo DECIMAL(10, 2), -- Precio del plan (actualmente NULL, necesita completarse)
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Nueva Tabla: `business_plans` (relación negocio-plan)
```sql
CREATE TABLE business_plans (
  id SERIAL PRIMARY KEY,
  businesId INTEGER NOT NULL REFERENCES busines(id) ON DELETE CASCADE,
  planId INTEGER NOT NULL REFERENCES plans(id),
  fechaInicio DATE NOT NULL, -- Fecha de inicio del plan
  fechaFin DATE NOT NULL, -- Fecha de vencimiento del plan
  estado VARCHAR(20) DEFAULT 'ACTIVO', -- 'ACTIVO', 'VENCIDO', 'SUSPENDIDO'
  fechaPago DATE, -- Fecha del último pago
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(businesId, planId, fechaInicio) -- Un negocio puede tener múltiples planes históricos
);
```

### Nueva Tabla: `plan_payments` (historial de pagos)
```sql
CREATE TABLE plan_payments (
  id SERIAL PRIMARY KEY,
  businessPlanId INTEGER NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  monto DECIMAL(10, 2) NOT NULL,
  fechaPago DATE NOT NULL,
  metodoPago VARCHAR(50), -- 'TARJETA', 'TRANSFERENCIA', 'EFECTIVO', etc.
  comprobante VARCHAR(255), -- URL o referencia del comprobante
  estado VARCHAR(20) DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'APROBADO', 'RECHAZADO'
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Backend - Estructura del Módulo

### 2.1. Entidades (Prisma Schema)

```prisma
// prisma/schema.prisma

model Plan {
  id            Int      @id @default(autoincrement())
  tipo          String   // 'premium', 'pro', 'emprendedor'
  nombrePeriodo String   // 'mensual', 'semestral', 'anual'
  diasPeriodo   Int      // Días de duración
  costo         Decimal? @db.Decimal(10, 2)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  businessPlans BusinessPlan[]
}

model BusinessPlan {
  id          Int      @id @default(autoincrement())
  businesId   Int
  planId      Int
  fechaInicio DateTime @db.Date
  fechaFin    DateTime @db.Date
  estado      String   @default("ACTIVO") // 'ACTIVO', 'VENCIDO', 'SUSPENDIDO'
  fechaPago   DateTime? @db.Date
  
  business    Busines  @relation(fields: [businesId], references: [id], onDelete: Cascade)
  plan        Plan     @relation(fields: [planId], references: [id])
  payments    PlanPayment[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([businesId, planId, fechaInicio])
  @@index([businesId])
  @@index([estado])
  @@index([fechaFin])
}

model PlanPayment {
  id            Int      @id @default(autoincrement())
  businessPlanId Int
  monto         Decimal  @db.Decimal(10, 2)
  fechaPago     DateTime @db.Date
  metodoPago    String?
  comprobante   String?
  estado        String   @default("PENDIENTE") // 'PENDIENTE', 'APROBADO', 'RECHAZADO'
  
  businessPlan  BusinessPlan @relation(fields: [businessPlanId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([businessPlanId])
  @@index([estado])
}
```

### 2.2. DTOs (Data Transfer Objects)

#### `create-plan.dto.ts`
```typescript
// src/plans/dto/create-plan.dto.ts
import { IsString, IsInt, IsOptional, IsDecimal, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  tipo: string; // 'premium', 'pro', 'emprendedor'

  @IsString()
  nombrePeriodo: string; // 'mensual', 'semestral', 'anual'

  @IsInt()
  @Min(1)
  diasPeriodo: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  costo?: number;
}
```

#### `update-plan.dto.ts`
```typescript
// src/plans/dto/update-plan.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanDto } from './create-plan.dto';

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
```

#### `create-business-plan.dto.ts`
```typescript
// src/business-plans/dto/create-business-plan.dto.ts
import { IsInt, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBusinessPlanDto {
  @IsInt()
  businesId: number;

  @IsInt()
  planId: number;

  @IsDateString()
  fechaInicio: string; // 'YYYY-MM-DD'

  @IsDateString()
  fechaFin: string; // 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  estado?: string; // 'ACTIVO', 'VENCIDO', 'SUSPENDIDO'

  @IsOptional()
  @IsDateString()
  fechaPago?: string;
}
```

#### `create-plan-payment.dto.ts`
```typescript
// src/plan-payments/dto/create-plan-payment.dto.ts
import { IsInt, IsDecimal, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreatePlanPaymentDto {
  @IsInt()
  businessPlanId: number;

  @IsDecimal({ decimal_digits: '0,2' })
  monto: number;

  @IsDateString()
  fechaPago: string;

  @IsOptional()
  @IsString()
  metodoPago?: string;

  @IsOptional()
  @IsString()
  comprobante?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}
```

### 2.3. Servicios

#### `plans.service.ts`
```typescript
// src/plans/plans.service.ts
// Responsabilidades:
// - CRUD de planes
// - Validar que los costos sean positivos
// - Validar tipos y períodos válidos
// - Calcular fecha de vencimiento basado en días del período
```

#### `business-plans.service.ts`
```typescript
// src/business-plans/business-plans.service.ts
// Responsabilidades:
// - Asignar plan a un negocio
// - Calcular automáticamente fechaFin basado en fechaInicio + diasPeriodo
// - Verificar vigencia de planes (actualizar estado a VENCIDO si fechaFin < hoy)
// - Obtener plan activo de un negocio
// - Renovar plan (crear nuevo registro con nueva fecha)
// - Suspender/Reactivar planes
// - Validar que no haya planes activos duplicados para el mismo negocio
```

#### `plan-payments.service.ts`
```typescript
// src/plan-payments/plan-payments.service.ts
// Responsabilidades:
// - Registrar pagos de planes (SOLO SUPERADMIN)
// - Al registrar un pago:
//   * Si es el primer pago del negocio: crear business_plan y activar el negocio
//   * Si el negocio ya tiene plan: renovar o extender el plan existente
//   * Actualizar fechaPago en business_plans
//   * Calcular nueva fechaFin basada en diasPeriodo
//   * Activar el usuario ADMIN asociado al negocio (si estaba inactivo)
// - Historial de pagos por negocio
// - Validar que el monto coincida con el costo del plan
// - Aprobar/rechazar pagos pendientes (SOLO SUPERADMIN)
```

### 2.4. Controladores

#### `plans.controller.ts`
```typescript
// src/plans/plans.controller.ts
// Endpoints:
// GET /plans - Listar todos los planes
// GET /plans/:id - Obtener un plan por ID
// POST /plans - Crear nuevo plan (solo SUPERADMIN)
// PATCH /plans/:id - Actualizar plan (solo SUPERADMIN)
// DELETE /plans/:id - Eliminar plan (solo SUPERADMIN)
// GET /plans/by-type/:tipo - Obtener planes por tipo
```

#### `business-plans.controller.ts`
```typescript
// src/business-plans/business-plans.controller.ts
// Endpoints:
// GET /business-plans - Listar todos los planes de negocios (con filtros)
//   - ADMIN: Solo puede ver su propio plan
//   - SUPERADMIN: Ve todos los planes
// GET /business-plans/business/:businesId - Obtener planes de un negocio específico
// GET /business-plans/business/:businesId/active - Obtener plan activo de un negocio
//   - ADMIN: Solo puede ver su propio plan activo
//   - SUPERADMIN: Puede ver cualquier plan
// POST /business-plans - Asignar plan a negocio (SOLO SUPERADMIN - se hace automáticamente al registrar pago)
// PATCH /business-plans/:id - Actualizar plan de negocio (SOLO SUPERADMIN)
// PATCH /business-plans/:id/renew - Renovar plan (SOLO SUPERADMIN - se hace automáticamente al registrar pago)
// PATCH /business-plans/:id/suspend - Suspender plan (SOLO SUPERADMIN)
// PATCH /business-plans/:id/activate - Reactivar plan (SOLO SUPERADMIN)
// GET /business-plans/expiring - Obtener planes próximos a vencer (próximos 7 días) - SOLO SUPERADMIN
// GET /business-plans/expired - Obtener planes vencidos - SOLO SUPERADMIN
```

#### `plan-payments.controller.ts`
```typescript
// src/plan-payments/plan-payments.controller.ts
// Endpoints:
// GET /plan-payments - Listar pagos (con filtros) - ADMIN puede ver sus propios pagos, SUPERADMIN ve todos
// GET /plan-payments/business/:businesId - Pagos de un negocio
// GET /plan-payments/business-plan/:businessPlanId - Pagos de un plan específico
// POST /plan-payments - Registrar pago (SOLO SUPERADMIN) - Al registrar, activa el negocio y asigna/renueva plan
// PATCH /plan-payments/:id/approve - Aprobar pago (SOLO SUPERADMIN)
// PATCH /plan-payments/:id/reject - Rechazar pago (SOLO SUPERADMIN)
```

### 2.5. Módulos NestJS

```typescript
// src/plans/plans.module.ts
// src/business-plans/business-plans.module.ts
// src/plan-payments/plan-payments.module.ts
// Registrar en app.module.ts
```

## 3. Frontend - Estructura del Módulo

### 3.1. Rutas

```typescript
// src/modules/plans/routes/index.ts
export const plansRoutes: RouteRecordRaw[] = [
  {
    path: '/vigencia-planes',
    name: 'plans-main',
    component: () => import('@/modules/plans/views/PlansMainView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/configure',
    name: 'plans-configure',
    component: () => import('@/modules/plans/views/PlansConfigureView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/register-payment',
    name: 'plans-register-payment',
    component: () => import('@/modules/plans/views/RegisterPaymentView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/validity-list',
    name: 'plans-validity-list',
    component: () => import('@/modules/plans/views/PlansValidityListView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/business/:businessId',
    name: 'business-plan-detail',
    component: () => import('@/modules/plans/views/BusinessPlanDetailView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  },
  {
    path: '/vigencia-planes/update-validity',
    name: 'plans-update-validity',
    component: () => import('@/modules/plans/views/UpdateValidityView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['SUPERADMIN'] },
  },
];
```

### 3.2. Vistas

#### `PlansMainView.vue` (Vista Principal - Submenú)
```
Esta es la vista principal que actúa como un "centro de control" o submenú del módulo.
Se accede desde el botón "Vigencia de Planes" en el Dashboard.

Estructura:
- Header con título "Vigencia de Planes" y botón de regreso al Dashboard
- Grid de tarjetas/botones con las diferentes opciones del módulo

Opciones para SUPERADMIN:
1. "Configuración de Planes"
   - Descripción: Gestionar planes disponibles, editar costos
   - Icono: Configuración/Engranaje
   - Ruta: /vigencia-planes/configure
   - Visible: Solo SUPERADMIN

2. "Registro de Pagos"
   - Descripción: Registrar pagos de planes y activar negocios
   - Icono: Dinero/Pago
   - Ruta: /vigencia-planes/register-payment
   - Visible: Solo SUPERADMIN

3. "Actualización de Vigencias"
   - Descripción: Gestionar vigencias, renovar planes, suspender/reactivar
   - Icono: Calendario/Reloj
   - Ruta: /vigencia-planes/update-validity
   - Visible: Solo SUPERADMIN

4. "Lista de Planes y Vigencias"
   - Descripción: Ver todos los planes activos, vencidos, próximos a vencer
   - Icono: Lista/Tabla
   - Ruta: /vigencia-planes/validity-list
   - Visible: SUPERADMIN

5. "Mi Plan" (si el SUPERADMIN también tiene un negocio)
   - Descripción: Ver detalles del plan propio
   - Icono: Usuario/Perfil
   - Ruta: /vigencia-planes/business/:businessId
   - Visible: Si tiene negocio asociado

Opciones para ADMIN:
1. "Mi Plan"
   - Descripción: Ver detalles de mi plan, estado de vigencia, días restantes
   - Icono: Usuario/Perfil
   - Ruta: /vigencia-planes/business/:businessId (su propio negocio)
   - Visible: ADMIN

2. "Historial de Pagos"
   - Descripción: Ver historial de mis pagos (solo lectura)
   - Icono: Historial/Lista
   - Ruta: /vigencia-planes/business/:businessId (sección de pagos)
   - Visible: ADMIN

Diseño:
- Grid responsive (1 columna móvil, 2-3 columnas desktop)
- Cada tarjeta tiene:
  * Icono grande
  * Título
  * Descripción breve
  * Indicador visual si hay alertas (ej: plan próximo a vencer)
- Estilo consistente con el resto del dashboard
```

#### `PlansValidityListView.vue` (Lista de Planes y Vigencias)
```
Funcionalidades para SUPERADMIN:
- Listar todos los negocios con sus planes activos
- Mostrar estado de vigencia (ACTIVO, VENCIDO, PRÓXIMO A VENCER)
- Mostrar estado del negocio (ACTIVO/INACTIVO)
- Filtros: por estado, por tipo de plan, por negocio, por estado de negocio
- Búsqueda por nombre de negocio
- Indicadores visuales:
  * Verde: Plan activo y vigente
  * Amarillo: Plan próximo a vencer (menos de 7 días)
  * Rojo: Plan vencido
  * Gris: Negocio inactivo (sin plan o plan vencido)
- Acciones rápidas:
  * Ver detalle del plan
  * Registrar pago (navega a RegisterPaymentView con negocio preseleccionado)
  * Suspender/Reactivar plan
  * Ver historial de pagos
- Botón de regreso a PlansMainView

Funcionalidades para ADMIN:
- Ver solo su propio plan y estado de vigencia
- Ver días restantes hasta vencimiento
- Ver historial de sus propios pagos
- NO puede registrar pagos (solo visualización)
- Alerta si el plan está próximo a vencer o vencido
- Botón de regreso a PlansMainView
```

#### `RegisterPaymentView.vue` (Registro de Pagos - SOLO SUPERADMIN)
```
Funcionalidades:
- Formulario para registrar un pago de plan
- Campos:
  * Selección de negocio (dropdown con búsqueda)
  * Selección de plan (dropdown filtrado por tipo)
  * Monto (se autocompleta con el costo del plan, pero editable)
  * Fecha de pago (date picker, default: hoy)
  * Método de pago (dropdown: TARJETA, TRANSFERENCIA, EFECTIVO, etc.)
  * Comprobante (upload de archivo o URL)
  * Notas/observaciones (textarea opcional)
- Validaciones:
  * Monto debe coincidir con el costo del plan (o permitir diferencia con justificación)
  * Negocio es requerido
  * Plan es requerido
- Al guardar:
  * Crea registro en plan_payments
  * Crea/actualiza business_plan
  * Activa el negocio si estaba inactivo
  * Muestra mensaje de confirmación
  * Opción de volver a PlansMainView o registrar otro pago
- Botón de regreso a PlansMainView
- Vista previa del negocio seleccionado (nombre, estado actual, plan actual si tiene)
```

#### `UpdateValidityView.vue` (Actualización de Vigencias - SOLO SUPERADMIN)
```
Funcionalidades:
- Lista de planes con opciones de gestión
- Filtros: por estado, por negocio, por tipo de plan
- Acciones disponibles:
  * Renovar plan manualmente (extender vigencia)
  * Suspender plan (cambiar estado a SUSPENDIDO)
  * Reactivar plan suspendido
  * Ver historial completo del plan
  * Editar fechas de vigencia (con validaciones)
- Vista de calendario mostrando vencimientos próximos
- Alertas de planes próximos a vencer
- Botón de regreso a PlansMainView
- Opción de actualización masiva (seleccionar múltiples planes y aplicar acción)
```

#### `PlansConfigureView.vue` (Configuración de Planes - SOLO SUPERADMIN)
```
Funcionalidades:
- Tabla editable de planes
- Columnas: ID, Tipo, Nombre Período, Días Período, Costo
- Editar costos de cada plan (inline editing)
- Crear nuevos planes (botón "Agregar Plan")
- Eliminar planes (con confirmación)
- Validar que los costos sean números positivos
- Validar que los días del período sean consistentes
- Guardar cambios en batch (botón "Guardar Todos los Cambios")
- Botón de regreso a PlansMainView
- Vista previa de cambios antes de guardar
- Historial de cambios (opcional)
```

#### `BusinessPlanDetailView.vue`
```
Funcionalidades para SUPERADMIN:
- Información detallada del plan del negocio
- Estado del negocio (ACTIVO/INACTIVO)
- Historial completo de pagos
- Fechas de inicio y fin
- Días restantes hasta vencimiento
- Botones para:
  * Registrar nuevo pago (SOLO SUPERADMIN - activa/renueva plan automáticamente)
  * Suspender/Reactivar plan
  * Ver comprobantes de pago
  * Activar/Desactivar negocio manualmente (opcional)

Funcionalidades para ADMIN:
- Información de su propio plan
- Historial de sus pagos (solo lectura)
- Fechas de inicio y fin
- Días restantes hasta vencimiento
- Alerta si el plan está próximo a vencer o vencido
- NO puede registrar pagos ni modificar el plan
```

### 3.3. Componentes

```
- PlanCard.vue - Tarjeta que muestra información de un plan
- PlanStatusBadge.vue - Badge con el estado del plan (ACTIVO, VENCIDO, etc.)
- PaymentHistoryTable.vue - Tabla de historial de pagos
- PlanExpirationAlert.vue - Alerta cuando un plan está próximo a vencer
- MenuOptionCard.vue - Tarjeta reutilizable para las opciones del submenú principal
- BusinessSelector.vue - Selector de negocio con búsqueda (para SUPERADMIN)
- PlanSelector.vue - Selector de plan con filtros por tipo
- ValidityCalendar.vue - Calendario visual de vencimientos (opcional)
- PaymentForm.vue - Formulario reutilizable para registro de pagos
```

### 3.4. API Functions

```typescript
// src/api/lavanderiaApi.ts

// Plans
export async function getPlans() { ... } // ADMIN y SUPERADMIN pueden ver
export async function getPlanById(id: number) { ... }
export async function createPlan(planData: CreatePlanDto) { ... } // SOLO SUPERADMIN
export async function updatePlan(id: number, planData: UpdatePlanDto) { ... } // SOLO SUPERADMIN
export async function deletePlan(id: number) { ... } // SOLO SUPERADMIN

// Business Plans
export async function getBusinessPlans(params?: { businesId?: number, estado?: string }) { 
  // ADMIN: Solo ve su propio plan
  // SUPERADMIN: Ve todos los planes
}
export async function getActiveBusinessPlan(businesId: number) { 
  // ADMIN: Solo puede ver su propio plan activo
  // SUPERADMIN: Puede ver cualquier plan
}
export async function createBusinessPlan(businessPlanData: CreateBusinessPlanDto) { ... } // SOLO SUPERADMIN (se hace automáticamente al registrar pago)
export async function renewBusinessPlan(id: number) { ... } // SOLO SUPERADMIN (se hace automáticamente al registrar pago)
export async function suspendBusinessPlan(id: number) { ... } // SOLO SUPERADMIN
export async function activateBusinessPlan(id: number) { ... } // SOLO SUPERADMIN
export async function getExpiringPlans(days?: number) { ... } // SOLO SUPERADMIN
export async function getExpiredPlans() { ... } // SOLO SUPERADMIN

// Plan Payments
export async function getPlanPayments(params?: { businessPlanId?: number, businesId?: number }) { 
  // ADMIN: Solo ve sus propios pagos
  // SUPERADMIN: Ve todos los pagos
}
export async function createPlanPayment(paymentData: CreatePlanPaymentDto) { ... } // SOLO SUPERADMIN - Activa negocio y asigna/renueva plan
export async function approvePlanPayment(id: number) { ... } // SOLO SUPERADMIN
export async function rejectPlanPayment(id: number) { ... } // SOLO SUPERADMIN
```

### 3.5. Stores (Pinia)

```typescript
// src/modules/plans/stores/plans.store.ts
// Estado:
// - plans: Plan[]
// - businessPlans: BusinessPlan[]
// - activeBusinessPlan: BusinessPlan | null
// - expiringPlans: BusinessPlan[]
// - expiredPlans: BusinessPlan[]

// Acciones:
// - loadPlans()
// - loadBusinessPlans(businesId?: number)
// - loadActiveBusinessPlan(businesId: number)
// - loadExpiringPlans(days?: number)
// - loadExpiredPlans()
// - updatePlanStatus(id: number, estado: string)
```

## 4. Lógica de Negocio

### 4.0. Flujo de Activación de Negocio (IMPORTANTE)

```typescript
// Flujo cuando un ADMIN se registra:
// 1. ADMIN se registra gratuitamente
// 2. Usuario ADMIN queda con isActive = false (INACTIVO)
// 3. Negocio se crea pero NO tiene plan asignado
// 4. ADMIN no puede usar el sistema (excepto login y perfil básico)

// Flujo cuando SUPERADMIN registra el primer pago:
// 1. SUPERADMIN selecciona el negocio y el plan a asignar
// 2. SUPERADMIN ingresa los datos del pago (monto, fecha, método, comprobante)
// 3. Sistema valida que el monto coincida con el costo del plan
// 4. Sistema crea registro en plan_payments con estado 'APROBADO'
// 5. Sistema verifica si el negocio ya tiene un business_plan:
//    a. Si NO tiene plan:
//       - Crear nuevo business_plan con:
//         * businesId = ID del negocio
//         * planId = ID del plan seleccionado
//         * fechaInicio = fecha actual (o fecha del pago)
//         * fechaFin = fechaInicio + diasPeriodo del plan
//         * estado = 'ACTIVO'
//         * fechaPago = fecha del pago
//       - Activar el usuario ADMIN: cambiar isActive = true
//       - Enviar notificación de bienvenida al ADMIN
//    b. Si YA tiene plan:
//       - Si el plan está vencido: crear nuevo business_plan
//       - Si el plan está activo: extender fechaFin = fechaFin actual + diasPeriodo
//       - Actualizar fechaPago en business_plan
//       - Asegurar que estado = 'ACTIVO'
//       - Si el ADMIN estaba inactivo, activarlo
```

### 4.1. Cálculo de Vigencia

```typescript
// Al asignar un plan a un negocio:
function calculateFechaFin(fechaInicio: Date, diasPeriodo: number): Date {
  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + diasPeriodo);
  return fechaFin;
}

// Verificar si un plan está vencido:
function isPlanExpired(fechaFin: Date): boolean {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fechaFin < hoy;
}

// Verificar si un plan está próximo a vencer (menos de X días):
function isPlanExpiringSoon(fechaFin: Date, daysThreshold: number = 7): boolean {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diffTime = fechaFin.getTime() - hoy.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= daysThreshold;
}
```

### 4.2. Renovación de Plan (Automática al Registrar Pago)

```typescript
// La renovación se hace automáticamente cuando SUPERADMIN registra un pago:
// 1. Si el negocio tiene plan activo y vigente:
//    - Extender fechaFin = fechaFin actual + diasPeriodo del plan
//    - Actualizar fechaPago
// 2. Si el negocio tiene plan vencido:
//    - Crear nuevo registro en business_plans con:
//      * fechaInicio = fecha actual (o fecha del pago)
//      * fechaFin = fechaInicio + diasPeriodo del plan
//      * estado = 'ACTIVO'
//      * fechaPago = fecha del pago
//    - Marcar el plan anterior como 'VENCIDO' (opcional, mantener histórico)
// 3. Si el negocio no tiene plan (primera vez):
//    - Crear nuevo business_plan (ver flujo de activación 4.0)
```

### 4.3. Registro de Pago (SOLO SUPERADMIN)

```typescript
// Al registrar un pago (SOLO SUPERADMIN puede hacerlo):
// 1. Validar que el monto coincida con el costo del plan seleccionado
// 2. Crear registro en plan_payments con estado 'APROBADO' (o 'PENDIENTE' si requiere revisión)
// 3. Buscar o crear business_plan para el negocio:
//    a. Si el negocio NO tiene plan activo:
//       - Crear nuevo business_plan con:
//         * fechaInicio = fecha actual (o fecha del pago)
//         * fechaFin = fechaInicio + diasPeriodo del plan
//         * estado = 'ACTIVO'
//       - Activar el usuario ADMIN del negocio (cambiar isActive = true)
//    b. Si el negocio YA tiene plan activo:
//       - Si el plan está vigente: extender fechaFin = fechaFin actual + diasPeriodo
//       - Si el plan está vencido: crear nuevo business_plan con nueva fechaInicio
//       - Actualizar fechaPago en business_plans
//       - Asegurar que el estado sea 'ACTIVO'
// 4. Actualizar fechaPago en business_plans
// 5. Si el negocio estaba inactivo, activarlo automáticamente
```

### 4.4. Tarea Programada (Cron Job)

```typescript
// Ejecutar diariamente (ej: a las 00:00):
// 1. Buscar todos los business_plans con estado 'ACTIVO'
// 2. Verificar si fechaFin < hoy
// 3. Si está vencido:
//    - Cambiar estado a 'VENCIDO'
//    - Opcional: Enviar notificación al negocio
//    - Opcional: Suspender funcionalidades del sistema para ese negocio
```

## 5. Validaciones y Reglas de Negocio

1. **Un negocio solo puede tener UN plan activo a la vez**
2. **No se puede asignar un plan vencido a un negocio**
3. **Al renovar, el nuevo plan debe comenzar después del plan actual**
4. **Los costos deben ser números positivos**
5. **Los días del período deben ser consistentes con el nombre del período**:
   - Mensual: ~30 días
   - Semestral: ~180 días
   - Anual: ~360 días
6. **Solo SUPERADMIN puede crear/editar/eliminar planes**
7. **Solo SUPERADMIN puede registrar pagos y actualizar la vigencia de planes**
8. **Flujo de activación de negocio:**
   - Los empresarios (ADMIN) se registran gratuitamente pero quedan INACTIVOS
   - Cuando SUPERADMIN registra el primer pago de un plan para un negocio:
     * Se crea/actualiza el business_plan con estado 'ACTIVO'
     * Se activa el negocio (cambiar isActive del usuario ADMIN a true)
     * Se calcula fechaInicio y fechaFin del plan
   - Si un plan vence, el negocio puede quedar INACTIVO nuevamente (opcional, según reglas de negocio)
9. **ADMIN puede ver su plan y estado de vigencia, pero NO puede registrar pagos**
10. **Solo SUPERADMIN puede aprobar/rechazar pagos registrados**

## 6. Notificaciones y Alertas

1. **Email/Notificación cuando un plan está próximo a vencer (7 días antes)**
   - Para ADMIN: Notificación personal
   - Para SUPERADMIN: Resumen de todos los planes próximos a vencer
2. **Email/Notificación cuando un plan vence**
   - Para ADMIN: Alerta de que su plan ha vencido y necesita renovación
   - Para SUPERADMIN: Lista de negocios con planes vencidos
3. **Alerta en el dashboard cuando el plan del negocio está próximo a vencer**
   - ADMIN: Ve alerta en su dashboard
   - SUPERADMIN: Ve alertas en dashboard con lista de negocios afectados
4. **Banner de advertencia en la aplicación cuando el plan está vencido**
   - ADMIN: Banner que indica que debe contactar a SUPERADMIN para renovar
   - SUPERADMIN: No ve banner (puede gestionar directamente)
5. **Notificación cuando un negocio es activado por primera vez**
   - ADMIN: Email de bienvenida confirmando activación y detalles del plan

## 7. Integración con Sistema Existente

1. **Middleware para verificar vigencia del plan antes de permitir acceso a funcionalidades premium**
   - Verificar que el negocio tenga un plan ACTIVO
   - Verificar que la fechaFin del plan sea mayor a la fecha actual
   - Si el plan está vencido o el negocio está inactivo, restringir acceso (excepto a rutas básicas como login, perfil, etc.)

2. **Restricción de funcionalidades según el tipo de plan**:
   - Premium: Acceso completo
   - Pro: Acceso limitado a ciertas funciones
   - Emprendedor: Acceso básico

3. **Validación en guards de rutas para verificar plan activo**
   - Guard personalizado: `PlanActiveGuard`
   - Aplicar a rutas que requieren plan activo
   - Redirigir a página de "Plan Vencido" si no tiene plan activo

4. **Integración con registro de usuarios ADMIN:**
   - Al registrar un nuevo ADMIN, el usuario queda INACTIVO por defecto
   - El negocio asociado no tiene plan asignado inicialmente
   - Solo cuando SUPERADMIN registra el primer pago, el negocio se activa

5. **Integración con módulo de autorización de usuarios:**
   - Mostrar estado del plan en la vista de autorización de usuarios (SUPERADMIN)
   - Indicar si un negocio está activo o inactivo por falta de plan

## 8. Migración de Datos

1. **Script para completar los costos de los planes existentes**
2. **Script para asignar planes iniciales a negocios existentes** (opcional)
3. **Migración de Prisma para crear las nuevas tablas**

## 9. Testing

1. **Unit tests para servicios de cálculo de fechas**
2. **Unit tests para validaciones de negocio**
3. **Integration tests para endpoints de API**
4. **E2E tests para flujos completos (asignar plan, renovar, pagar)**

## 10. Consideraciones Adicionales

1. **Auditoría**: Registrar quién y cuándo se realizaron cambios en planes
2. **Historial completo**: Mantener todos los registros históricos de planes (no eliminar)
3. **Backup**: Respaldar información de pagos y planes regularmente
4. **Reportes**: Generar reportes de planes activos, vencidos, ingresos por planes, etc.
5. **Facturación**: Integración futura con sistema de facturación electrónica

## 11. Estructura de Navegación

### 11.1. Flujo de Navegación

```
Dashboard
  └─ Botón "Vigencia de Planes" (/vigencia-planes)
      └─ PlansMainView (Vista Principal - Submenú)
          ├─ Configuración de Planes (/vigencia-planes/configure) [SOLO SUPERADMIN]
          ├─ Registro de Pagos (/vigencia-planes/register-payment) [SOLO SUPERADMIN]
          ├─ Actualización de Vigencias (/vigencia-planes/update-validity) [SOLO SUPERADMIN]
          ├─ Lista de Planes y Vigencias (/vigencia-planes/validity-list) [ADMIN/SUPERADMIN]
          └─ Detalle del Plan (/vigencia-planes/business/:businessId) [ADMIN/SUPERADMIN]
```

### 11.2. Diseño de PlansMainView

```
┌─────────────────────────────────────────────────────────┐
│  ← Volver al Dashboard    Vigencia de Planes           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ ⚙️            │  │ 💰           │  │ 📅           │ │
│  │ Configuración │  │ Registro de  │  │ Actualización│ │
│  │ de Planes     │  │ Pagos        │  │ de Vigencias │ │
│  │               │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ 📋           │  │ 👤           │                    │
│  │ Lista de     │  │ Mi Plan      │                    │
│  │ Planes       │  │              │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 12. Resumen de Permisos y Flujos Clave

### 12.1. Permisos por Rol

**SUPERADMIN:**
- ✅ Crear/editar/eliminar planes
- ✅ Registrar pagos de planes
- ✅ Ver todos los planes y pagos
- ✅ Activar/desactivar planes de negocios
- ✅ Suspender/reactivar planes
- ✅ Ver reportes de planes próximos a vencer y vencidos
- ✅ Activar negocios al registrar el primer pago

**ADMIN (Empresario):**
- ✅ Ver su propio plan y estado de vigencia
- ✅ Ver historial de sus propios pagos (solo lectura)
- ✅ Ver días restantes hasta vencimiento
- ❌ NO puede registrar pagos
- ❌ NO puede modificar su plan
- ❌ NO puede ver planes de otros negocios

### 12.2. Flujo de Activación de Negocio (Resumen)

```
1. ADMIN se registra → Usuario INACTIVO, Sin plan
2. SUPERADMIN registra pago → Crea business_plan + Activa usuario ADMIN
3. ADMIN puede usar el sistema con plan activo
4. Cuando plan vence → Opcional: Desactivar usuario o mantener acceso limitado
5. SUPERADMIN registra nuevo pago → Renueva plan + Reactiva si estaba inactivo
```

### 12.3. Puntos Críticos de Implementación

1. **Al registrar pago (SUPERADMIN):**
   - Validar monto = costo del plan
   - Si es primer pago: crear business_plan + activar usuario
   - Si ya tiene plan: extender o renovar según corresponda
   - Actualizar fechaPago siempre

2. **Verificación de vigencia:**
   - Ejecutar diariamente (cron job)
   - Actualizar estado de planes vencidos
   - Opcional: Desactivar usuarios de negocios con planes vencidos

3. **Restricciones de acceso:**
   - Middleware/Guard que verifique plan activo
   - ADMIN inactivo solo puede acceder a rutas básicas (login, perfil)
   - ADMIN con plan vencido: mostrar advertencia pero permitir acceso limitado (o restringir según política)

