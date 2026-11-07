Vamos a implementar TaskFlow.

Antes de comenzar, leé y respetá obligatoriamente:

- docs/spec.md
- docs/plan.md
- docs/tasks.md

Actuá como desarrollador senior.

## Reglas de implementación

1. Seguí la arquitectura definida en docs/plan.md.
2. Respetá estrictamente el stack tecnológico establecido.
3. Ejecutá las tareas siguiendo sus dependencias.
4. No inventes funcionalidades ni cambies decisiones arquitectónicas.
5. Mantené frontend y backend desacoplados.
6. Utilizá Prisma para todas las operaciones de base de datos.
7. Implementá validaciones en el backend.
8. No agregues autenticación, usuarios ni permisos.
9. No utilices datos mock como sustituto de la persistencia real.
10. No marques tareas como terminadas sin verificar sus criterios de aceptación.

## Dinámica de trabajo

- Implementá una unidad funcional por vez.
- Ejecutá las pruebas correspondientes.
- Corregí errores antes de continuar.
- Actualizá docs/tasks.md.
- Hacé un commit por cada tarea terminada, con un mensaje que incluya su ID.
- Antes de cada commit, revisá qué archivos se agregan: nunca un .env ni credenciales.
- Al terminar cada etapa, hacé push a main en https://github.com/Kalucito/clase-deploy-app.git.
- Si encontrás contradicciones o decisiones no contempladas, detenete y consultame.
- No sacrifiques la arquitectura para acelerar la implementación.

Comenzá por la primera tarea pendiente y avanzá incrementalmente.

Al finalizar cada etapa, informá:

- Qué implementaste.
- Qué verificaste.
- Qué tareas completaste.
- Qué problemas encontraste.
