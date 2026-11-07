Actuá como ingeniero de DevOps senior. Vamos a deployar TaskFlow en Railway usando la CLI de Railway.

Ya creé el proyecto taskflow en Railway. Vinculate con railway link, indicándolo por nombre.

## Qué tenés que hacer

1. Verificá que el código esté listo para producción: el backend escucha en process.env.PORT, el CORS y la URL de la API salen de variables de entorno, no hay credenciales en el código y el build de cada proyecto pasa.
2. Dentro del proyecto, creá:
   - Un servicio postgres.
   - Un servicio backend desde https://github.com/Kalucito/clase-deploy-app, rama main, con Root Directory /backend.
   - Un servicio frontend desde el mismo repositorio, con Root Directory /frontend.
3. Generá los dominios públicos de backend y frontend.
4. Configurá las variables con referencias entre servicios:
   - DATABASE_URL del backend, apuntando a postgres.
   - La URL de la API en el frontend, apuntando al dominio del backend.
   - El origen permitido por CORS en el backend, apuntando al dominio del frontend.
   La URL de la API se incorpora en el build del frontend: cargala antes de deployarlo.
5. Configurá prisma migrate deploy como comando previo al deploy del backend.
6. Hacé push a main y seguí los logs con railway logs. Si algo falla, explicame el primer error, corregilo y volvé a deployar hasta que los dos servicios estén activos.
7. Pasame la URL del frontend.

## Límites

- Operá solo sobre el proyecto taskflow. No crees, borres ni toques otros proyectos.
- No uses railway up: el deploy sale del push a main.
- No muestres en pantalla el valor de ningún secreto.
