Actuá como ingeniero de DevOps senior.

Vamos a publicar TaskFlow en Railway.

Leé:

- docs/spec.md
- docs/plan.md
- docs/tasks.md

## 1. Arquitectura de despliegue

Un único proyecto de Railway con tres servicios:

- postgres: base de datos PostgreSQL gestionada por Railway.
- backend: la API NestJS, desplegada desde la carpeta backend/.
- frontend: la aplicación Next.js, desplegada desde la carpeta frontend/.

Los tres se despliegan desde el repositorio https://github.com/Kalucito/clase-deploy-app.git, rama main.

No cambies el stack ni la arquitectura para simplificar el despliegue.

## 2. Primero auditá, sin modificar nada

Revisá el proyecto y decime:

1. ¿El .gitignore excluye .env, node_modules, .next y dist?
2. ¿Hay credenciales, URLs o puertos escritos en el código?
3. ¿Qué variables de entorno necesita cada servicio? ¿Están todas en un .env.example?
4. ¿El backend escucha en process.env.PORT y en 0.0.0.0?
5. ¿El CORS del backend toma el origen permitido de una variable de entorno?
6. ¿El frontend toma la URL de la API de una variable de entorno?
7. ¿Alguna dependencia que se usa en runtime está en devDependencies?
8. ¿Pasan el build y el start de producción de cada proyecto? Ejecutalos.

9. ¿El historial de Git tiene algún .env o credencial commiteada? Revisalo con git log.
10. ¿Está todo commiteado y pusheado a main?

Informá los hallazgos y esperá mi confirmación antes de cambiar nada.

Si encontrás una credencial en el historial, no alcanza con borrarla: decime cuál es para darla de baja y generar una nueva.

## 3. Preparación

Cuando te confirme, corregí únicamente lo que encontraste en la auditoría.

Además:

- Las migraciones de Prisma tienen que correr solas en cada deploy, con prisma migrate deploy. Nunca con migrate dev ni db push.
- Cada servicio tiene que tener definidos sus comandos de build y start.
- Ejecutá los tests y los builds después de los cambios.
- Hacé commit de los cambios y pedime confirmación antes del push: el push a main dispara el deploy.

## 4. Variables de entorno

Prepará una tabla con cada variable, el servicio que la usa y de dónde sale su valor en Railway.

Tené en cuenta:

- DATABASE_URL del backend tiene que referenciar a la variable del servicio postgres, no copiarse a mano.
- La URL pública del backend la necesita el frontend.
- La URL pública del frontend la necesita el CORS del backend.
- Las variables NEXT_PUBLIC_ se incorporan en el build: si cambian, el frontend tiene que volver a construirse.

## 5. Pasos en Railway

Escribí los pasos exactos que tengo que hacer en el panel de Railway, en orden:

- Crear el proyecto y la base de datos.
- Conectar la cuenta de GitHub y crear cada servicio desde el repositorio, con su Root Directory.
- Confirmar que el deploy automático esté activado sobre la rama main.
- Cargar las variables.
- Configurar el comando de migraciones.
- Generar los dominios públicos.

No ejecutes comandos de Railway ni hagas push sin mi confirmación.

## 6. Verificación

Cuando esté publicado, dame una lista de verificación en producción:

- La API responde desde su URL pública.
- El frontend carga y se conecta con la API.
- Crear, editar, mover y eliminar tareas funciona.
- Los datos siguen ahí después de recargar y después de un redeploy.
- El .env no está en el repositorio.

Guardá la guía de despliegue en docs/deploy.md.
