# Verificación final (T-41)

**Fecha:** 2026-11-07 · Entorno: PostgreSQL 16 en Docker, backend NestJS + frontend Next.js.

## Comandos desde copia limpia (`rm -rf node_modules` + `npm ci`)

| Proyecto | Comando | Resultado |
|---|---|---|
| backend | `npm run lint` | sin errores |
| backend | `npm run build` | OK (incluye `prisma generate`) |
| backend | `npm test` | 61 pruebas unitarias OK |
| backend | `npm run test:e2e` | 141 pruebas OK contra PostgreSQL real (3 corridas seguidas verdes en T-18) |
| frontend | `npm run lint`, `npm run typecheck` | sin errores (también sin `.next` generado) |
| frontend | `npm test` | 228 pruebas OK |
| frontend | `NEXT_PUBLIC_API_URL=… npm run build` | OK; sin la variable el build falla con mensaje claro |

**Modo producción local:** `prisma migrate deploy` + `npm run build` + `start:prod` (`NODE_ENV=production`, `PORT=3998`, `0.0.0.0`, `CORS_ORIGIN`) y `next start` del frontend apuntando a ese backend: el tablero carga los datos reales, `GET /api/health` responde 200 y CORS responde solo para el origen configurado.

**Secretos:** `git ls-files | grep -E '(^|/)\.env($|\.)'` solo lista `backend/.env.example` y `frontend/.env.example`. No hay `node_modules`, `dist`, `.next` ni el cliente Prisma generado versionados.

## Checklist de la spec

Leyenda: **A** = prueba automática · **M** = verificado a mano en Chrome contra backend real · **C** = revisado solo por CSS/configuración (no se pudo ejercitar).

| Requisito | Evidencia |
|---|---|
| CA-01.1–01.6 tablero, carga, error+Reintentar, vacío, columna vacía | A (`Board.test`, `BoardPage.test`) · M (backend apagado → error → Reintentar recupera) |
| CA-01.7, CA-10.1, CA-10.2 persistencia | A (e2e backend) · M (recargar muestra el mismo estado; datos leídos por la API de la base) |
| CA-02.1–02.6 crear | A (`TaskDialog.test`) · M (la tarea queda primera de su columna) |
| CA-03.x, CA-04.x editar/consultar | A (`TaskDialog.edit.test`) · M (modal con datos y fechas) |
| CA-05.x eliminar | A (`DeleteTaskDialog.test`) · M (cancelar conserva, confirmar borra, posiciones `{0,1,2,3}` contiguas) |
| CA-06.1–06.6 mover | A (`useBoardDnd.test`, `useMoveTask.test`) · M con teclado (un solo `PATCH …/move`, columna destino resaltada, persiste tras recargar) |
| CA-06.8 touch | C (`TouchSensor` con retraso 200 ms; sin dispositivo táctil real) |
| CA-07.x reordenar | A · M (teclado ↓ persiste el nuevo orden) |
| CA-08.1–08.8 búsqueda y filtros | A (`filters.test`, `FilterBar.test`, `BoardPage.filters.test`) · M (buscar no genera peticiones) |
| CA-09.x vencidas | A (`dates.test`, `TaskCard.test`) · M (tareas con fecha pasada muestran "Vencida") |
| CA-11.1, CA-11.4, CA-11.5 diseño, mensajes, teclado | M · A |
| CA-11.2 responsive (≤ 375 px) | C (la ventana del navegador de pruebas no permite achicar el viewport; layout con `min-w-[85%]` + snap) |
| CA-11.3 modal (Esc, cancelar, descartar) | A (`TaskDialog.test`) |
| CL-01…CL-03, CL-06, CL-15, CL-16 límites y validaciones | A (backend DTO + e2e; frontend `validation.test`) |
| CL-04 HTML/emoji como texto | A · M (título `<img onerror>` + `<b>` se muestra literal, sin nodos `img`/`b`) |
| CL-05 etiquetas "Bug"/"bug" | A (backend e2e; `TagInput.test`) |
| CL-07, CL-08, CL-10 vencimientos | A |
| CL-09 cambio de día | no se exige tiempo real (se recalcula al recargar) |
| CL-11, CL-12 concurrencia entre visitantes / tarea ya eliminada | A (404 → "La tarea ya no existe" y refresco; backend e2e) |
| CL-13 operaciones concurrentes | A (backend e2e con 25+ operaciones en paralelo) |
| CL-14 posición fuera de rango | A (backend e2e, `board.test`) |
| CL-17 pérdida de conexión al mover | A · M (backend detenido → rollback visual + mensaje) |
| CL-18 doble clic | A (crear y eliminar) |
| CL-19 cientos de tareas | M (columna de 200 tarjetas con scroll interno, sin scroll de página) |
| CL-20 búsqueda con espacios | A |
| CL-21 tarea creada oculta por filtros | A (`BoardPage.filters.test`) |
| CL-22 cerrar con cambios | A |

## Defectos hallados y corregidos durante la verificación
- `cacheComponents` de Next rechazaba `new Date()` en el prerender → se quitó esa opción (la app carga datos en el cliente).
- `typecheck` fallaba sin un build previo por depender del tipo generado `LayoutProps` → tipo explícito.
- shadcn dejó `utils.ts` reexportando el paquete de terceros `cn` → reemplazado por `clsx` + `tailwind-merge`.
- La página tenía un scroll vertical espurio → el contenedor raíz pasó a `fixed inset-0`.

## No verificado / limitaciones
- Prueba E2E con Playwright (T-40) omitida: es opcional y requiere descargar navegadores.
- Touch real y viewports ≤ 375 px: ver **C** arriba.
- `prisma migrate reset` no se ejecutó (Prisma exige consentimiento explícito del usuario); la migración se verificó con `migrate dev` y `migrate deploy` sobre bases vacías.
