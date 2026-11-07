# TaskFlow — Especificación funcional

**Versión:** 1.0 · **Fecha:** 2026-11-07

## 1. Resumen

TaskFlow es una aplicación web de gestión de tareas con interfaz Kanban. Hay **un único tablero compartido**, sin autenticación, usuarios, roles ni multi-tenancy. Cualquier visitante puede crear, editar, eliminar, mover y reordenar tareas. Los datos persisten en PostgreSQL.

## 2. Alcance

### Dentro de alcance
- Tablero Kanban con 4 columnas fijas y drag & drop.
- CRUD de tareas, reordenamiento y movimiento entre columnas.
- Búsqueda y filtros combinables.
- Persistencia en PostgreSQL.
- UI moderna, minimalista y responsive.

### Fuera de alcance
Login/autenticación, usuarios y equipos, comentarios, adjuntos, notificaciones, actividad/historial, múltiples tableros, integraciones externas, app móvil. No se implementa nada fuera de esta especificación (incluida la administración de etiquetas).

## 3. Decisiones de diseño (resueltas)

| # | Tema | Decisión |
|---|------|----------|
| D1 | Drag & drop con filtros | **Deshabilitado** mientras haya búsqueda o filtros activos. Se informa al usuario (tooltip/aviso: "Limpiá los filtros para mover tareas"). |
| D2 | Filtro por estado | **Selección múltiple**; las columnas no seleccionadas se **ocultan**. Sin selección = las 4 columnas visibles. |
| D3 | Etiquetas | Texto libre; sin distinguir mayúsculas/minúsculas; **filtro OR** (tareas con al menos una de las etiquetas seleccionadas). |
| D4 | Tarea vencida | `fecha de vencimiento < hoy` **y** estado ≠ Hecho. Fecha sin hora, comparada con la fecha local del navegador. |
| D5 | Concurrencia | **El último guardado gana.** Sin control de versiones. El tablero se actualiza al recargar la página o tras acciones propias. |

## 4. Modelo de datos

### Tarea
| Campo | Tipo | Reglas |
|-------|------|--------|
| id | identificador único | Generado por el sistema, inmutable. |
| título | texto | Obligatorio, 1–100 caracteres tras `trim`. |
| descripción | texto | Opcional, máx. 1000 caracteres. |
| estado | enum | `pendiente`, `en_progreso`, `en_revision`, `hecho`. Obligatorio. Por defecto `pendiente`. |
| prioridad | enum | `baja`, `media`, `alta`. Por defecto `media`. |
| fecha de vencimiento | fecha (sin hora) | Opcional. |
| etiquetas | lista de textos | 0 a 10 por tarea; cada una 1–20 caracteres; sin duplicados (case-insensitive) dentro de la tarea. |
| posición | entero | Orden dentro de su columna (0-based, contiguo). |
| creada | timestamp | Automático. |
| modificada | timestamp | Se actualiza en cualquier cambio de campo, estado o posición de la propia tarea. |

Los límites de etiquetas (10 por tarea, 20 caracteres) son una decisión de esta especificación, ya que el pedido no los fija.

## 5. Reglas de negocio

- **RN-01** Existen exactamente 4 columnas fijas, en este orden: Pendiente, En progreso, En revisión, Hecho. No se crean, renombran, reordenan ni eliminan.
- **RN-02** Toda tarea pertenece a exactamente una columna.
- **RN-03** Las posiciones dentro de cada columna son únicas y contiguas (0..n-1). Tras crear, mover o eliminar, el backend normaliza las posiciones de las columnas afectadas.
- **RN-04** Una tarea nueva se agrega **al principio** de su columna (posición 0; las demás tareas de la columna se desplazan una posición) (por defecto Pendiente; se puede elegir otro estado en el modal).
- **RN-05** Al cambiar el estado desde el modal de edición, la tarea va al final de la columna destino.
- **RN-06** Mover o reordenar es atómico: o se persisten estado y posiciones de todas las tareas afectadas, o ninguno.
- **RN-07** Si falla mover/reordenar, la UI restaura el estado visual previo y muestra un error.
- **RN-08** Eliminar requiere confirmación explícita. Es definitivo (sin papelera ni deshacer).
- **RN-09** La validación se aplica en backend (fuente de verdad) y también en el frontend (feedback inmediato).
- **RN-10** El título y las etiquetas se guardan con `trim`; un título compuesto solo por espacios es inválido.
- **RN-11** La búsqueda es por subcadena, sin distinguir mayúsculas ni acentos, sobre título y descripción.
- **RN-12** Los filtros (búsqueda, prioridad, etiqueta, estado) se combinan con **AND** entre tipos; dentro de etiquetas rige OR (D3). Prioridad y estado admiten selección múltiple (OR dentro del mismo filtro).
- **RN-13** Con filtros activos, los contadores de columna muestran las tareas **visibles** y el total real (ej. "2 de 7").
- **RN-14** Con filtros activos, el drag & drop está deshabilitado (D1). Crear, editar y eliminar siguen disponibles.
- **RN-15** Las tareas vencidas se identifican según D4. Una tarea en Hecho nunca se marca vencida; si vuelve a otra columna y la fecha ya pasó, se marca vencida.
- **RN-16** Los filtros viven en el estado de la UI; no se persisten en la base. Recargar la página los limpia.
- **RN-17** El orden de las tareas dentro de cada columna es siempre por posición, independiente de prioridad o vencimiento.

## 6. Requisitos funcionales y criterios de aceptación

### RF-01 Visualizar el tablero
- **CA-01.1** Al abrir la app se ven las 4 columnas en orden, cada una con título y contador de tareas.
- **CA-01.2** Cada tarjeta muestra título, prioridad (indicador visual), fecha de vencimiento (si existe) y etiquetas.
- **CA-01.3** Mientras se cargan los datos se muestra un estado de carga.
- **CA-01.4** Si la carga falla, se muestra un mensaje de error con acción "Reintentar".
- **CA-01.5** Si no hay ninguna tarea, se muestra un estado vacío con llamada a crear la primera tarea.
- **CA-01.6** Una columna sin tareas muestra un placeholder de columna vacía (el tablero no se considera vacío si otras columnas tienen tareas).
- **CA-01.7** Tras recargar, el tablero muestra los mismos datos y orden persistidos.

### RF-02 Crear tarea
- **CA-02.1** Un botón visible abre un modal con: título, descripción, estado, prioridad, vencimiento y etiquetas.
- **CA-02.2** Sin título válido, no se puede guardar y se muestra el error junto al campo.
- **CA-02.3** Con 101 caracteres en el título o 1001 en la descripción se bloquea el guardado con mensaje; se muestra contador de caracteres.
- **CA-02.4** Al guardar con éxito, el modal se cierra, la tarea aparece al principio de la columna elegida y el contador se actualiza.
- **CA-02.5** Si el guardado falla, el modal sigue abierto con los datos ingresados y se muestra el error.
- **CA-02.6** Durante el guardado, el botón queda deshabilitado para evitar duplicados por doble clic.

### RF-03 Consultar tarea
- **CA-03.1** Al hacer clic en una tarjeta se abre el modal con todos los datos, incluyendo fechas de creación y última modificación.
- **CA-03.2** Si la tarea ya no existe (eliminada por otro visitante), se informa y se refresca el tablero.

### RF-04 Editar tarea
- **CA-04.1** Se puede editar cualquier campo editable (título, descripción, estado, prioridad, vencimiento, etiquetas).
- **CA-04.2** Aplican las mismas validaciones que en la creación.
- **CA-04.3** Al guardar, se actualiza la fecha de modificación y la tarjeta refleja los cambios.
- **CA-04.4** Se puede quitar la fecha de vencimiento y la descripción (quedan vacías).
- **CA-04.5** Si la tarea fue eliminada por otro visitante, se muestra error y se refresca el tablero.
- **CA-04.6** Si la edición cambia el estado, aplica RN-05.

### RF-05 Eliminar tarea
- **CA-05.1** Al pulsar eliminar se solicita confirmación mostrando el título.
- **CA-05.2** Al cancelar, no cambia nada.
- **CA-05.3** Al confirmar, la tarea desaparece, se normalizan posiciones y se actualiza el contador.
- **CA-05.4** Si falla, la tarea permanece y se muestra el error.
- **CA-05.5** Eliminar una tarea ya eliminada se trata como éxito idempotente en la UI (se refresca el tablero).

### RF-06 Mover tarea entre columnas (drag & drop)
- **CA-06.1** Se puede arrastrar una tarjeta a cualquier columna y soltarla en una posición específica.
- **CA-06.2** Durante el arrastre hay feedback: la tarjeta arrastrada se distingue, la columna destino se resalta y se muestra un indicador del punto de inserción.
- **CA-06.3** Al soltar, la UI se actualiza de inmediato (optimista) y se envía el cambio al backend.
- **CA-06.4** Si el backend responde con error, la UI vuelve al estado anterior y se muestra un mensaje de error.
- **CA-06.5** Tras recargar, la tarea está en la nueva columna y posición.
- **CA-06.6** Soltar fuera de una columna cancela el movimiento sin llamadas al backend.
- **CA-06.7** Con filtros activos, las tarjetas no son arrastrables y se informa el motivo (RN-14).
- **CA-06.8** Debe ser utilizable en pantallas táctiles.

### RF-07 Reordenar dentro de una columna
- **CA-07.1** Arrastrar una tarjeta dentro de su columna cambia su posición y el orden se persiste.
- **CA-07.2** Soltarla en su misma posición no genera llamada al backend.
- **CA-07.3** Aplican CA-06.3, CA-06.4 y CA-06.5.

### RF-08 Búsqueda y filtros
- **CA-08.1** Un campo de búsqueda filtra por título y descripción (RN-11) mientras se escribe, con *debounce*.
- **CA-08.2** Filtro por prioridad (baja/media/alta, multiselección).
- **CA-08.3** Filtro por etiqueta: lista de etiquetas existentes en el tablero, multiselección, lógica OR.
- **CA-08.4** Filtro por estado: multiselección; oculta las columnas no seleccionadas (D2).
- **CA-08.5** Los filtros se combinan según RN-12.
- **CA-08.6** Un botón "Limpiar filtros" (visible/habilitado solo si hay filtros activos) restablece todo y rehabilita el drag & drop.
- **CA-08.7** Si ningún resultado coincide, se muestra "Sin resultados" con acción de limpiar filtros (distinto del tablero vacío).
- **CA-08.8** Si una etiqueta seleccionada deja de existir tras eliminar/editar tareas, se quita del filtro.

### RF-09 Indicador de vencimiento
- **CA-09.1** Una tarea vencida (D4) muestra la fecha con estilo distintivo (color + icono/texto, no solo color, por accesibilidad).
- **CA-09.2** Una tarea con vencimiento hoy no se marca vencida.
- **CA-09.3** Una tarea en Hecho no se marca vencida.

### RF-10 Persistencia
- **CA-10.1** Toda creación, edición, eliminación, movimiento y reordenamiento se persiste en PostgreSQL.
- **CA-10.2** Recargar o abrir la app desde otro navegador muestra el mismo estado.

### RF-11 Interfaz y responsive
- **CA-11.1** Diseño minimalista; el tablero es la pantalla principal.
- **CA-11.2** En escritorio, las 4 columnas se ven lado a lado. En pantallas angostas, las columnas se desplazan horizontalmente o se apilan, sin perder funcionalidad.
- **CA-11.3** El modal es usable en móvil, se cierra con Esc, botón cancelar o clic fuera (pidiendo confirmación si hay cambios sin guardar).
- **CA-11.4** Los errores se muestran con mensajes comprensibles en español, sin detalles técnicos.
- **CA-11.5** Los controles son operables por teclado y tienen etiquetas accesibles.

## 7. Casos límite

| # | Caso | Comportamiento esperado |
|---|------|-------------------------|
| CL-01 | Título de exactamente 100 caracteres / descripción de 1000 | Válido. |
| CL-02 | Título de 101 / descripción de 1001 | Rechazado (frontend y backend). |
| CL-03 | Título solo con espacios | Inválido. |
| CL-04 | Caracteres especiales, emojis, HTML/`<script>` en textos | Se guardan como texto y se muestran escapados; nunca se interpretan como HTML. |
| CL-05 | Las etiquetas "Bug" y "bug" | Se tratan como la misma etiqueta (sin duplicado en una tarea; filtro unificado). |
| CL-06 | Más de 10 etiquetas o etiqueta de más de 20 caracteres | Rechazado con mensaje. |
| CL-07 | Vencimiento en el pasado al crear | Permitido; se marca vencida si el estado ≠ Hecho. |
| CL-08 | Vencimiento = hoy | No vencida. |
| CL-09 | Cambio de día con la app abierta | La marca de vencida se recalcula al recargar o refrescar; no se exige actualización en tiempo real. |
| CL-10 | Mover a Hecho una tarea vencida | Deja de marcarse vencida. |
| CL-11 | Dos visitantes editan la misma tarea | El último guardado gana (D5). |
| CL-12 | Un visitante mueve/edita una tarea eliminada por otro | Error "La tarea ya no existe"; se refresca el tablero. |
| CL-13 | Dos visitantes mueven tareas a la misma columna a la vez | Las operaciones se serializan; las posiciones resultantes siguen contiguas y sin duplicados. |
| CL-14 | Posición destino fuera de rango | El backend la ajusta al rango válido (0..n); no es error. |
| CL-15 | Estado o prioridad con valor inválido (API directa) | Rechazado con error de validación. |
| CL-16 | Fecha de vencimiento inválida | Rechazada. |
| CL-17 | Pérdida de conexión durante un drag & drop | Rollback visual y mensaje de error (RN-07). |
| CL-18 | Doble clic en Guardar / Eliminar | Una sola operación efectiva. |
| CL-19 | Columnas con muchas tareas (cientos) | El tablero sigue siendo usable (scroll interno por columna). |
| CL-20 | Búsqueda con solo espacios | Se trata como búsqueda vacía. |
| CL-21 | Filtros activos y el usuario crea una tarea que no coincide | La tarea se crea pero no se muestra; se informa que quedó oculta por los filtros. |
| CL-22 | Cerrar el modal con cambios sin guardar | Se solicita confirmación de descarte. |

## 8. Requisitos no funcionales (acotados al alcance)

- **Persistencia:** PostgreSQL como única fuente de verdad.
- **Integridad:** restricciones en base de datos (estado y prioridad válidos, longitudes máximas, posición no nula).
- **Seguridad básica:** escapado de contenido, validación en servidor y consultas parametrizadas. No hay autenticación por diseño.
- **Rendimiento:** carga inicial del tablero percibida como inmediata con volúmenes razonables (hasta cientos de tareas).
- **Compatibilidad:** navegadores modernos (Chrome, Firefox, Safari, Edge) de escritorio y móvil.
- **Idioma de la interfaz:** español.

## 9. Supuestos

- Un solo tablero global, accesible públicamente; se asume que no hay datos sensibles.
- No hay actualización en tiempo real entre visitantes (sin WebSockets/polling); se ven cambios ajenos al recargar.
- No se registra autoría ni historial de cambios.
