# TaskFlow — Planificación técnica

Actuá como arquitecto de software senior.

Leé docs/spec.md y prepará el diseño técnico de la aplicación.

## 1. Stack obligatorio

### Frontend

- Next.js.
- App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui para componentes de interfaz.
- dnd-kit para drag & drop.

### Backend

- NestJS.
- TypeScript.
- API REST.
- Validación mediante DTOs y class-validator.

### Base de datos

- PostgreSQL.
- Prisma ORM.
- Migraciones de Prisma.

No reemplaces estas tecnologías ni agregues otras sin justificar previamente su necesidad.

## 2. Arquitectura

La aplicación debe tener dos proyectos independientes:

- frontend/: aplicación Next.js.
- backend/: API NestJS.

El frontend nunca debe conectarse directamente a PostgreSQL.

Toda operación de datos debe pasar por la API REST.

## 3. Diseño de backend

Definí:

- Módulos de NestJS.
- Controladores.
- Servicios.
- DTOs.
- Entidades y relaciones de datos.
- Endpoints REST.
- Validaciones.
- Manejo global de errores.

## 4. Modelo de datos

Diseñá el modelo Prisma teniendo en cuenta:

- Task.
- Label.
- Relación entre tareas y etiquetas.
- Estados y prioridades.
- Ordenamiento de tareas.
- Fechas y restricciones.

No agregues entidades de usuarios, sesiones, autenticación o permisos.

## 5. Diseño de frontend

Definí:

- Estructura de páginas.
- Componentes.
- Gestión del estado.
- Comunicación con el backend.
- Manejo de errores.
- Estrategia de actualización optimista para drag & drop.

## 6. Requisitos técnicos

- Código tipado.
- Separación de responsabilidades.
- Variables de entorno.
- Configuración de CORS.
- Configuración de conexión a PostgreSQL.
- Validación tanto en frontend como backend.
- Manejo consistente de errores.
- Migraciones reproducibles.

## 7. Entregable

Prepará:

1. Arquitectura general.
2. Estructura de carpetas.
3. Modelo de datos.
4. Contrato de API.
5. Componentes principales.
6. Decisiones técnicas justificadas.
7. Estrategia de testing.

No implementes todavía.

Guardá todo en docs/plan.md.
