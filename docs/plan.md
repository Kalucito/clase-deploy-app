# TaskFlow — Plan técnico

**Versión:** 1.0 · **Fecha:** 2026-11-07 · **Base:** `docs/spec.md` (RN-xx, CA-xx, CL-xx, D1–D5 se refieren a ese documento)

## 1. Arquitectura general

```
┌──────────────────────┐   HTTPS / JSON    ┌─────────────────────┐   Prisma    ┌────────────┐
│ frontend/ (Next.js)  │ ────────────────▶ │ backend/ (NestJS)   │ ──────────▶ │ PostgreSQL │
│ App Router · React   │   REST /api/*     │ API REST · DTOs     │  migraciones│            │
│ corre en el navegador│ ◀──────────────── │ validación · errores│             │            │
└──────────────────────┘                   └─────────────────────┘             └────────────┘
```

- Dos proyectos independientes en un mismo repositorio (`frontend/`, `backend/`), cada uno con su `package.json`, sin workspaces ni paquetes compartidos.
- El navegador llama **directamente a la API REST** (la URL se inyecta con `NEXT_PUBLIC_API_URL` en el build). El frontend **nunca** accede a PostgreSQL ni tiene `DATABASE_URL`.
- La API es la única que habla con la base, vía Prisma.
- Sin autenticación, usuarios ni sesiones (spec §2). Un único tablero global.
- Despliegue previsto: tres servicios en Railway (postgres, backend con Root Directory `/backend`, frontend con `/frontend`), alineado con `prompts/06-deploy.md`.

### Decisión clave: dónde se filtra
`GET /tasks` devuelve **todas** las tareas y **búsqueda/filtros se aplican en el cliente**. Motivos:
- El tablero es único y de cientos de tareas como máximo (spec §8): el payload es chico.
- Los contadores "2 de 7" (RN-13) y la lista de etiquetas disponibles salen directo de los datos cargados.
- La búsqueda sin distinguir acentos (RN-11) evita depender de la extensión `unaccent` de PostgreSQL.
- El filtrado es instantáneo y sin requests por tecla.

Si el volumen creciera mucho, se migraría a filtros en servidor; el contrato actual no lo impide (se agregarían query params).

## 2. Stack y tecnologías adicionales

El stack obligatorio se usa sin reemplazos: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + dnd-kit; NestJS + class-validator; PostgreSQL + Prisma.

Tecnologías **adicionales**, cada una con su justificación:

| Tecnología | Proyecto | Necesidad |
|---|---|---|
| `@nestjs/config` | backend | Cargar y validar variables de entorno al arrancar (falla rápido si falta `DATABASE_URL`). Es el módulo estándar de NestJS. |
| `class-transformer` | backend | Requerido por `ValidationPipe` para transformar el body a instancias de DTO (trim, normalización). |
| `@tanstack/react-query` | frontend | Caché del servidor, estados de carga/error y, sobre todo, mutaciones con `onMutate`/rollback y serialización de mutaciones: es el núcleo de la actualización optimista (RN-07). Implementarlo a mano duplicaría esa lógica con más riesgo de errores. |
| `zod` + `react-hook-form` + `@hookform/resolvers` | frontend | Validación del formulario en cliente (RN-09). Es la integración estándar de los componentes `Form` de shadcn/ui. |
| `sonner` | frontend | Toasts de error/confirmación; es el componente de notificaciones que usa shadcn/ui. |
| `lucide-react` | frontend | Iconos (vencida, prioridad, acciones); viene con shadcn/ui. |
| Jest + `supertest` | backend | Testing: son los defaults de NestJS. |
| Vitest + Testing Library | frontend | Tests de componentes y lógica; integración nativa con Next/TS moderno. |
| Playwright | frontend | Un smoke E2E del flujo completo (crear, recargar, mover con teclado). Opcional, ver §10. |
| Docker Compose (`docker-compose.yml`, solo desarrollo) | raíz | Levantar PostgreSQL local reproducible. No se usa en producción. |

No se agregan: ORMs alternativos, librerías de estado global (Redux/Zustand), librerías de fechas, ni GraphQL.

## 3. Estructura de carpetas

```
clase-deploy-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/                 # versionadas en git
│   ├── src/
│   │   ├── main.ts                     # bootstrap: prefijo /api, CORS, pipes, filtros, PORT
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   └── env.validation.ts       # validación de variables (class-validator)
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts        # @Global
│   │   │   └── prisma.service.ts
│   │   ├── common/
│   │   │   ├── filters/all-exceptions.filter.ts
│   │   │   └── constants.ts            # límites (título 100, descripción 1000, etc.)
│   │   ├── health/
│   │   │   ├── health.module.ts
│   │   │   └── health.controller.ts
│   │   ├── tasks/
│   │   │   ├── tasks.module.ts
│   │   │   ├── tasks.controller.ts
│   │   │   ├── tasks.service.ts
│   │   │   ├── task.serializer.ts      # fila Prisma → respuesta de la API
│   │   │   └── dto/
│   │   │       ├── create-task.dto.ts
│   │   │       ├── update-task.dto.ts
│   │   │       └── move-task.dto.ts
│   │   └── labels/
│   │       ├── labels.module.ts
│   │       ├── labels.controller.ts
│   │       └── labels.service.ts
│   ├── test/                           # e2e (supertest) contra PostgreSQL de test
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # fuentes, <Providers>, <Toaster>
│   │   │   ├── page.tsx                # "/" → <BoardPage/>
│   │   │   ├── error.tsx               # error boundary de render
│   │   │   ├── not-found.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                     # componentes shadcn/ui generados
│   │   │   ├── board/                  # Board, BoardColumn, TaskCard, DragOverlayCard,
│   │   │   │                           # BoardSkeleton, BoardError, EmptyBoard, NoResults
│   │   │   ├── tasks/                  # TaskDialog, TaskForm, TagInput, DeleteTaskDialog,
│   │   │   │                           # PriorityBadge, DueDate
│   │   │   └── filters/                # FilterBar, SearchInput, MultiSelectFilter
│   │   ├── hooks/                      # useTasks, useTaskMutations, useFilters, useBoardDnd
│   │   ├── lib/
│   │   │   ├── api/                    # client.ts (fetch + ApiError), tasks.ts, labels.ts
│   │   │   ├── board.ts                # agrupar por estado, aplicar movimiento (puro)
│   │   │   ├── filters.ts              # aplicar filtros / normalizar texto (puro)
│   │   │   ├── dates.ts                # hoy local, isOverdue (puro)
│   │   │   ├── validation.ts           # esquemas zod del formulario
│   │   │   ├── constants.ts            # columnas, límites, etiquetas de UI
│   │   │   └── utils.ts                # cn() de shadcn
│   │   ├── providers/query-provider.tsx
│   │   └── types/task.ts               # Task, TaskStatus, Priority, ApiErrorBody
│   ├── components.json                 # configuración shadcn/ui
│   ├── .env.example
│   └── package.json
├── docker-compose.yml                  # solo PostgreSQL de desarrollo
├── docs/                               # spec.md, plan.md, tasks.md
├── prompts/
└── .gitignore                          # .env*, node_modules, .next, dist (excepto .env.example)
```

## 4. Modelo de datos

### 4.1 Esquema Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TaskStatus {
  pendiente
  en_progreso
  en_revision
  hecho
}

enum Priority {
  baja
  media
  alta
}

model Task {
  id          String     @id @default(uuid()) @db.Uuid
  title       String     @db.VarChar(100)
  description String?    @db.VarChar(1000)
  status      TaskStatus @default(pendiente)
  priority    Priority   @default(media)
  dueDate     DateTime?  @db.Date
  position    Int
  createdAt   DateTime   @default(now()) @db.Timestamptz(3)
  updatedAt   DateTime   @default(now()) @db.Timestamptz(3) // sin @updatedAt: se gestiona a mano (ver 4.3)
  labels      Label[]

  @@index([status, position])
  @@map("tasks")
}

model Label {
  id             String @id @default(uuid()) @db.Uuid
  name           String @db.VarChar(20)        // texto tal cual se mostró la primera vez
  normalizedName String @unique @db.VarChar(20) // trim + minúsculas: identidad de la etiqueta
  tasks          Task[]

  @@map("labels")
}
```

- **Relación Task–Label:** muchos a muchos **implícita** de Prisma (tabla `_LabelToTask`). No hace falta atributos en la relación, así que no se justifica una tabla intermedia explícita.
- **Etiquetas huérfanas:** no se borran. `GET /labels` devuelve solo las que tienen al menos una tarea (`tasks: { some: {} }`), lo que cumple CA-08.8 sin lógica de limpieza.
- **Sin entidades de usuario, sesión, autenticación ni permisos.**

### 4.2 Restricciones

| Restricción | Mecanismo |
|---|---|
| Estado y prioridad válidos | `enum` de PostgreSQL |
| Título obligatorio, 1–100 | `NOT NULL` + `VARCHAR(100)` + `CHECK (char_length(btrim(title)) >= 1)` |
| Descripción ≤ 1000 | `VARCHAR(1000)` |
| Posición ≥ 0 | `CHECK (position >= 0)` |
| Etiqueta única sin distinguir mayúsculas | `UNIQUE (normalizedName)` |
| Vencimiento sin hora | `DATE` |

Prisma no expresa `CHECK`: se agregan editando el SQL de la migración (`prisma migrate dev --create-only` y luego completar el archivo). Los límites de etiquetas por tarea (máx. 10) se validan solo en la API, no en la base.

La unicidad `(status, position)` **no** se declara como constraint: Prisma no soporta restricciones diferibles y un `UNIQUE` normal fallaría durante los desplazamientos intermedios. La contigüidad (RN-03) la garantiza el servicio dentro de una transacción con lock (4.4).

### 4.3 Fechas
- `dueDate`: `DATE`; viaja como `"YYYY-MM-DD"`. La API no interpreta zonas horarias. "Vencida" (D4) se calcula **en el cliente** con la fecha local del navegador.
- `createdAt`/`updatedAt`: `timestamptz`, ISO 8601 en UTC.
- `updatedAt` no usa `@updatedAt` porque Prisma lo pisaría también al desplazar posiciones de tareas vecinas. La spec lo limita a cambios de la propia tarea, así que el servicio lo setea explícitamente solo en crear, editar y mover **esa** tarea; los desplazamientos de vecinas se hacen con `updateMany` que toca solo `position`.

### 4.4 Ordenamiento
- `position` entero 0-based, **contiguo** por columna (RN-03). Orden de lectura: `ORDER BY status, position`.
- Operaciones (todas dentro de `prisma.$transaction` interactiva):
  - **Crear** (RN-04): `updateMany(status=S, position++)` y se inserta con `position = 0`.
  - **Eliminar**: se borra y `updateMany(status=S, position > p, position--)`.
  - **Mover dentro de la columna** `a → b` (b acotado a `0..n-1`, CL-14): si `b > a`, `position--` en `(a, b]`; si `b < a`, `position++` en `[b, a)`; la tarea queda en `b`.
  - **Mover a otra columna** (b acotado a `0..n`): origen `position--` donde `> a`; destino `position++` donde `>= b`; la tarea queda con el nuevo estado y `b`.
  - **Editar con cambio de estado** (RN-05): igual que mover entre columnas, con `b = n` (final).
- **Concurrencia (CL-13):** al inicio de cada transacción de escritura se toma `pg_advisory_xact_lock(<constante>)` con `$queryRaw`. Es un lock global liviano: hay un solo tablero y poco tráfico, y serializa las escrituras que reordenan, evitando posiciones duplicadas o con huecos. Se libera solo al terminar la transacción.
- Política de ediciones concurrentes: el último guardado gana (D5), sin versionado.

### 4.5 Migraciones reproducibles
- `prisma/migrations/` se versiona; la migración inicial incluye enums, tablas, índices y `CHECK`.
- Desarrollo: `npx prisma migrate dev`. Producción/CI: `npx prisma migrate deploy` (en Railway, como comando previo al deploy del backend).
- `prisma generate` forma parte del build (`postinstall` o script `build`).
- Nunca se usa `migrate dev` ni `db push` contra producción.
- Al implementar se verifica la versión vigente de Prisma y sus requisitos de configuración (por ejemplo, si requiere `prisma.config.ts` o adaptadores de driver) y se ajusta el esquema anterior a esa versión.

## 5. Diseño del backend (NestJS)

### 5.1 Módulos

| Módulo | Contenido |
|---|---|
| `AppModule` | Importa `ConfigModule` (global, con validación), `PrismaModule`, `TasksModule`, `LabelsModule`, `HealthModule`. |
| `PrismaModule` (global) | `PrismaService extends PrismaClient`: conecta en `onModuleInit`, desconecta en `onModuleDestroy`. |
| `TasksModule` | `TasksController`, `TasksService`, serializer, DTOs. |
| `LabelsModule` | `LabelsController`, `LabelsService` (solo lectura). |
| `HealthModule` | `GET /api/health` (consulta `SELECT 1`) para el healthcheck de Railway. |

### 5.2 Responsabilidades
- **Controladores:** routing, `ParseUUIDPipe` para `:id`, códigos HTTP. Sin lógica de negocio.
- **Servicios:** reglas de negocio (RN-xx), transacciones, normalización de etiquetas, ordenamiento.
- **Serializer:** convierte la fila Prisma a la respuesta pública (`labels` como `string[]`, `dueDate` como `YYYY-MM-DD`, `description: null` si vacía).
- **DTOs:** única fuente de validación de entrada.

### 5.3 DTOs y validaciones

`ValidationPipe` global: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

**`CreateTaskDto`**
| Campo | Reglas |
|---|---|
| `title` | `@Transform(trim)`, `@IsString`, `@IsNotEmpty`, `@MaxLength(100)` |
| `description?` | `@IsOptional`, `@IsString`, `@MaxLength(1000)`; cadena vacía se guarda como `null` |
| `status?` | `@IsEnum(TaskStatus)`; por defecto `pendiente` |
| `priority?` | `@IsEnum(Priority)`; por defecto `media` |
| `dueDate?` | `@IsOptional`, `@IsDateString({strictSeparator: true})` con formato `YYYY-MM-DD` válido (se rechaza `2026-02-31`) |
| `labels?` | `@IsArray`, `@ArrayMaxSize(10)`, cada ítem `@IsString`, trim, `@Length(1,20)` |

**`UpdateTaskDto`:** mismos campos, todos opcionales (parche parcial). `description` y `dueDate` aceptan `null` para vaciarlos (`@ValidateIf(v => v !== null)`). `title` no admite `null`. Se implementa explícitamente (no `PartialType` ciego) para controlar los `null`.

**`MoveTaskDto`:** `status` (`@IsEnum`), `position` (`@IsInt`, `@Min(0)`).

**Normalización de etiquetas (servicio):** `trim`; descarta vacías; deduplica sin distinguir mayúsculas dentro de la tarea (CL-05); la etiqueta se busca por `normalizedName` y, si no existe, se crea conservando el texto recibido.

**Validación de entorno** (`env.validation.ts`): `DATABASE_URL` requerido; `PORT` numérico (por defecto 3001); `CORS_ORIGIN` requerido en producción (lista separada por comas); `NODE_ENV`.

### 5.4 Manejo global de errores

Un `AllExceptionsFilter` (`@Catch()`) unifica **todas** las respuestas de error con este formato:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Los datos enviados no son válidos",
  "details": [{ "field": "title", "message": "El título no puede superar los 100 caracteres" }]
}
```

| Origen | Resultado |
|---|---|
| Errores de `ValidationPipe` | 400 con `details` por campo (el pipe usa `exceptionFactory` para devolver `{field, message}` en español) |
| `UUID` inválido en `:id` | 400 |
| `NotFoundException` / Prisma `P2025` | 404 `"La tarea no existe"` |
| Prisma `P2002` (unicidad) | 409 |
| Prisma `P1001`/`P1002` (base inaccesible) y errores de conexión | 503 |
| Cualquier otro error | 500 con mensaje genérico; el detalle solo se registra en el log (no se filtra información técnica, CA-11.4) |

El filtro registra con el `Logger` de Nest los 5xx con su stack.

### 5.5 Bootstrap (`main.ts`)
- `app.setGlobalPrefix('api')`.
- `app.enableCors({ origin: CORS_ORIGIN.split(','), methods: ['GET','POST','PATCH','DELETE'], maxAge: 600 })` (sin `credentials`: no hay cookies ni sesión).
- `app.useGlobalPipes(...)`, `app.useGlobalFilters(...)`.
- `app.enableShutdownHooks()`.
- `await app.listen(process.env.PORT ?? 3001, '0.0.0.0')`.

## 6. Contrato de API REST

Base: `{API_URL}/api`. JSON UTF-8. Sin autenticación.

### 6.1 Recurso `Task`

```json
{
  "id": "7b1e0a2e-5d1c-4a0e-9c3e-1d2f3a4b5c6d",
  "title": "Preparar demo",
  "description": "Texto opcional" ,
  "status": "pendiente",
  "priority": "media",
  "dueDate": "2026-11-20",
  "labels": ["frontend", "demo"],
  "position": 0,
  "createdAt": "2026-11-07T14:03:11.120Z",
  "updatedAt": "2026-11-07T14:03:11.120Z"
}
```
`description` y `dueDate` son `null` cuando no existen. `status`: `pendiente | en_progreso | en_revision | hecho`. `priority`: `baja | media | alta`.

### 6.2 Endpoints

| Método y ruta | Descripción | Body | Respuesta |
|---|---|---|---|
| `GET /health` | Estado del servicio y de la base | — | `200 {"status":"ok"}` / `503` |
| `GET /tasks` | Todas las tareas, ordenadas por columna (orden fijo del tablero) y `position` | — | `200 Task[]` |
| `GET /tasks/:id` | Una tarea (RF-03) | — | `200 Task` · `404` |
| `POST /tasks` | Crea al **principio** de la columna indicada (RN-04) | `CreateTaskDto` | `201 Task` · `400` |
| `PATCH /tasks/:id` | Edita campos (parcial). Si cambia `status`, va al final de la columna destino (RN-05) | `UpdateTaskDto` | `200 Task` · `400` · `404` |
| `DELETE /tasks/:id` | Elimina y compacta posiciones | — | `204` · `404` |
| `PATCH /tasks/:id/move` | Mueve/reordena: deja la tarea en `status` con índice final `position` (RN-06) | `MoveTaskDto` | `200 Task` · `400` · `404` |
| `GET /labels` | Etiquetas en uso, ordenadas alfabéticamente | — | `200 string[]` |

### 6.3 Semántica de `move`
- `position` es el **índice final** de la tarea en la columna destino, tal como queda después de moverla (0 = primera).
- Un valor fuera de rango se acota al rango válido; no es error (CL-14).
- Mover a la misma posición y estado es una operación válida sin cambios (`200`, sin tocar `updatedAt`).
- Atómico: o se aplican todos los desplazamientos o ninguno (RN-06).

### 6.4 Ejemplos

`POST /api/tasks`
```json
{ "title": "Preparar demo", "status": "pendiente", "priority": "alta", "dueDate": "2026-11-20", "labels": ["Demo", "demo"] }
```
→ `201`, `labels: ["Demo"]` (deduplicada, CL-05).

`PATCH /api/tasks/{id}/move`
```json
{ "status": "en_revision", "position": 2 }
```

`PATCH /api/tasks/{id}` (vaciar fecha)
```json
{ "dueDate": null }
```

## 7. Diseño del frontend (Next.js)

### 7.1 Páginas
- Una sola ruta **`/`**: el tablero (spec §1).
- `app/page.tsx` es un Server Component mínimo que renderiza el componente cliente del tablero. Los datos **no** se piden en el servidor: el navegador consulta la API pública, lo que permite los estados de carga/error de la spec (CA-01.3/01.4) y evita que el servidor de Next necesite conocer la URL interna del backend.
- `error.tsx` (boundary de render) y `not-found.tsx` (rutas inexistentes).

### 7.2 Componentes principales

| Componente | Responsabilidad |
|---|---|
| `Board` | Orquesta `DndContext`, columnas, `DragOverlay`, estados (cargando, error, vacío, sin resultados). |
| `BoardColumn` | Zona droppable + `SortableContext`; título, contador (`n` o `n de total` con filtros), placeholder de columna vacía. Se oculta según filtro de estado (D2). |
| `TaskCard` | `useSortable`; muestra título, `PriorityBadge`, `DueDate` (con indicador de vencida), etiquetas. Clic abre el modal. Deshabilitada para arrastre con filtros activos (D1). |
| `DragOverlayCard` | Copia flotante de la tarjeta durante el arrastre. |
| `FilterBar` | Búsqueda con debounce, filtros multiselección de prioridad/etiqueta/estado, botón "Limpiar filtros". |
| `TaskDialog` / `TaskForm` | Modal único para crear, consultar y editar; incluye fechas de creación/modificación en modo edición; confirmación de descarte si hay cambios sin guardar (CL-22). |
| `TagInput` | Chips de etiquetas con límites (10 / 20 caracteres). |
| `DeleteTaskDialog` | `AlertDialog` de confirmación con el título de la tarea (CA-05.1). |
| `BoardSkeleton`, `BoardError`, `EmptyBoard`, `NoResults` | Estados de carga, error con "Reintentar", tablero vacío y sin resultados (CA-01.x, CA-08.7). |

Componentes shadcn/ui a instalar: `button`, `dialog`, `alert-dialog`, `input`, `textarea`, `select`, `badge`, `dropdown-menu`, `form`, `label`, `popover`, `skeleton`, `sonner`, `tooltip`, `scroll-area`.

### 7.3 Gestión del estado

| Tipo de estado | Dónde vive |
|---|---|
| Datos del servidor (tareas, etiquetas) | TanStack Query (`['tasks']`, `['labels']`) |
| Filtros y búsqueda | `useFilters` (estado local en `Board`, **no** persistido, RN-16) |
| Modal (abierto, tarea en edición, confirmación de borrado) | estado local de `Board` |
| Arrastre en curso | estado local de `useBoardDnd` (ver 7.5) |
| Formulario | `react-hook-form` |

Los filtros se aplican con funciones puras de `lib/filters.ts` sobre la lista cargada (RN-11/RN-12); las tareas se agrupan por estado y orden con `lib/board.ts`.

### 7.4 Comunicación con el backend
- `lib/api/client.ts`: wrapper de `fetch` sobre `process.env.NEXT_PUBLIC_API_URL`; parsea el cuerpo de error unificado a una clase tipada `ApiError { status, message, details }`; un fallo de red se convierte en `ApiError` con mensaje "No se pudo conectar con el servidor".
- `lib/api/tasks.ts`, `lib/api/labels.ts`: funciones tipadas por endpoint.
- Hooks de TanStack Query para lecturas y mutaciones. `retry: 1` en lecturas; **sin reintentos** en mutaciones (evita duplicados, CL-18).
- Botones de guardar/eliminar se deshabilitan mientras la mutación está en curso.

### 7.5 Drag & drop con dnd-kit y actualización optimista

**Configuración**
- `@dnd-kit/core` + `@dnd-kit/sortable` (un `SortableContext` por columna, patrón de múltiples contenedores). Cada columna es además `useDroppable` para aceptar soltar en columnas vacías.
- Sensores: `PointerSensor` (activación por distancia de 5 px, para no confundir con el clic), `TouchSensor` (retraso 200 ms con tolerancia, CA-06.8) y `KeyboardSensor` (accesibilidad, CA-11.5).
- `DragOverlay` para la tarjeta flotante; la original queda atenuada (CA-06.2). La columna destino se resalta con `isOver`; el punto de inserción lo da el desplazamiento de las tarjetas de `SortableContext`.
- Con filtros activos: `useSortable({ disabled: true })` y aviso "Limpiá los filtros para mover tareas" (D1, RN-14, CA-06.7).

**Flujo**
1. `onDragStart`: se toma una instantánea del arrastre (`activeId`, columnas actuales).
2. `onDragOver`: se mueve la tarjeta entre columnas **solo en un estado local de arrastre** (copia de `{status → ids[]}`), sin tocar la caché ni la red.
3. `onDragEnd`:
   - Si se soltó fuera de una columna o en el mismo lugar → se descarta el estado local, sin llamada (CA-06.6, CA-07.2).
   - Si no, se calcula `{ status, position }` (índice final en la columna destino) y se dispara la mutación `moveTask`.
4. **`onMutate`** (optimista): `cancelQueries(['tasks'])`, guarda la caché previa como contexto y aplica el movimiento a `['tasks']` con la función pura `applyMove(tasks, id, status, position)`, que replica la lógica del backend (reasigna posiciones contiguas).
5. **`onError`**: restaura `['tasks']` con el contexto guardado y muestra un toast de error (RN-07, CA-06.4).
6. **`onSettled`**: `invalidateQueries(['tasks'])` para reconciliar con el servidor (posiciones definitivas y cambios de otros visitantes).
7. **Serialización:** las mutaciones de movimiento comparten un `scope` de mutación (`scope: { id: 'board-moves' }`), de modo que se ejecutan una a la vez y en orden. Así un segundo arrastre rápido no compite con el primero y el rollback restaura un estado coherente.
8. `onDragCancel` (Esc) → se descarta el estado local.

La edición con cambio de estado desde el modal y la creación usan mutaciones **no optimistas** (esperan la respuesta y luego invalidan la caché), porque el modal ya ofrece un estado "guardando" y los errores se muestran junto al formulario (CA-02.5).

### 7.6 Manejo de errores en el frontend
| Situación | Tratamiento |
|---|---|
| Fallo al cargar el tablero | `BoardError` con "Reintentar" (CA-01.4) |
| Error de validación del servidor (400) al guardar | Se mapean `details[].field` a errores del formulario |
| Error al mover | Rollback + toast (RN-07) |
| Error al guardar/eliminar | Modal abierto + mensaje; la tarea no cambia (CA-02.5, CA-05.4) |
| `404` al editar/consultar | Toast "La tarea ya no existe" y refresco del tablero (CA-03.2, CA-04.5, CL-12) |
| `404` al eliminar | Se trata como éxito (CA-05.5) |
| Error inesperado de render | `error.tsx` |

Los mensajes están en español y nunca exponen detalles técnicos.

### 7.7 Validación en el frontend
Esquema `zod` en `lib/validation.ts` con las mismas reglas que los DTOs (título 1–100 tras trim, descripción ≤ 1000, ≤ 10 etiquetas de 1–20 caracteres, estado/prioridad válidos, fecha válida). Contadores de caracteres en título y descripción (CA-02.3). **El backend sigue siendo la fuente de verdad** (RN-09). Como los proyectos son independientes, los límites se declaran en `constants.ts` de cada uno; el test E2E y los tests de contrato detectan divergencias.

### 7.8 UI
Tailwind + tokens de shadcn/ui, tema claro (modo oscuro opcional vía clase), diseño minimalista. Responsive: en escritorio 4 columnas en grilla; en pantallas angostas, scroll horizontal con *snap* por columna (CA-11.2). Scroll vertical interno por columna (CL-19). Vencidas: icono + color + texto "Vencida" (CA-09.1, no depender solo del color).

## 8. Configuración y variables de entorno

### Backend (`backend/.env.example`)
```
DATABASE_URL=postgresql://taskflow:taskflow@localhost:5432/taskflow?schema=public
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Frontend (`frontend/.env.example`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
`NEXT_PUBLIC_API_URL` se **incorpora en el build**: en Railway debe estar cargada antes del primer deploy del frontend (como indica `prompts/06-deploy.md`).

### Reglas
- `.env` y `.env.local` en `.gitignore`; solo se versionan los `.env.example`, sin credenciales reales (el repositorio es público).
- Backend: escucha en `process.env.PORT` y `0.0.0.0`; `CORS_ORIGIN` admite varios orígenes separados por coma; en producción debe ser el dominio público del frontend.
- Base local: `docker-compose.yml` con `postgres` (usuario/clave de desarrollo, volumen nombrado, puerto 5432). Cadena de conexión únicamente por `DATABASE_URL`.

### Scripts previstos
| Proyecto | Scripts |
|---|---|
| backend | `start:dev`, `build` (incluye `prisma generate`), `start:prod`, `prisma:migrate:dev`, `prisma:migrate:deploy`, `test`, `test:e2e`, `lint` |
| frontend | `dev`, `build`, `start`, `test`, `lint`, `typecheck` |

## 9. Decisiones técnicas justificadas

| # | Decisión | Justificación | Alternativa descartada |
|---|---|---|---|
| T1 | Filtrado en el cliente | Pocos datos, contadores y etiquetas triviales, búsqueda sin acentos sin extensiones | Filtros en SQL: más endpoints y `unaccent` sin beneficio a esta escala |
| T2 | Posiciones enteras contiguas con `updateMany` en transacción + advisory lock | Cumple RN-03 de forma simple y verificable; el lock global es aceptable para un tablero único | *Fractional indexing*: evita desplazamientos pero rompe "posición contigua" y agrega complejidad; `UNIQUE` en `(status, position)`: choca con los desplazamientos intermedios |
| T3 | `PATCH /tasks/:id/move` separado de `PATCH /tasks/:id` | El movimiento tiene reglas propias (desplazamientos, atomicidad, optimista) y payload mínimo | Un solo `PATCH` con `position`: mezcla semánticas y complica la validación |
| T4 | Relación implícita M–N Task–Label con `normalizedName` único | Sin atributos en la relación; unicidad case-insensitive en la base (CL-05) | Tabla intermedia explícita o `String[]` en `Task`: este último impide filtros e identidad de etiquetas consistentes |
| T5 | Etiquetas huérfanas se conservan y `GET /labels` filtra las usadas | Evita lógica de limpieza en cada edición/borrado | Borrado automático: más código y más casos de concurrencia |
| T6 | `updatedAt` manual | Los desplazamientos de vecinas no deben alterar su fecha de modificación (spec §4) | `@updatedAt`: pisaría la fecha en cada reordenamiento |
| T7 | "Vencida" calculada en el cliente | La spec la define con la fecha local del navegador (D4) | Calcularla en el servidor: zona horaria ambigua |
| T8 | Fecha de vencimiento como `DATE` / `YYYY-MM-DD` | Sin hora ni zonas horarias, evita desfases por UTC | `timestamptz`: desfase de un día según la zona |
| T9 | TanStack Query para el estado de servidor | Optimismo con rollback, serialización de mutaciones, estados de carga/error integrados | Estado manual con `useReducer`: más código propio y más riesgo |
| T10 | Cliente → API directa con `NEXT_PUBLIC_API_URL` | Cumple "toda operación pasa por la API REST"; es el esquema del prompt de deploy (variable de build) | Proxy con `rewrites` de Next: agrega un salto y acopla el despliegue |
| T11 | Datos del tablero cargados en el cliente, no en SSR | Estados de carga/error requeridos; no hay SEO ni contenido público que indexar | SSR/RSC con `fetch` en servidor: necesita URL de backend accesible desde el servidor y complica el optimismo |
| T12 | Formato de error único con `details` por campo | Consistencia (§6 de la consigna) y mapeo directo a errores de formulario | Errores por defecto de Nest: formatos distintos entre validación y excepciones |
| T13 | Sin `credentials` en CORS | No hay cookies ni sesión | `credentials: true` innecesario y más permisivo |
| T14 | Prefijo `/api` y `GET /api/health` | Healthcheck de Railway y separación clara de rutas | Sin prefijo |
| T15 | npm en cada proyecto, sin workspaces | Los servicios de Railway usan Root Directory por carpeta; cada uno debe poder instalar y compilar aislado | Monorepo con workspaces: complica el build por servicio |
| T16 | Una sola tabla de límites duplicada en cada proyecto (sin paquete compartido) | Independencia total de los proyectos exigida | Paquete compartido: acopla builds |

## 10. Estrategia de testing

### Backend (Jest + supertest)
- **Unitarios (con Prisma mockeado):** normalización de etiquetas (trim, dedupe case-insensitive, límites), acotamiento de `position`, serializer, mapeo de errores del `AllExceptionsFilter`, validación de entorno.
- **DTOs:** casos de validación (título 100/101, descripción 1000/1001, fecha inválida, etiquetas >10 o >20 caracteres, enums inválidos, campos desconocidos rechazados, `null` en `description`/`dueDate`).
- **E2E contra PostgreSQL real** (base de test separada, `DATABASE_URL` de test, `prisma migrate deploy` previo, limpieza entre tests). Es la capa más importante porque valida SQL, restricciones y ordenamiento:
  - CRUD completo y códigos HTTP (201/200/204/400/404).
  - Creación al principio de la columna (RN-04) y desplazamiento de las demás.
  - Eliminación compacta posiciones (RN-03).
  - Mover dentro de una columna hacia arriba y hacia abajo; mover entre columnas; mover al inicio, medio y final; `position` fuera de rango (CL-14).
  - Edición con cambio de estado → final de la columna destino (RN-05).
  - **Invariante tras cada operación:** en cada columna las posiciones son exactamente `0..n-1`.
  - `updatedAt` cambia solo en la tarea afectada.
  - Concurrencia: varias peticiones `move`/`create` en paralelo (`Promise.all`) terminan sin posiciones duplicadas ni huecos (CL-13).
  - `GET /labels` solo devuelve etiquetas en uso; "Bug"/"bug" unificadas (CL-05).
  - Formato de error unificado, UUID inválido, tarea inexistente (CL-12), contenido con HTML guardado literal (CL-04), CORS (origen permitido y no permitido).
- Base caída → 503 (test de integración del filtro/health).

### Frontend (Vitest + Testing Library)
- **Lógica pura (mayor cobertura):** `applyMove` (misma columna, entre columnas, límites, vacía), `lib/filters.ts` (búsqueda sin acentos ni mayúsculas, combinación AND/OR, RN-12), `isOverdue` (ayer, hoy, mañana, Hecho; CA-09.x), esquemas `zod` (límites, CL-01…CL-06).
- **Componentes:** `TaskCard` (campos, indicador de vencida), `TaskForm` (validación, contadores, errores del servidor), `FilterBar` (limpiar filtros, estado vacío vs. sin resultados), estados de carga/error/vacío del tablero.
- **Optimismo:** test del hook de mutación con cliente de API simulado: éxito (cache final), error (rollback exacto y toast), dos movimientos encadenados (serialización).
- **DnD:** la simulación de puntero de dnd-kit en jsdom es poco fiable; se prueba la lógica (`useBoardDnd` con eventos sintéticos de `onDragEnd`) y se cubre el flujo real en E2E con el sensor de teclado.

### E2E (Playwright, humo)
Contra backend y base reales: crear tarea (aparece primera), recargar (persiste), editar, mover con teclado entre columnas y recargar, borrar con confirmación, filtros combinados y "Limpiar filtros", y verificación de que con filtros activos no se puede arrastrar. Un caso de error: backend detenido → `BoardError`, y movimiento con API fallando → rollback.

### Trazabilidad
| Spec | Cubierto por |
|---|---|
| RN-03, RN-04, RN-05, RN-06, CL-13, CL-14 | Backend e2e (invariante de posiciones) |
| RN-07, CA-06.x, CA-07.x | Tests del hook optimista + E2E |
| RN-09, CL-01…CL-06 | Tests de DTO + esquemas `zod` |
| RN-11, RN-12, RN-13, CA-08.x | Tests de `lib/filters.ts` y `FilterBar` |
| RN-15, CA-09.x, CL-08..CL-10 | Tests de `isOverdue` y `TaskCard` |
| RN-14, D1 | Componentes + E2E |
| CA-01.x, CA-11.x | Componentes + E2E |

### Criterios de calidad transversales
- `tsc --noEmit` sin errores en ambos proyectos (TypeScript en modo `strict`, sin `any` implícito).
- ESLint sin errores; `build` de ambos proyectos pasa antes de cada deploy.
- CI futuro (fuera de este plan): lint + typecheck + tests + e2e en cada push.

## 11. Riesgos y puntos a verificar al implementar

| Riesgo | Mitigación |
|---|---|
| Cambios de configuración en la versión vigente de Prisma | Verificar versión y requisitos (`prisma.config.ts`, adaptadores) antes de escribir el esquema; ajustar sin cambiar el diseño |
| `CHECK` no gestionados por Prisma | Quedan solo en el SQL de la migración; documentar que no deben eliminarse al regenerar migraciones |
| `NEXT_PUBLIC_API_URL` ausente en el build | Falla del build si la variable falta (validación en `next.config`) |
| Pruebas de DnD poco fiables en jsdom | Lógica pura probada en unit tests, DnD real con teclado en Playwright |
| Lock global serializa escrituras | Aceptable para un tablero único; si hubiese contención real, se reemplaza por bloqueo por columna |
