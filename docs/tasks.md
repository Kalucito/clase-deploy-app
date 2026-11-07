# TaskFlow — Plan de tareas

**Versión:** 1.0 · **Fecha:** 2026-11-07 · **Base:** `docs/spec.md` y `docs/plan.md` (RN-xx, CA-xx, CL-xx, D1–D5 y §n se refieren a esos documentos).

## Convenciones

- Cada tarea es pequeña, verificable y se puede commitear sola. Orden de ejecución = orden de IDs, salvo que las dependencias permitan paralelizar.
- Rutas relativas a la raíz del repositorio. `backend/` y `frontend/` son proyectos npm independientes (sin workspaces, plan T15).
- No se agrega nada fuera de la especificación (sin autenticación, usuarios, comentarios, administración de etiquetas, etc.).
- "Verificación" = comandos o comprobaciones concretas; una tarea está terminada solo si todos sus criterios de aceptación se cumplen.
- Commits sugeridos: uno por tarea (o por grupo muy pequeño), con `main` como rama y push al final de cada etapa.

## Resumen de etapas

| Etapa | Nombre | Tareas |
|---|---|---|
| 1 | Inicialización del monorepo, Git y configuración | T-01 – T-03 |
| 2 | PostgreSQL y Prisma | T-04 – T-06 |
| 3 | Backend NestJS | T-07 – T-09 |
| 4 | API REST | T-10 – T-18 |
| 5 | Frontend Next.js | T-19 – T-21 |
| 6 | Interfaz Kanban | T-22 – T-26 |
| 7 | Integración frontend-backend | T-27 – T-28 |
| 8 | Drag & drop | T-29 – T-31 |
| 9 | CRUD de tareas | T-32 – T-35 |
| 10 | Búsqueda y filtros | T-36 – T-38 |
| 11 | Testing y correcciones | T-39 – T-41 |

---

# Etapa 1 — Inicialización del monorepo, Git y configuración

## T-01 · Dejar el repositorio listo (Git, `.gitignore`, `.env.example`, remoto, primer commit y push)

- **Estado:** ✅ Terminada
- **Objetivo:** que el repositorio quede versionado, sin riesgo de subir secretos ni artefactos, y sincronizado con GitHub.
- **Descripción:** ejecutar en este orden:
  1. Verificar si la raíz ya es un repositorio (`git rev-parse --is-inside-work-tree`); si no lo es, `git init -b main`. Si ya existe, no reinicializar.
  2. Crear `.gitignore` **antes de cualquier commit** excluyendo como mínimo `.env`, `.env.*` (con excepción `!.env.example`), `node_modules/`, `.next/` y `dist/`; sumar `coverage/`, `*.log`, `.DS_Store`, `playwright-report/`, `test-results/`. Verificar que no haya archivos sensibles ya trackeados (`git ls-files | grep -E '\.env($|\.)'`, `node_modules`, `.next`, `dist`).
  3. Crear `backend/.env.example` (`DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `NODE_ENV`) y `frontend/.env.example` (`NEXT_PUBLIC_API_URL`) **solo con valores de ejemplo para desarrollo local, sin credenciales reales** (plan §8; el repositorio es público).
  4. Verificar el remoto: `git remote -v`. Si `origin` no existe, `git remote add origin https://github.com/Kalucito/clase-deploy-app.git`; si existe con otra URL, corregirla con `git remote set-url`. Asegurar que la rama activa sea `main`.
  5. Revisar `git status` y `git diff --cached --stat` antes del commit: debe incluir solo `.gitignore`, los `.env.example`, `docs/` y `prompts/` (y nada ignorado).
  6. Commit (`Preparar el repositorio: .gitignore y .env.example`) y `git push -u origin main`.
- **Archivos involucrados:** `.gitignore`, `backend/.env.example`, `frontend/.env.example`, `.git/config`.
- **Dependencias:** ninguna.
- **Criterios de aceptación:**
  - `git rev-parse --abbrev-ref HEAD` → `main`; `git remote get-url origin` → `https://github.com/Kalucito/clase-deploy-app.git`.
  - `.gitignore` existe y está en el primer commit de esta tarea (o en uno anterior a cualquier archivo ignorable).
  - Existe un `.env.example` por proyecto, sin secretos ni valores de producción.
  - `git check-ignore -v backend/.env frontend/.env.local backend/node_modules frontend/.next backend/dist` lista todos; `git check-ignore backend/.env.example` no devuelve nada (se versiona).
  - `git status` queda limpio y `git log origin/main -1` coincide con `git log -1`.
- **Pruebas necesarias:**
  - Crear temporalmente `backend/.env`, `backend/node_modules/x`, `frontend/.next/x`, `backend/dist/x` y comprobar que `git status` no los muestra; luego borrarlos.
  - `git ls-files` no contiene `.env` ni carpetas ignoradas.
  - Verificar en GitHub (o con `git ls-remote origin main`) que el push llegó.

## T-02 · Docker Compose para PostgreSQL de desarrollo

- **Estado:** ✅ Terminada
- **Objetivo:** base PostgreSQL local reproducible (plan §2, §8).
- **Descripción:** crear `docker-compose.yml` con un único servicio `postgres` (usuario/clave/base de desarrollo `taskflow`, volumen nombrado, puerto 5432, healthcheck `pg_isready`). Solo desarrollo; no se usa en producción. Agregar también una base para tests (por ejemplo `taskflow_test`, creada con un script de init o documentada en el `.env.example` del backend como `DATABASE_URL` alternativa).
- **Archivos involucrados:** `docker-compose.yml`, (opcional) `docker/init-test-db.sql`, `backend/.env.example` (comentario con la URL de test).
- **Dependencias:** T-01.
- **Criterios de aceptación:**
  - `docker compose up -d` deja el contenedor en estado `healthy`.
  - Con las credenciales del `.env.example` se conecta a `taskflow` y a la base de test.
  - No hay credenciales reales en el archivo (solo valores de desarrollo local).
- **Pruebas necesarias:** `docker compose up -d && docker compose ps`; `psql "postgresql://taskflow:taskflow@localhost:5432/taskflow" -c "select 1"`; `docker compose down` y `up` de nuevo conserva el volumen.

## T-03 · Esqueleto del proyecto `backend/` (NestJS + TypeScript)

- **Estado:** ✅ Terminada
- **Objetivo:** proyecto NestJS que compila, lintea y corre tests, con scripts previstos.
- **Descripción:** generar el proyecto NestJS en `backend/` (npm, TypeScript `strict`). Instalar dependencias adicionales del plan: `@nestjs/config`, `class-validator`, `class-transformer`; dev: Jest y `supertest` (defaults de Nest). Definir los scripts de plan §8: `start:dev`, `build`, `start:prod`, `test`, `test:e2e`, `lint` (los de Prisma se agregan en T-04/T-05). Eliminar el controlador/servicio de ejemplo. Confirmar que `package-lock.json` queda versionado.
- **Archivos involucrados:** `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig*.json`, `backend/nest-cli.json`, `backend/src/main.ts`, `backend/src/app.module.ts`, config de ESLint/Jest.
- **Dependencias:** T-01.
- **Criterios de aceptación:**
  - `npm ci && npm run build && npm run lint && npm test` pasan en `backend/`.
  - `tsconfig` con `strict: true`.
  - `node_modules/` y `dist/` no aparecen en `git status`.
- **Pruebas necesarias:** ejecutar los cuatro comandos anteriores desde una copia limpia (`rm -rf node_modules dist && npm ci`).

---

# Etapa 2 — PostgreSQL y Prisma

## T-04 · Instalar Prisma y verificar su versión vigente

- **Estado:** ✅ Terminada
- **Objetivo:** Prisma configurado contra el PostgreSQL local, según los requisitos de la versión vigente (plan §4.5, §11).
- **Descripción:** instalar `prisma` (dev) y `@prisma/client`; inicializar `backend/prisma/`. Antes de escribir el esquema, verificar la documentación de la versión instalada (¿requiere `prisma.config.ts`?, ¿adaptadores de driver?, ¿ubicación de `url`?) y adaptar la configuración sin cambiar el diseño. Agregar scripts `prisma:migrate:dev`, `prisma:migrate:deploy`; `prisma generate` en `postinstall` o dentro de `build`. Crear `backend/.env` local (ignorado) copiando el `.env.example`.
- **Archivos involucrados:** `backend/package.json`, `backend/prisma/schema.prisma` (mínimo), `backend/prisma.config.ts` (si la versión lo exige), `backend/.env` (no versionado).
- **Dependencias:** T-02, T-03.
- **Criterios de aceptación:**
  - `npx prisma validate` y `npx prisma generate` pasan.
  - `npm run build` ejecuta `prisma generate` (o `postinstall` lo hace tras `npm ci`).
  - La versión usada y cualquier ajuste respecto del plan quedan anotados en el mensaje de commit.
- **Pruebas necesarias:** `npx prisma validate`; `npx prisma db pull --print` (o `migrate status`) conecta a la base local sin error.

## T-05 · Esquema Prisma y migración inicial con `CHECK`

- **Estado:** ✅ Terminada
- **Objetivo:** modelo de datos del plan §4 aplicado en PostgreSQL, con las restricciones de integridad de la spec §8.
- **Descripción:** definir en `schema.prisma` los enums `TaskStatus` y `Priority`, y los modelos `Task` (`id` uuid, `title` VarChar(100), `description` VarChar(1000)?, `status`, `priority`, `dueDate` Date?, `position`, `createdAt`, `updatedAt` **sin** `@updatedAt`, `labels`, `@@index([status, position])`, `@@map("tasks")`) y `Label` (`name`, `normalizedName` único VarChar(20), `@@map("labels")`), relación M–N implícita. Generar con `prisma migrate dev --create-only` y **editar el SQL** para agregar `CHECK (char_length(btrim(title)) >= 1)` y `CHECK (position >= 0)`. Aplicar la migración.
- **Archivos involucrados:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/<ts>_init/migration.sql`, `backend/prisma/migrations/migration_lock.toml`.
- **Dependencias:** T-04.
- **Criterios de aceptación:**
  - `npx prisma migrate dev` aplica la migración desde una base vacía; `npx prisma migrate deploy` también.
  - Las migraciones están versionadas en git.
  - La base rechaza un título vacío/solo espacios, `position < 0`, estados/prioridades fuera del enum y dos etiquetas con el mismo `normalizedName`.
  - **No** existe `UNIQUE (status, position)` (plan §4.2).
- **Pruebas necesarias:** con SQL directo (`psql`) intentar insertar: título `'   '`, título de 101 caracteres, `position = -1`, `status = 'otro'`, etiqueta duplicada; todos deben fallar. Insertar una fila válida y borrarla. `npx prisma migrate reset --force` reproduce el estado desde cero.

## T-06 · `PrismaModule`, `PrismaService` y validación de entorno

- **Estado:** ✅ Terminada
- **Objetivo:** acceso a la base desde NestJS y arranque que falla rápido si falta configuración.
- **Descripción:** crear `PrismaModule` (`@Global`) y `PrismaService extends PrismaClient` (conecta en `onModuleInit`, desconecta en `onModuleDestroy`). Crear `config/env.validation.ts` (class-validator): `DATABASE_URL` requerido, `PORT` numérico (default 3001), `NODE_ENV`, `CORS_ORIGIN` requerido si `NODE_ENV=production` (lista separada por comas). Registrar `ConfigModule.forRoot({ isGlobal: true, validate })` en `AppModule`.
- **Archivos involucrados:** `backend/src/prisma/prisma.module.ts`, `backend/src/prisma/prisma.service.ts`, `backend/src/config/env.validation.ts`, `backend/src/app.module.ts`.
- **Dependencias:** T-03, T-05.
- **Criterios de aceptación:**
  - La app arranca con la base disponible y se desconecta limpiamente al cerrar.
  - Sin `DATABASE_URL` el proceso aborta con un mensaje claro.
  - En producción sin `CORS_ORIGIN` el proceso aborta.
- **Pruebas necesarias:** unit test de `env.validation` (válido, falta `DATABASE_URL`, `PORT` no numérico, producción sin `CORS_ORIGIN`); arranque manual con y sin variables.

---

# Etapa 3 — Backend NestJS

## T-07 · Bootstrap de la aplicación y constantes de dominio

- **Estado:** ✅ Terminada
- **Objetivo:** `main.ts` con prefijo, CORS, pipes y shutdown según plan §5.5.
- **Descripción:** crear `common/constants.ts` (título 100, descripción 1000, máx. 10 etiquetas, etiqueta 1–20, clave del advisory lock). En `main.ts`: `setGlobalPrefix('api')`; `enableCors` con orígenes de `CORS_ORIGIN` (separados por coma), métodos `GET/POST/PATCH/DELETE`, `maxAge: 600`, sin `credentials`; `useGlobalPipes(ValidationPipe)` con `whitelist`, `forbidNonWhitelisted`, `transform` (el `exceptionFactory` llega en T-08); `enableShutdownHooks()`; `listen(PORT, '0.0.0.0')`. Extraer la configuración a una función reutilizable (`configureApp(app)`) para que los tests e2e usen la misma.
- **Archivos involucrados:** `backend/src/main.ts`, `backend/src/common/constants.ts`, `backend/src/app.setup.ts` (nuevo, si se extrae).
- **Dependencias:** T-06.
- **Criterios de aceptación:**
  - La app escucha en `0.0.0.0:$PORT` y todas las rutas cuelgan de `/api`.
  - Una petición con `Origin` permitido recibe `Access-Control-Allow-Origin`; con uno no permitido, no.
  - Un body con campos desconocidos se rechaza (queda comprobado cuando existan los DTOs, T-11).
- **Pruebas necesarias:** e2e mínimo con `supertest`: `OPTIONS /api/tasks` con origen permitido/no permitido; ruta inexistente → 404.

## T-08 · Filtro global de excepciones y formato de error unificado

- **Estado:** ✅ Terminada
- **Objetivo:** todas las respuestas de error con el formato del plan §5.4 (CA-11.4: sin detalles técnicos).
- **Descripción:** implementar `AllExceptionsFilter` (`@Catch()`) que devuelva `{ statusCode, error, message, details? }` y mapee: validación → 400 con `details[{field,message}]` en español (`exceptionFactory` del `ValidationPipe`); UUID inválido → 400; `NotFoundException`/Prisma `P2025` → 404 "La tarea no existe"; `P2002` → 409; `P1001`/`P1002` y errores de conexión → 503; resto → 500 con mensaje genérico. Loguear los 5xx con stack mediante `Logger`. Registrarlo en `configureApp`.
- **Archivos involucrados:** `backend/src/common/filters/all-exceptions.filter.ts`, `backend/src/app.setup.ts`, tests `*.spec.ts` del filtro.
- **Dependencias:** T-07.
- **Criterios de aceptación:**
  - Cada origen de la tabla de §5.4 produce el status y formato indicados.
  - Un error 500 nunca expone stack ni texto de Prisma al cliente, pero sí queda en el log.
  - Mensajes en español.
- **Pruebas necesarias:** unit tests del filtro con excepciones simuladas (HttpException, `PrismaClientKnownRequestError` P2025/P2002/P1001, `Error` genérico, validación). Verificar que el cuerpo 500 no contiene el mensaje original.

## T-09 · Módulo de salud `GET /api/health`

- **Estado:** ✅ Terminada
- **Objetivo:** healthcheck para Railway (plan T14).
- **Descripción:** `HealthModule` + `HealthController`: `GET /api/health` ejecuta `SELECT 1` vía Prisma; responde `200 {"status":"ok"}` o `503` si la base no responde.
- **Archivos involucrados:** `backend/src/health/health.module.ts`, `backend/src/health/health.controller.ts`, `backend/src/app.module.ts`.
- **Dependencias:** T-06, T-08.
- **Criterios de aceptación:**
  - Con la base arriba → 200 `{"status":"ok"}`.
  - Con la base caída → 503 con el formato de error unificado.
- **Pruebas necesarias:** e2e con base real (200) y test con `PrismaService.$queryRaw` simulado para fallar (503). Prueba manual: `docker compose stop` y `curl -i localhost:3001/api/health`.

---

# Etapa 4 — API REST

## T-10 · Utilidades de dominio: normalización de etiquetas y serializer

- **Estado:** ✅ Terminada
- **Objetivo:** lógica pura y reutilizable antes de los endpoints.
- **Descripción:** (a) función de normalización de etiquetas: `trim`, descartar vacías, deduplicar sin distinguir mayúsculas conservando la primera forma recibida, y calcular `normalizedName` (trim + minúsculas) (CL-05, RN-10). (b) `task.serializer.ts`: fila Prisma con etiquetas → `Task` público (`labels: string[]`, `dueDate: "YYYY-MM-DD"` o `null`, `description: null` si vacía, fechas ISO).
- **Archivos involucrados:** `backend/src/tasks/labels.util.ts` (o dentro de `tasks/`), `backend/src/tasks/task.serializer.ts`, sus `*.spec.ts`.
- **Dependencias:** T-03.
- **Criterios de aceptación:**
  - `["Bug", "bug", " BUG "]` → una sola etiqueta `"Bug"`.
  - Etiquetas vacías/solo espacios se descartan.
  - `dueDate` de la base (Date) se serializa como `YYYY-MM-DD` sin desfase de zona horaria.
- **Pruebas necesarias:** unit tests: dedupe case-insensitive, trim, vacías, acentos/emoji, orden estable; serializer con `description` vacía/nula y `dueDate` nula/presente.

## T-11 · DTOs de entrada

- **Estado:** ✅ Terminada
- **Objetivo:** única fuente de validación de entrada (plan §5.3, RN-09).
- **Descripción:** `CreateTaskDto`, `UpdateTaskDto` (parche parcial escrito explícitamente; `description` y `dueDate` aceptan `null`; `title` no) y `MoveTaskDto` (`status` enum, `position` entero ≥ 0). Reglas: título trim, no vacío, ≤ 100; descripción ≤ 1000 (cadena vacía → `null`); `status`/`priority` por enum; `dueDate` con formato `YYYY-MM-DD` y fecha de calendario válida (rechazar `2026-02-31`); `labels` array ≤ 10, cada ítem string con trim y longitud 1–20. Mensajes en español.
- **Archivos involucrados:** `backend/src/tasks/dto/create-task.dto.ts`, `update-task.dto.ts`, `move-task.dto.ts`, tests.
- **Dependencias:** T-07, T-08, T-10.
- **Criterios de aceptación:** se cumplen CL-01, CL-02, CL-03, CL-06, CL-15, CL-16 en la capa DTO; campos desconocidos rechazados; `null` aceptado solo en `description`/`dueDate` de `UpdateTaskDto`.
- **Pruebas necesarias:** unit tests de validación con `plainToInstance` + `validate`: título de 1/100/101 caracteres y solo espacios, descripción 1000/1001, etiquetas 10/11 y de 20/21 caracteres, enums inválidos, `2026-02-31`, `"20-11-2026"`, `null` en cada campo, campo extra.

## T-12 · Lectura: `GET /api/tasks` y `GET /api/tasks/:id`

- **Estado:** ✅ Terminada
- **Objetivo:** consultar tareas (RF-01, RF-03, RF-10).
- **Descripción:** `TasksModule`, `TasksController` y `TasksService` con `findAll` (orden fijo de columnas pendiente → en_progreso → en_revision → hecho, luego `position`; incluye etiquetas) y `findOne` (`ParseUUIDPipe`; 404 si no existe). Serializar con el serializer. El controlador no contiene lógica de negocio.
- **Archivos involucrados:** `backend/src/tasks/tasks.module.ts`, `tasks.controller.ts`, `tasks.service.ts`, `backend/src/app.module.ts`, `backend/test/tasks.e2e-spec.ts` (estructura base del e2e: base de test, `migrate deploy` previo, limpieza entre tests).
- **Dependencias:** T-09, T-10, T-11.
- **Criterios de aceptación:**
  - `GET /api/tasks` → 200 con `[]` en base vacía y con el orden correcto cuando hay datos.
  - `GET /api/tasks/:id` → 200 / 404 (`"La tarea no existe"`) / 400 (UUID inválido).
- **Pruebas necesarias:** e2e con datos sembrados directamente con Prisma: orden por columna y posición, forma exacta del recurso, 404 y 400. Esta tarea monta la infraestructura e2e reutilizada por T-13 a T-18.

## T-13 · Creación: `POST /api/tasks`

- **Estado:** ✅ Terminada
- **Objetivo:** crear al **principio** de la columna (RN-04, RF-02).
- **Descripción:** `TasksService.create` dentro de `prisma.$transaction` interactiva: tomar `pg_advisory_xact_lock`, `updateMany(status = S, position + 1)`, insertar con `position = 0`, `status` por defecto `pendiente`, `priority` por defecto `media`, `createdAt = updatedAt = now`. Etiquetas: buscar por `normalizedName` y crear las que no existan (T-10). Responder `201` con el recurso.
- **Archivos involucrados:** `backend/src/tasks/tasks.service.ts`, `tasks.controller.ts`, `backend/test/tasks.e2e-spec.ts`.
- **Dependencias:** T-12.
- **Criterios de aceptación:**
  - Crear con solo `title` → `pendiente`/`media`, `position 0`, `labels []`, `description`/`dueDate` `null`.
  - Crear una segunda tarea en la misma columna deja la nueva en 0 y la anterior en 1; otras columnas intactas.
  - `labels: ["Demo","demo"]` → `["Demo"]` (CL-05); etiqueta ya existente se reutiliza (no se duplica la fila).
  - Datos inválidos → 400 con `details` por campo; HTML/`<script>` en textos se guarda literal (CL-04).
- **Pruebas necesarias:** e2e: caso mínimo y completo; desplazamiento de posiciones; invariante `0..n-1` en cada columna; vencimiento pasado permitido (CL-07); validaciones de CL-01/02/03/06/15/16 vía HTTP; contenido con HTML y emoji.

## T-14 · Eliminación: `DELETE /api/tasks/:id`

- **Estado:** ✅ Terminada
- **Objetivo:** borrar y compactar posiciones (RN-03, RF-05).
- **Descripción:** transacción con lock: leer la tarea, borrar, `updateMany(status = S, position > p, position - 1)`. `204` en éxito; `404` si no existe. Las etiquetas huérfanas no se borran (plan T5).
- **Archivos involucrados:** `backend/src/tasks/tasks.service.ts`, `tasks.controller.ts`, `backend/test/tasks.e2e-spec.ts`.
- **Dependencias:** T-13.
- **Criterios de aceptación:** tras borrar la tarea del medio, las posiciones de la columna quedan `0..n-1`; otras columnas no cambian; borrar de nuevo → 404.
- **Pruebas necesarias:** e2e: borrar primera, media y última de una columna con 4 tareas; invariante de posiciones; 404 al repetir; `updatedAt` de las vecinas no cambia.

## T-15 · Edición: `PATCH /api/tasks/:id`

- **Estado:** ✅ Terminada
- **Objetivo:** edición parcial, con cambio de estado al final de la columna destino (RF-04, RN-05).
- **Descripción:** transacción con lock. Actualiza solo los campos enviados; `null` vacía `description`/`dueDate`; `labels` reemplaza el conjunto completo (re-normalizado); `updatedAt = now` solo en esta tarea. Si cambia `status`: compactar origen (`position > a` → `-1`) y dejar la tarea en la posición `n` de la columna destino (final). Si `status` no cambia, la posición no varía. 404 si no existe.
- **Archivos involucrados:** `backend/src/tasks/tasks.service.ts`, `tasks.controller.ts`, `backend/test/tasks.e2e-spec.ts`.
- **Dependencias:** T-13.
- **Criterios de aceptación:**
  - Editar título/prioridad/etiquetas no mueve la tarea; `updatedAt` cambia y `createdAt` no.
  - `{ "dueDate": null }` y `{ "description": null }` los vacían (CA-04.4).
  - Cambiar `status` coloca la tarea al final de la columna destino y compacta el origen (RN-05, CA-04.6); invariante de posiciones intacto.
  - `{ "title": null }` → 400; tarea inexistente → 404 (CL-12).
- **Pruebas necesarias:** e2e: cada campo por separado, parche vacío, vaciado con `null`, reemplazo de etiquetas, cambio de estado desde primera/media/última posición, `updatedAt` de vecinas sin cambios, validaciones y 404.

## T-16 · Movimiento: `PATCH /api/tasks/:id/move`

- **Estado:** ✅ Terminada
- **Objetivo:** mover y reordenar de forma atómica (RN-06, RF-06, RF-07).
- **Descripción:** transacción con lock aplicando plan §4.4 y §6.3: misma columna `a → b` (con `b` acotado a `0..n-1`; si `b > a`, `position - 1` en `(a, b]`; si `b < a`, `position + 1` en `[b, a)`); otra columna (`b` acotado a `0..n`; origen `position - 1` donde `> a`; destino `position + 1` donde `>= b`). Mover a la misma posición y estado devuelve 200 sin tocar `updatedAt`. `updatedAt` cambia solo en la tarea movida. Posición fuera de rango se acota sin error (CL-14).
- **Archivos involucrados:** `backend/src/tasks/tasks.service.ts`, `tasks.controller.ts`, `backend/test/tasks.e2e-spec.ts`.
- **Dependencias:** T-13.
- **Criterios de aceptación:**
  - Mover hacia arriba y hacia abajo dentro de la columna produce el orden esperado.
  - Mover entre columnas al inicio, medio y final; a una columna vacía.
  - `position: 999` → final; `position: -1` → 400 (DTO); `status` inválido → 400; tarea inexistente → 404.
  - Tras toda operación, cada columna tiene posiciones exactamente `0..n-1`.
  - Un fallo a mitad de la transacción no deja estado parcial (RN-06).
- **Pruebas necesarias:** e2e parametrizado con tabla de casos (columna de 5 tareas × posiciones origen/destino) que verifica el orden final completo y el invariante; no-op sin cambio de `updatedAt`; `updatedAt` de vecinas intacto; prueba de atomicidad forzando un error dentro de la transacción (por ejemplo, con un spy sobre un paso intermedio).

## T-17 · Etiquetas: `GET /api/labels`

- **Estado:** ✅ Terminada
- **Objetivo:** alimentar el filtro de etiquetas (CA-08.3, CA-08.8).
- **Descripción:** `LabelsModule`, `LabelsController`, `LabelsService` (solo lectura): devuelve `string[]` con el `name` de las etiquetas que tienen al menos una tarea (`tasks: { some: {} }`), ordenadas alfabéticamente (sin distinguir mayúsculas).
- **Archivos involucrados:** `backend/src/labels/labels.module.ts`, `labels.controller.ts`, `labels.service.ts`, `backend/src/app.module.ts`, `backend/test/labels.e2e-spec.ts`.
- **Dependencias:** T-13, T-14.
- **Criterios de aceptación:** base vacía → `[]`; "Bug" y "bug" aparecen como una sola; una etiqueta cuya última tarea fue eliminada o editada deja de aparecer; no existe ningún endpoint de escritura de etiquetas.
- **Pruebas necesarias:** e2e: crear tareas con etiquetas repetidas, borrar/editar y comprobar la lista; orden alfabético.

## T-18 · Pruebas de integridad, concurrencia y errores de la API

- **Estado:** ✅ Terminada
- **Objetivo:** cerrar la etapa garantizando RN-03, RN-06 y CL-13 de punta a punta.
- **Descripción:** completar la suite e2e con: invariante global de posiciones tras secuencias aleatorias de crear/mover/editar/borrar; concurrencia con `Promise.all` (varios `move` y `create` en paralelo sobre las mismas columnas); formato de error unificado en todos los códigos; base caída → 503; CORS. Revisar que ningún test dependa del orden de ejecución.
- **Archivos involucrados:** `backend/test/*.e2e-spec.ts`, `backend/test/helpers/*` (helpers de siembra e invariante).
- **Dependencias:** T-14, T-15, T-16, T-17.
- **Criterios de aceptación:**
  - 20+ operaciones concurrentes terminan sin posiciones duplicadas ni huecos (CL-13).
  - Todas las respuestas de error cumplen el formato del plan §5.4.
  - `npm test` y `npm run test:e2e` pasan de forma repetible (3 corridas seguidas), con `lint` y `build` en verde.
- **Pruebas necesarias:** las descritas, más la corrida repetida para detectar flakiness.

---

# Etapa 5 — Frontend Next.js

## T-19 · Esqueleto del proyecto `frontend/` (Next.js, Tailwind, shadcn/ui)

- **Estado:** ✅ Terminada
- **Objetivo:** proyecto Next.js (App Router, TypeScript `strict`) que compila y con la base de estilos lista.
- **Descripción:** crear `frontend/` con npm. Instalar y configurar Tailwind y shadcn/ui (`components.json`); agregar los componentes del plan §7.2: `button`, `dialog`, `alert-dialog`, `input`, `textarea`, `select`, `badge`, `dropdown-menu`, `form`, `label`, `popover`, `skeleton`, `sonner`, `tooltip`, `scroll-area`. Instalar `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `sonner`, `lucide-react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`; dev: Vitest, Testing Library, `jsdom`. Scripts: `dev`, `build`, `start`, `test`, `lint`, `typecheck`. Fallar el build si falta `NEXT_PUBLIC_API_URL` (validación en `next.config`, plan §11). Crear `frontend/.env.local` (ignorado) a partir del `.env.example`.
- **Archivos involucrados:** `frontend/package.json`, `package-lock.json`, `next.config.*`, `tailwind`/CSS globales, `components.json`, `src/components/ui/*`, `src/lib/utils.ts`, `vitest.config.ts`.
- **Dependencias:** T-01.
- **Criterios de aceptación:**
  - `npm ci && npm run typecheck && npm run lint && npm run build && npm test` pasan.
  - El build sin `NEXT_PUBLIC_API_URL` falla con un mensaje claro; con ella, pasa.
  - `node_modules/` y `.next/` no se versionan.
- **Pruebas necesarias:** los comandos anteriores desde copia limpia; un test de humo de Vitest (ej. `cn()`); verificar la falla del build quitando la variable.

## T-20 · Tipos, constantes y proveedores base del frontend

- **Estado:** ✅ Terminada
- **Objetivo:** vocabulario común del frontend alineado con el contrato de API.
- **Descripción:** `types/task.ts` (`Task`, `TaskStatus`, `Priority`, `ApiErrorBody`), `lib/constants.ts` (columnas en orden con etiquetas en español, etiquetas de prioridad, límites 100/1000/10/20, `board-moves` scope), `providers/query-provider.tsx` (`QueryClient` con `retry: 1` en lecturas y sin reintentos en mutaciones), `layout.tsx` con fuentes, `<Providers>` y `<Toaster>`, `lang="es"`. `not-found.tsx` y `error.tsx` básicos con mensajes en español.
- **Archivos involucrados:** `frontend/src/types/task.ts`, `src/lib/constants.ts`, `src/providers/query-provider.tsx`, `src/app/layout.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`.
- **Dependencias:** T-19.
- **Criterios de aceptación:** las 4 columnas están definidas una sola vez y en el orden de RN-01; los límites coinciden con los de `backend/src/common/constants.ts`; la app arranca con los proveedores montados.
- **Pruebas necesarias:** `typecheck`; test unitario de `constants` (4 columnas, orden y claves del enum); render de `not-found` en Testing Library.

## T-21 · Cliente de API tipado

- **Estado:** ⬜ Pendiente
- **Objetivo:** única capa de acceso al backend (plan §7.4).
- **Descripción:** `lib/api/client.ts` (wrapper de `fetch` sobre `NEXT_PUBLIC_API_URL` + `/api`; parsea el error unificado a `ApiError { status, message, details }`; fallo de red → `ApiError` "No se pudo conectar con el servidor"; maneja `204`), `lib/api/tasks.ts` (`listTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`, `moveTask`) y `lib/api/labels.ts` (`listLabels`). Sin lógica de UI.
- **Archivos involucrados:** `frontend/src/lib/api/client.ts`, `tasks.ts`, `labels.ts`, tests.
- **Dependencias:** T-20 (contrato: T-12 a T-17 para la verificación manual).
- **Criterios de aceptación:** cada función usa el método/ruta del plan §6.2; los errores 400/404/500 y los de red llegan como `ApiError` con mensaje en español; `204` no intenta parsear JSON.
- **Pruebas necesarias:** unit tests con `fetch` simulado: éxito, 204, 400 con `details`, 404, 500, red caída, cuerpo de error no JSON. Prueba manual contra el backend real con `listTasks()`.

---

# Etapa 6 — Diseño de la interfaz Kanban

> Esta etapa trabaja con datos en memoria/props (sin red) para poder verificar el diseño de forma aislada; la conexión real llega en la etapa 7.

## T-22 · Lógica pura del tablero y de fechas

- **Estado:** ⬜ Pendiente
- **Objetivo:** funciones puras y probadas que usan la UI.
- **Descripción:** `lib/board.ts`: agrupar tareas por estado ordenadas por `position`; `applyMove(tasks, id, status, position)` que replica la lógica del backend (acota posición, reasigna posiciones contiguas, no toca otras columnas). `lib/dates.ts`: `todayLocal()` (`YYYY-MM-DD` según la fecha local del navegador) e `isOverdue(task, today)` (D4: `dueDate < hoy` y `status ≠ hecho`; comparación de cadenas `YYYY-MM-DD` sin crear `Date` con zona UTC).
- **Archivos involucrados:** `frontend/src/lib/board.ts`, `frontend/src/lib/dates.ts`, tests.
- **Dependencias:** T-20.
- **Criterios de aceptación:** `applyMove` produce el mismo resultado que el backend en los casos de T-16 (misma columna arriba/abajo, entre columnas, a columna vacía, posición fuera de rango); `isOverdue` cumple CA-09.1/09.2/09.3 y CL-08/CL-10.
- **Pruebas necesarias:** unit tests tabulares de `applyMove` (reutilizando los casos de T-16) con invariante de posiciones; `isOverdue` con ayer, hoy, mañana, sin fecha, estado `hecho`, y fecha inyectada para evitar dependencia del reloj.

## T-23 · Tarjeta de tarea (`TaskCard`, `PriorityBadge`, `DueDate`)

- **Estado:** ⬜ Pendiente
- **Objetivo:** mostrar una tarea según CA-01.2 y RF-09.
- **Descripción:** `PriorityBadge` (indicador visual de baja/media/alta, no solo color), `DueDate` (formato legible en español; si está vencida: color + icono + texto "Vencida", CA-09.1), `TaskCard` (título, prioridad, vencimiento si existe, etiquetas). Contenido renderizado como texto (nunca HTML, CL-04). Título largo se trunca sin romper el layout. Tarjeta operable por teclado (rol/foco) y con etiqueta accesible; al hacer clic/Enter invoca `onOpen(task)`.
- **Archivos involucrados:** `frontend/src/components/tasks/PriorityBadge.tsx`, `DueDate.tsx`, `frontend/src/components/board/TaskCard.tsx`, tests.
- **Dependencias:** T-22.
- **Criterios de aceptación:** la tarjeta muestra los cuatro datos; una tarea sin fecha no muestra `DueDate`; vencida/hoy/hecho se comportan según CA-09.x; `<script>` en el título aparece como texto.
- **Pruebas necesarias:** Testing Library: render con/sin fecha, vencida vs. hoy vs. en `hecho`, etiquetas múltiples, título con HTML escapado, activación por clic y teclado.

## T-24 · Columnas y tablero estático (`Board`, `BoardColumn`)

- **Estado:** ⬜ Pendiente
- **Objetivo:** las 4 columnas fijas con contador y scroll interno (RN-01, CA-01.1, CA-01.6, CL-19).
- **Descripción:** `BoardColumn` (título, contador, lista de `TaskCard`, placeholder "columna vacía", scroll vertical interno con `scroll-area`) y `Board` (renderiza las 4 columnas en orden a partir de una lista de tareas por props). Sin DnD todavía; preparar la estructura para sumarlo en la etapa 8.
- **Archivos involucrados:** `frontend/src/components/board/BoardColumn.tsx`, `Board.tsx`, tests.
- **Dependencias:** T-23.
- **Criterios de aceptación:** las 4 columnas aparecen siempre, en orden; cada una muestra su contador; columna sin tareas muestra placeholder; con 200 tareas la columna scrollea internamente sin ensanchar la página.
- **Pruebas necesarias:** Testing Library: orden y títulos de columnas, contadores, placeholder; prueba visual manual con datos sembrados (incluida una columna con cientos de tareas).

## T-25 · Estados del tablero: carga, error y vacío

- **Estado:** ⬜ Pendiente
- **Objetivo:** CA-01.3, CA-01.4, CA-01.5.
- **Descripción:** `BoardSkeleton` (esqueleto de las 4 columnas), `BoardError` (mensaje en español sin detalles técnicos + botón "Reintentar"), `EmptyBoard` (sin ninguna tarea, con llamada a "crear la primera tarea" — el botón se conecta en T-33). `NoResults` queda para T-38. `Board` decide qué mostrar según props (`isLoading`, `isError`, `tasks`).
- **Archivos involucrados:** `frontend/src/components/board/BoardSkeleton.tsx`, `BoardError.tsx`, `EmptyBoard.tsx`, `Board.tsx`, tests.
- **Dependencias:** T-24.
- **Criterios de aceptación:** cada estado se muestra solo en su condición; el tablero con tareas en alguna columna no se considera vacío (CA-01.6); "Reintentar" invoca el callback.
- **Pruebas necesarias:** Testing Library con las cuatro combinaciones de props; clic en "Reintentar".

## T-26 · Diseño minimalista y responsive

- **Estado:** ⬜ Pendiente
- **Objetivo:** RF-11 (CA-11.1, CA-11.2, CA-11.5).
- **Descripción:** cabecera simple con nombre "TaskFlow" y espacio reservado para el botón "Nueva tarea" y la barra de filtros; tablero en grilla de 4 columnas en escritorio y scroll horizontal con *snap* por columna en pantallas angostas; tema claro con tokens de shadcn/ui; contraste suficiente; foco visible en todos los controles.
- **Archivos involucrados:** `frontend/src/app/globals.css`, `src/app/page.tsx` (provisional con datos de ejemplo), `components/board/Board.tsx`, `BoardColumn.tsx`.
- **Dependencias:** T-24.
- **Criterios de aceptación:** a 1280 px se ven las 4 columnas lado a lado; a 375 px no hay scroll horizontal de la página (solo del tablero) y todas las columnas son alcanzables; navegación por teclado coherente.
- **Pruebas necesarias:** revisión manual a 375/768/1280 px (DevTools); revisión de foco con Tab; chequeo de contraste básico.

---

# Etapa 7 — Integración frontend-backend

## T-27 · Carga del tablero con TanStack Query

- **Estado:** ⬜ Pendiente
- **Objetivo:** mostrar los datos reales y persistentes (RF-01, RF-10; CA-01.7, CA-10.2).
- **Descripción:** hooks `useTasks` (`['tasks']`, `listTasks`) y `useLabels` (`['labels']`). `BoardPage` (componente cliente) usa `useTasks` y alimenta `Board` con `isLoading`/`isError`/`refetch`. Los datos no se piden en SSR (plan T11).
- **Archivos involucrados:** `frontend/src/hooks/useTasks.ts`, `useLabels.ts`, `src/components/board/BoardPage.tsx`, `src/app/page.tsx`.
- **Dependencias:** T-21, T-25, T-26, T-12, T-17.
- **Criterios de aceptación:**
  - Con el backend corriendo, el tablero muestra las tareas sembradas en el orden de la base; recargar muestra lo mismo.
  - Mientras carga → esqueleto; con el backend apagado → `BoardError`; "Reintentar" recupera al encender el backend.
  - Base vacía → `EmptyBoard`.
  - Sin errores de CORS en consola.
- **Pruebas necesarias:** test del hook con API simulada (éxito, error, reintento); prueba manual: sembrar con `curl POST /api/tasks`, recargar, apagar/encender el backend, abrir desde otro navegador (CA-10.2).

## T-28 · Verificación de la integración y de CORS

- **Estado:** ⬜ Pendiente
- **Objetivo:** dejar documentado y comprobado que ambos proyectos conviven en local.
- **Descripción:** correr base + backend (`:3001`) + frontend (`:3000`) y verificar el flujo de lectura de punta a punta; confirmar que `CORS_ORIGIN` y `NEXT_PUBLIC_API_URL` de los `.env.example` funcionan sin tocar nada más. Corregir inconsistencias de contrato encontradas (tipos del frontend vs. respuesta real).
- **Archivos involucrados:** `backend/.env.example`, `frontend/.env.example` (si hay que ajustar valores de ejemplo), tipos en `frontend/src/types/task.ts`.
- **Dependencias:** T-27.
- **Criterios de aceptación:** el flujo funciona copiando `.env.example` → `.env`/`.env.local` sin cambios adicionales; los tipos del frontend coinciden campo a campo con el recurso `Task` real.
- **Pruebas necesarias:** prueba manual guiada (levantar los tres procesos desde cero); comparar el JSON de `GET /api/tasks` con el tipo `Task`.

---

# Etapa 8 — Drag & drop

## T-29 · Mutación optimista de movimiento con rollback

- **Estado:** ⬜ Pendiente
- **Objetivo:** RN-07, CA-06.3/06.4, CA-07.3 — sin UI de arrastre todavía.
- **Descripción:** hook `useMoveTask` (TanStack Query): `scope: { id: 'board-moves' }` para serializar; `onMutate` (`cancelQueries`, guardar caché previa, aplicar `applyMove` a `['tasks']`); `onError` (restaurar caché y toast en español, RN-07); `onSettled` (`invalidateQueries(['tasks'])`). Sin reintentos. Un `404` del servidor muestra "La tarea ya no existe" y refresca (CL-12).
- **Archivos involucrados:** `frontend/src/hooks/useMoveTask.ts` (o `useTaskMutations.ts`), tests.
- **Dependencias:** T-22, T-27, T-16.
- **Criterios de aceptación:** éxito → la caché queda con el nuevo orden y se reconcilia con el servidor; error → la caché vuelve **exactamente** a la instantánea previa y aparece el toast; dos movimientos consecutivos se ejecutan en orden, uno a la vez.
- **Pruebas necesarias:** tests del hook con API simulada: éxito; error 500 y error de red (rollback exacto + toast); 404; dos mutaciones encadenadas (la segunda no empieza hasta que termina la primera; si la primera falla, la segunda parte de un estado coherente).

## T-30 · Arrastre entre columnas con dnd-kit (`useBoardDnd`, `DragOverlay`)

- **Estado:** ⬜ Pendiente
- **Objetivo:** RF-06 (CA-06.1, CA-06.2, CA-06.6, CA-06.8).
- **Descripción:** `Board` envuelto en `DndContext` con sensores `PointerSensor` (distancia 5 px), `TouchSensor` (retraso 200 ms con tolerancia) y `KeyboardSensor`. Cada columna: `useDroppable` + `SortableContext`; cada `TaskCard`: `useSortable`. `DragOverlayCard` para la tarjeta flotante; la original atenuada; la columna destino resaltada con `isOver`. `useBoardDnd`: estado local de arrastre (`onDragStart` instantánea, `onDragOver` mueve solo en estado local, `onDragEnd` calcula `{status, position}` y dispara `useMoveTask`, `onDragCancel` descarta). Soltar fuera de columnas o en el mismo lugar no llama al backend.
- **Archivos involucrados:** `frontend/src/hooks/useBoardDnd.ts`, `components/board/Board.tsx`, `BoardColumn.tsx`, `TaskCard.tsx`, `DragOverlayCard.tsx`, tests.
- **Dependencias:** T-29.
- **Criterios de aceptación:**
  - Se puede arrastrar una tarjeta a otra columna (incluida una vacía) y a una posición específica; al soltar se ve el cambio de inmediato y persiste tras recargar (CA-06.5).
  - Hay feedback visible: tarjeta arrastrada distinguible, columna destino resaltada, punto de inserción (CA-06.2).
  - Un clic simple (sin arrastrar) sigue abriendo la tarjeta (no se confunde con arrastre).
  - Soltar fuera de una columna no dispara ninguna petición (CA-06.6).
  - Funciona con touch y con teclado (espacio para levantar, flechas, espacio para soltar).
- **Pruebas necesarias:** tests de `useBoardDnd` con eventos sintéticos (`onDragEnd` en distintas combinaciones, incluida suelta fuera/mismo lugar → sin llamada); prueba manual con mouse, emulación touch y teclado; verificar en red (DevTools) una única petición `PATCH …/move` por movimiento.

## T-31 · Reordenamiento dentro de la columna y rollback visual

- **Estado:** ⬜ Pendiente
- **Objetivo:** RF-07 y RN-07 comprobados en la UI.
- **Descripción:** completar el caso de reordenar dentro de la misma columna (índice final correcto hacia arriba y abajo), y verificar el rollback visual real simulando un fallo (backend apagado o respuesta 500) durante un arrastre.
- **Archivos involucrados:** `frontend/src/hooks/useBoardDnd.ts`, `frontend/src/lib/board.ts` (ajustes si hace falta), tests.
- **Dependencias:** T-30.
- **Criterios de aceptación:**
  - Reordenar persiste el orden (CA-07.1); soltar en la misma posición no genera llamada (CA-07.2).
  - Con el backend caído, la tarjeta vuelve a su lugar original y se muestra un mensaje de error (CA-06.4, CL-17).
  - Un segundo arrastre rápido no corrompe el orden (serialización).
- **Pruebas necesarias:** tests de `useBoardDnd` (índice final arriba/abajo, mismo lugar); prueba manual con el backend detenido y con dos arrastres consecutivos rápidos; recargar y comparar con la base.

---

# Etapa 9 — CRUD de tareas

## T-32 · Validación del formulario (`lib/validation.ts`) y `TagInput`

- **Estado:** ⬜ Pendiente
- **Objetivo:** validación cliente alineada con el backend (RN-09, CA-02.2, CA-02.3, CL-01…CL-06).
- **Descripción:** esquema `zod` con las reglas de los DTOs (título 1–100 tras trim, descripción ≤ 1000, ≤ 10 etiquetas de 1–20 caracteres sin duplicados case-insensitive, estado/prioridad válidos, fecha válida o vacía) y mensajes en español. `TagInput`: chips con alta por Enter/coma, eliminación, límite de 10, rechazo de duplicados sin distinguir mayúsculas, contador/limitación de 20 caracteres, accesible por teclado.
- **Archivos involucrados:** `frontend/src/lib/validation.ts`, `frontend/src/components/tasks/TagInput.tsx`, tests.
- **Dependencias:** T-20.
- **Criterios de aceptación:** título de 100 válido y 101 inválido; solo espacios inválido; descripción 1000/1001; 11.ª etiqueta rechazada; "Bug" y "bug" no coexisten; etiquetas se guardan con trim.
- **Pruebas necesarias:** unit tests del esquema con los casos límite de CL-01…CL-06; tests de `TagInput` (agregar, duplicado, límite, borrar, teclado).

## T-33 · Modal de creación (`TaskDialog`, `TaskForm`) y `POST`

- **Estado:** ⬜ Pendiente
- **Objetivo:** RF-02 completo (CA-02.1 a CA-02.6, RN-04, CL-18).
- **Descripción:** botón visible "Nueva tarea" (y el de `EmptyBoard`) que abre `TaskDialog` con `TaskForm` (`react-hook-form` + zod): título, descripción (contador `n/1000`), estado (por defecto Pendiente), prioridad (por defecto Media), vencimiento, etiquetas (`TagInput`); el título muestra contador `n/100`. Mutación `useCreateTask` **no optimista**: botón deshabilitado mientras guarda (CL-18); éxito → cierra el modal, invalida `['tasks']` y `['labels']` (la tarea aparece al principio de la columna); error 400 → mapear `details[].field` a errores del formulario; otro error → el modal sigue abierto con los datos y el mensaje (CA-02.5). Cierre con Esc/cancelar/clic fuera; si hay cambios sin guardar, pedir confirmación de descarte (CA-11.3, CL-22). El modal es utilizable en móvil.
- **Archivos involucrados:** `frontend/src/components/tasks/TaskDialog.tsx`, `TaskForm.tsx`, `frontend/src/hooks/useTaskMutations.ts`, `BoardPage.tsx`, `EmptyBoard.tsx`, tests.
- **Dependencias:** T-27, T-32, T-13.
- **Criterios de aceptación:**
  - Sin título válido no se puede guardar y el error aparece junto al campo.
  - Al guardar, la tarea nueva queda **primera** de la columna elegida y el contador se actualiza; persiste al recargar.
  - Con el backend caído, el modal queda abierto con los datos intactos y un mensaje comprensible.
  - Doble clic en Guardar crea una sola tarea.
  - Cerrar con cambios sin guardar pide confirmación; sin cambios cierra directo.
- **Pruebas necesarias:** tests de componente (validaciones, contadores, doble envío, error de servidor mapeado, confirmación de descarte); prueba manual de las reglas anteriores, incluido móvil.

## T-34 · Consulta y edición de tarea (`PATCH`)

- **Estado:** ⬜ Pendiente
- **Objetivo:** RF-03 y RF-04 (CA-03.x, CA-04.x, RN-05).
- **Descripción:** al hacer clic en una tarjeta, abrir `TaskDialog` en modo edición con todos los datos y las fechas de creación y última modificación. Mutación `useUpdateTask` no optimista; envía solo lo necesario (`null` para vaciar descripción/vencimiento). Si cambia el estado, la tarea queda al final de la columna destino (lo resuelve el backend). `404` al abrir o guardar → toast "La tarea ya no existe", cierra el modal y refresca el tablero (CA-03.2, CA-04.5, CL-12). Mismas validaciones y mismo comportamiento de descarte que en creación.
- **Archivos involucrados:** `frontend/src/components/tasks/TaskDialog.tsx`, `TaskForm.tsx`, `frontend/src/hooks/useTaskMutations.ts`, `BoardPage.tsx`, tests.
- **Dependencias:** T-33, T-15.
- **Criterios de aceptación:**
  - El modal muestra los datos actuales y las fechas de creación/modificación; tras guardar, la tarjeta refleja los cambios y la fecha de modificación se actualiza.
  - Quitar fecha de vencimiento y descripción funciona (CA-04.4).
  - Cambiar el estado mueve la tarea al final de la nueva columna (CA-04.6).
  - Editar una tarea eliminada por otro visitante muestra el error y refresca.
- **Pruebas necesarias:** tests de componente (precarga, vaciado de campos, payload enviado, 404); prueba manual con dos pestañas: borrar en una y editar en la otra (CL-12), y editar la misma tarea desde ambas (último guardado gana, CL-11).

## T-35 · Eliminación con confirmación (`DELETE`)

- **Estado:** ⬜ Pendiente
- **Objetivo:** RF-05 (CA-05.1 a CA-05.5, RN-08, CL-18).
- **Descripción:** acción "Eliminar" desde el modal de edición (y/o menú de la tarjeta) que abre `DeleteTaskDialog` (`AlertDialog`) mostrando el título de la tarea. Mutación `useDeleteTask`: botón deshabilitado en curso; éxito → cierra, invalida `['tasks']`/`['labels']`; `404` se trata como éxito idempotente y refresca (CA-05.5); otro error → la tarea permanece y se muestra el mensaje (CA-05.4). Cancelar no cambia nada.
- **Archivos involucrados:** `frontend/src/components/tasks/DeleteTaskDialog.tsx`, `TaskDialog.tsx`, `frontend/src/hooks/useTaskMutations.ts`, tests.
- **Dependencias:** T-34, T-14.
- **Criterios de aceptación:** la confirmación nombra la tarea; cancelar no borra; confirmar borra, compacta posiciones (visible tras recargar) y actualiza el contador; doble clic en Eliminar produce una sola operación; con el backend caído la tarea permanece.
- **Pruebas necesarias:** tests de componente (cancelar/confirmar, 404 idempotente, error, doble clic); prueba manual con dos pestañas (borrar una tarea ya borrada).

---

# Etapa 10 — Búsqueda y filtros

## T-36 · Lógica pura de filtros (`lib/filters.ts`)

- **Estado:** ⬜ Pendiente
- **Objetivo:** RN-11, RN-12, RN-13, D2, D3 como funciones puras y probadas.
- **Descripción:** `normalizeText` (minúsculas + sin acentos vía `normalize('NFD')`), `applyFilters(tasks, filters)` con `Filters = { search, priorities[], labels[], statuses[] }`: búsqueda por subcadena en título y descripción (solo espacios = vacía, CL-20); prioridad y estado con OR interno; etiquetas OR sin distinguir mayúsculas; AND entre tipos. Helpers: `hasActiveFilters`, `visibleStatuses` (D2: sin selección = las 4), `pruneLabels(filters, availableLabels)` (CA-08.8), y conteo "visibles de total" por columna.
- **Archivos involucrados:** `frontend/src/lib/filters.ts`, tests.
- **Dependencias:** T-22.
- **Criterios de aceptación:** "accion" encuentra "Acción"; "BUG" encuentra etiqueta "bug"; prioridad `[alta, media]` = OR; etiqueta + prioridad = AND; búsqueda `"   "` equivale a sin búsqueda; filtro de estado oculta columnas no seleccionadas; `pruneLabels` quita etiquetas inexistentes.
- **Pruebas necesarias:** unit tests tabulares de cada combinación de RN-12, acentos, mayúsculas, descripción nula, vacíos (CL-20), conteos "n de total".

## T-37 · Barra de filtros (`FilterBar`, `useFilters`) con debounce

- **Estado:** ⬜ Pendiente
- **Objetivo:** RF-08 en la UI (CA-08.1 a CA-08.4, CA-08.6, RN-16).
- **Descripción:** `useFilters` (estado local en `BoardPage`, no persistido: recargar limpia). `FilterBar` con `SearchInput` (debounce ~250 ms), `MultiSelectFilter` para prioridad, etiqueta (opciones de `useLabels`) y estado, y botón "Limpiar filtros" visible/habilitado solo si hay filtros activos. Controles con etiquetas accesibles y operables por teclado.
- **Archivos involucrados:** `frontend/src/hooks/useFilters.ts`, `frontend/src/components/filters/FilterBar.tsx`, `SearchInput.tsx`, `MultiSelectFilter.tsx`, `BoardPage.tsx`, tests.
- **Dependencias:** T-36, T-27.
- **Criterios de aceptación:** escribir filtra tras el debounce (sin una petición por tecla: el filtrado es local); cada multiselección funciona; "Limpiar filtros" restablece todo y solo está activo si hay filtros; recargar la página los limpia.
- **Pruebas necesarias:** tests de componente con timers simulados (debounce), selección múltiple, botón limpiar; comprobar en la pestaña Red que filtrar no genera peticiones.

## T-38 · Integración de filtros con el tablero (contadores, D1, "Sin resultados", CL-21)

- **Estado:** ⬜ Pendiente
- **Objetivo:** que los filtros afecten correctamente a todo el tablero (CA-08.5, CA-08.7, CA-08.8, RN-13, RN-14, CA-06.7, CL-21).
- **Descripción:** aplicar `applyFilters` en `BoardPage`; ocultar columnas según el filtro de estado (D2); contadores "visibles de total" con filtros activos; `NoResults` ("Sin resultados" + "Limpiar filtros") distinto de `EmptyBoard`; con filtros activos deshabilitar el arrastre (`useSortable({ disabled: true })`) y mostrar el aviso "Limpiá los filtros para mover tareas" (tooltip/aviso), manteniendo crear/editar/eliminar; al crear una tarea que no coincide con los filtros, informar con un toast que quedó oculta por los filtros; podar etiquetas seleccionadas que ya no existen (`pruneLabels`) tras eliminar/editar.
- **Archivos involucrados:** `frontend/src/components/board/BoardPage.tsx`, `Board.tsx`, `BoardColumn.tsx`, `TaskCard.tsx`, `NoResults.tsx`, `frontend/src/hooks/useBoardDnd.ts`, tests.
- **Dependencias:** T-37, T-30, T-33, T-35.
- **Criterios de aceptación:**
  - Contadores muestran "2 de 7" con filtros y "7" sin ellos.
  - Con cualquier filtro/búsqueda activa las tarjetas no se arrastran y se informa el motivo; al limpiar, vuelve a funcionar.
  - Sin coincidencias → "Sin resultados" con acción de limpiar; tablero sin tareas → `EmptyBoard` (no se confunden).
  - Crear una tarea no coincidente la crea y avisa que está oculta.
  - Quitar la última tarea con una etiqueta seleccionada la elimina del filtro.
- **Pruebas necesarias:** tests de componente (contadores, drag deshabilitado, NoResults vs. EmptyBoard, aviso de tarea oculta, poda de etiquetas); prueba manual de las combinaciones de RN-12.

---

# Etapa 11 — Testing y correcciones

## T-39 · Completar la cobertura de pruebas del frontend

- **Estado:** ⬜ Pendiente
- **Objetivo:** cubrir lo que falte respecto de la trazabilidad del plan §10.
- **Descripción:** revisar la matriz Spec → pruebas y agregar los tests faltantes: tablero (carga/error/vacío), `TaskForm`, `FilterBar`, `useMoveTask` (éxito, rollback, serialización), `useBoardDnd`, `isOverdue`, `applyMove`, `filters`. Sin agregar funcionalidad.
- **Archivos involucrados:** `frontend/src/**/*.test.ts(x)`.
- **Dependencias:** T-38.
- **Criterios de aceptación:** `npm test` en `frontend/` pasa y cada fila de la trazabilidad de frontend (RN-07, RN-09, RN-11/12/13, RN-14/15, CA-01.x, CA-06/07, CA-08, CA-09, CL-01…CL-06) tiene al menos una prueba identificable.
- **Pruebas necesarias:** `npm test`, `npm run typecheck`, `npm run lint`; revisión manual de la matriz.

## T-40 · Prueba E2E de humo con Playwright *(opcional según plan §10)*

- **Estado:** ⬜ Pendiente
- **Objetivo:** validar el flujo real de punta a punta contra backend y base reales.
- **Descripción:** instalar Playwright en `frontend/` y cubrir: crear tarea (aparece primera) → recargar (persiste) → editar → mover con teclado entre columnas y recargar → borrar con confirmación → filtros combinados y "Limpiar filtros" → con filtros activos no se puede arrastrar. Casos de error: backend detenido → `BoardError`; movimiento con la API fallando → rollback. Documentar cómo correrlo (base de test + backend + frontend). Si se decide omitirla, dejar constancia y reemplazar por la checklist manual de T-41.
- **Archivos involucrados:** `frontend/e2e/*.spec.ts`, `frontend/playwright.config.ts`, `frontend/package.json` (script `test:e2e`).
- **Dependencias:** T-38, T-18.
- **Criterios de aceptación:** los escenarios descritos pasan de forma repetible (3 corridas) y limpian sus datos.
- **Pruebas necesarias:** `npm run test:e2e` contra el entorno local completo.

## T-41 · Verificación final y correcciones

- **Estado:** ⬜ Pendiente
- **Objetivo:** cerrar el desarrollo con la spec cumplida y los proyectos listos para desplegar.
- **Descripción:**
  1. Recorrer **todos** los CA-xx y CL-xx de la spec en una checklist manual (o automática) y registrar resultado; corregir defectos (cada corrección con su test de regresión).
  2. Ejecutar en ambos proyectos desde copia limpia: `npm ci`, `lint`, `typecheck`/`build`, tests; en backend además `test:e2e`.
  3. Verificar el arranque en modo producción local: `backend` con `prisma migrate deploy` + `npm run build` + `npm run start:prod` (`PORT`, `0.0.0.0`, `CORS_ORIGIN`); `frontend` con `npm run build` + `npm start` y `NEXT_PUBLIC_API_URL` presente.
  4. Confirmar que no hay secretos versionados (`git ls-files | grep -E '\.env($|\.)'` solo muestra `.env.example`) y que no se agregó funcionalidad fuera de la spec.
  5. Commit final y push a `main`.
- **Archivos involucrados:** cualquiera con defectos; `docs/tasks.md` (marcar el estado de las tareas si se desea).
- **Dependencias:** T-39 (y T-40 si se hizo).
- **Criterios de aceptación:**
  - Todos los criterios de aceptación de la spec verificados; sin defectos conocidos abiertos.
  - Los comandos del punto 2 y 3 pasan sin errores ni advertencias relevantes.
  - Repositorio limpio y sincronizado con `origin/main`.
- **Pruebas necesarias:** la checklist de CA/CL, los comandos del punto 2–3, y una prueba exploratoria desde un segundo navegador para CA-10.2.

---

## Anexo — Grafo de dependencias resumido

```
T-01 ─┬─ T-02 ─┐
      ├─ T-03 ─┴─ T-04 ─ T-05 ─ T-06 ─ T-07 ─ T-08 ─ T-09
      │                          T-03 ─ T-10 ──┐
      │                          T-07,T-08 ────┴─ T-11 ─ T-12 ─ T-13 ─┬─ T-14 ─┐
      │                                                               ├─ T-15  ├─ T-17 ─┐
      │                                                               └─ T-16  │        ├─ T-18
      └─ T-19 ─ T-20 ─┬─ T-21                                                  └────────┘
                      ├─ T-22 ─ T-23 ─ T-24 ─┬─ T-25 ─┐
                      │                      └─ T-26 ─┴─ T-27 ─ T-28
                      └─ T-32                T-27 ─ T-29 ─ T-30 ─ T-31
                                             T-27,T-32 ─ T-33 ─ T-34 ─ T-35
                                             T-22 ─ T-36 ─ T-37 ─ T-38 ─ T-39 ─ T-40 ─ T-41
```

Las etapas de backend (T-02 – T-18) y frontend (T-19 – T-26, T-32, T-36) pueden avanzar en paralelo; la integración (T-27 en adelante) requiere ambas.
