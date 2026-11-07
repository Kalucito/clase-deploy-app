Actuá como ingeniero de DevOps senior.

Vamos a publicar TaskFlow en Railway. Yo creo el proyecto taskflow en Railway. Todo el resto del despliegue lo hacés vos, desde la terminal con la CLI de Railway. Yo superviso y apruebo cada paso.

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

## 2. Qué hacés vos

Todo menos crear el proyecto, desde la terminal:

- Auditás y preparás el código.
- Vinculás este repositorio local con el proyecto taskflow que creé yo.
- Agregás el servicio postgres.
- Creás los servicios backend y frontend desde el repositorio, rama main, con Root Directory /backend y /frontend.
- Generás los dominios públicos de backend y frontend.
- Configurás las variables, los comandos y las migraciones de cada servicio.
- Desplegás haciendo push a main.
- Leés los logs, diagnosticás y corregís hasta que los dos servicios estén funcionando.

Lo estamos mostrando en clase: antes de cada paso, contá qué vas a hacer y por qué.

## 3. Límites

- Antes de tu primer comando de Railway, ejecutá railway whoami y confirmá la cuenta conmigo.
- Vinculate al proyecto taskflow con railway link, indicándolo por nombre. Operá solo sobre ese proyecto y sus servicios postgres, backend y frontend.
- No crees proyectos nuevos. Si no encontrás el proyecto taskflow, detenete y avisame.
- Antes de cada cambio, verificá con railway status que estás vinculado al proyecto correcto.
- No listes, vincules, modifiques ni borres ningún otro proyecto de la cuenta.
- No borres proyectos, servicios, entornos ni bases de datos. Si algo quedó mal creado, avisame.
- No uses railway up: el deploy sale siempre del repositorio, con push a main.
- No muestres en pantalla el valor de ningún secreto. Estamos proyectando.
- Antes de cada cambio en Railway, decime qué vas a cambiar y por qué.

## 4. Auditoría, sin modificar nada

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

## 5. Preparación del código

Cuando te confirme, corregí únicamente lo que encontraste en la auditoría.

- Ejecutá los tests y los builds después de los cambios.
- Hacé commit, pero no hagas push todavía.

## 6. Infraestructura y configuración en Railway

Dentro del proyecto taskflow, creá la infraestructura definida en la sección 1:

- El servicio postgres.
- Los servicios backend y frontend desde el repositorio, rama main, con Root Directory /backend y /frontend.
- Los dominios públicos de backend y frontend.

Verificá con railway status que todo quedó como se definió.

Si backend o frontend intentan desplegarse antes de tener sus variables y fallan, es esperable. No lo corrijas hasta terminar la configuración.

Prepará una tabla con cada variable, el servicio que la usa y de dónde sale su valor. Mostrámela antes de cargar nada.

Tené en cuenta:

- DATABASE_URL del backend tiene que ser una referencia a la variable del servicio postgres, no un valor copiado.
- La URL de la API que usa el frontend tiene que referenciar al dominio público del backend.
- El origen permitido por CORS en el backend tiene que referenciar al dominio público del frontend.
- Las variables NEXT_PUBLIC_ se incorporan en el build: si cambian, el frontend tiene que volver a construirse.

Cuando apruebe la tabla, configurá con la CLI:

- Las variables de cada servicio.
- Las migraciones como comando previo al deploy del backend, con prisma migrate deploy. Nunca con migrate dev ni db push.
- Los comandos de build y start, solo si Railway no los detecta correctamente.

## 7. Deploy

Pedime confirmación y hacé push a main.

Seguí el build y el deploy de cada servicio con railway logs.

Si algo falla:

1. Identificá el primer error, no el último.
2. Explicame por qué en mi máquina funcionaba y en Railway no.
3. Proponé el arreglo mínimo, sin cambiar la arquitectura, y esperá mi confirmación.
4. Aplicalo, ejecutá los tests y el build, hacé commit y push.
5. Volvé a seguir los logs.

Repetí hasta que backend y frontend estén activos.

## 8. Verificación

Cuando esté publicado:

- Comprobá que la API responde desde su URL pública.
- Dame la URL del frontend y una lista de lo que tengo que probar a mano: crear, editar, mover y eliminar tareas, y que los datos sigan después de recargar y después de un redeploy.
- Confirmá que el .env no está en el repositorio.

Guardá en docs/deploy.md qué se configuró en el panel, qué configuraste vos con la CLI y qué variables usa cada servicio, sin sus valores.
