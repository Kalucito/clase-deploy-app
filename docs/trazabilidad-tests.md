# Trazabilidad spec → pruebas (frontend)

Cada requisito tiene al menos una prueba identificable. Rutas relativas a `frontend/src/`.

| Spec | Prueba |
|---|---|
| RN-07, CA-06.4, CL-17 (rollback exacto y toast) | `hooks/useMoveTask.test.tsx` (500, red, 404) |
| CA-06.3 (actualización optimista), serialización | `hooks/useMoveTask.test.tsx` |
| CA-06.1/06.6, CA-07.1/07.2 (mover, soltar fuera, mismo lugar) | `hooks/useBoardDnd.test.tsx` |
| CA-06.2 (feedback de arrastre) | `components/board/Board.test.tsx` (`isDropTarget`) |
| CA-06.7, RN-14, D1 (arrastre deshabilitado con filtros + aviso) | `components/board/BoardPage.filters.test.tsx`, `Board.test.tsx` |
| CA-06.8 (touch), CA-11.5 (teclado) | `hooks/useBoardDnd.test.tsx` (`boardKeyboardCoordinates`), `components/board/TaskCard.test.tsx` |
| RN-09, CL-01…CL-06, CL-15, CL-16 (validación cliente) | `lib/validation.test.ts`, `components/tasks/TagInput.test.tsx`, `TaskDialog.test.tsx` |
| CA-02.x, CL-18 (crear, contadores, doble envío, error) | `components/tasks/TaskDialog.test.tsx` |
| CA-03.x, CA-04.x, CL-11/CL-12 (consultar/editar, 404) | `components/tasks/TaskDialog.edit.test.tsx` |
| CA-05.x, RN-08 (eliminar con confirmación) | `components/tasks/DeleteTaskDialog.test.tsx` |
| CL-22, CA-11.3 (descartar cambios, Esc) | `components/tasks/TaskDialog.test.tsx` |
| RN-11, RN-12, CL-20, D3 (búsqueda y combinación AND/OR) | `lib/filters.test.ts` |
| RN-13 (contadores "n de total") | `lib/filters.test.ts`, `Board.test.tsx`, `BoardPage.filters.test.tsx` |
| CA-08.1…08.4, CA-08.6 (barra de filtros, debounce, limpiar) | `components/filters/FilterBar.test.tsx` |
| CA-08.7 (Sin resultados ≠ vacío), D2, CA-08.8, CL-21 | `components/board/BoardPage.filters.test.tsx` |
| RN-15, CA-09.x, CL-08, CL-10 (vencidas) | `lib/dates.test.ts`, `components/board/TaskCard.test.tsx` |
| RN-03/RN-17 (orden por posición, `applyMove`) | `lib/board.test.ts` |
| CA-01.1…01.6 (tablero, carga, error, vacío) | `components/board/Board.test.tsx`, `BoardPage.test.tsx` |
| CL-04 (HTML se muestra como texto) | `components/board/TaskCard.test.tsx` |
| Contrato de API y errores en español | `lib/api/api.test.ts` |
| RN-01 (4 columnas fijas, orden) | `lib/constants.test.ts`, `Board.test.tsx` |

Los requisitos de backend (RN-03…RN-06, CL-13, CL-14, formato de error, CORS) se cubren en `backend/test/*.e2e-spec.ts` y `backend/src/**/*.spec.ts`.
