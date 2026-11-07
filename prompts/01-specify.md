# TaskFlow — Especificación funcional

Actuá como Product Manager y analista funcional senior.

Quiero desarrollar una aplicación web llamada TaskFlow, un sistema sencillo de gestión de tareas con interfaz Kanban.

## 1. Objetivo

Construir una aplicación web donde un equipo pueda organizar tareas visualmente, moviéndolas entre diferentes estados mediante drag & drop.

## 2. Alcance y restricciones

- No existe autenticación.
- No hay login, registro ni recuperación de contraseñas.
- No existen usuarios, roles ni permisos.
- No existe multi-tenancy.
- Hay un único tablero compartido por todos los visitantes.
- Cualquier visitante puede crear, editar, eliminar y mover tareas.
- Los datos deben persistir en PostgreSQL.
- No se deben implementar funcionalidades fuera del alcance definido.

## 3. Tablero Kanban

El tablero tiene cuatro columnas fijas y ordenadas:

1. Pendiente.
2. En progreso.
3. En revisión.
4. Hecho.

Cada columna muestra sus tareas y un contador.

Las tareas se pueden mover entre columnas mediante drag & drop.

Al mover una tarea:

- Debe actualizarse su estado en el backend.
- Debe persistir el nuevo orden.
- Si falla la operación, debe restaurarse el estado visual anterior y mostrarse un error.

## 4. Tareas

Cada tarea contiene:

- ID.
- Título (obligatorio, máximo 100 caracteres).
- Descripción (opcional, máximo 1000 caracteres).
- Estado.
- Prioridad: baja, media o alta.
- Fecha de vencimiento (opcional).
- Etiquetas (0 o más).
- Posición dentro de su columna.
- Fecha de creación.
- Fecha de última modificación.

## 5. Operaciones

El usuario puede:

- Crear una tarea.
- Consultar su información.
- Editar cualquier campo.
- Eliminar una tarea, solicitando confirmación.
- Moverla entre columnas.
- Cambiar su posición dentro de una columna.

## 6. Búsqueda y filtros

Debe existir:

- Búsqueda por título y descripción.
- Filtro por prioridad.
- Filtro por etiqueta.
- Filtro por estado.
- Opción para limpiar los filtros.

Los filtros deben poder combinarse.

## 7. Interfaz

- Diseño moderno, minimalista y responsive.
- Tablero Kanban como pantalla principal.
- Modal para crear y editar tareas.
- Tarjetas con título, prioridad, vencimiento y etiquetas.
- Indicador visual de tareas vencidas.
- Feedback visual durante drag & drop.
- Estados de carga, error y tablero vacío.

## 8. Persistencia

Todos los cambios deben persistir en PostgreSQL.

Recargar la página no debe perder información.

## 9. Fuera de alcance

- Login y autenticación.
- Usuarios y equipos.
- Comentarios.
- Archivos adjuntos.
- Notificaciones.
- Actividad e historial.
- Tableros múltiples.
- Integraciones externas.
- Aplicación móvil.

## 10. Entregable

Prepará una especificación funcional completa, identificando reglas de negocio, criterios de aceptación y casos límite.

No implementes código.

Si detectás ambigüedades que afecten el comportamiento, preguntame antes de cerrar la especificación.

Guardá el documento en docs/spec.md.
