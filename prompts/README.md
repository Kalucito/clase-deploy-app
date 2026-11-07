# Prompts de TaskFlow

Los prompts que usamos en clase para construir y publicar TaskFlow con un agente, siguiendo Spec-Driven Development.

Se usan en orden, uno por vez. Cada uno lee lo que dejó el anterior en `docs/`.

| Paso | Archivo | Qué hace | Qué deja |
|---|---|---|---|
| 1 | `01-specify.md` | Define el producto y su alcance | `docs/spec.md` |
| 2 | `02-plan.md` | Diseña la arquitectura con el stack fijado | `docs/plan.md` |
| 3 | `03-tasks.md` | Divide el trabajo en tareas verificables | `docs/tasks.md` |
| 4 | `04-implement.md` | Implementa tarea por tarea, con commits | `frontend/`, `backend/` |
| 5 | `05-verify.md` | Audita contra la spec y corre los tests | informe + `docs/tasks.md` |
| 6 | `06-deploy.md` | Vos creás el proyecto en Railway y el agente hace el resto: servicios, configuración, deploy y logs | `docs/deploy.md` |
| 7 | `07-deploy-fallido.md` | Diagnostica un deploy que falló, leyendo los logs de Railway | el arreglo |

## Reglas

- **No encadenes los prompts en automático.** Después de SPECIFY y de PLAN, leé lo que decidió el agente y corregí lo que no te convenza.
- **Los documentos de `docs/` son la fuente de verdad.** Si cambia un requerimiento, primero se actualiza `spec.md`, después `plan.md` y por último las tareas afectadas.
- **El `.env` no se sube nunca.** El repositorio es público.

## Stack

Next.js · NestJS · PostgreSQL · Prisma, en un solo repositorio con `frontend/` y `backend/`. Se despliega en Railway como tres servicios del mismo proyecto.
