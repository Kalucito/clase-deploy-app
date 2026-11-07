import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import {
  flattenValidationErrors,
  ValidationFailedException,
} from './common/errors';

/** Configuración compartida entre main.ts y los tests e2e. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const origins = (config.get<string>('CORS_ORIGIN') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new ValidationFailedException(flattenValidationErrors(errors)),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableShutdownHooks();
}
