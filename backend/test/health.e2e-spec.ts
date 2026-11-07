import { Test } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

async function createApp(
  override?: Partial<PrismaService>,
): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (override) {
    builder = builder
      .overrideProvider(PrismaService)
      .useValue({ onModuleInit: () => undefined, ...override });
  }
  const app = (await builder.compile()).createNestApplication<
    INestApplication<App>
  >();
  configureApp(app);
  await app.init();
  return app;
}

describe('GET /api/health (e2e)', () => {
  it('con la base arriba responde 200 {"status":"ok"}', async () => {
    const app = await createApp();
    try {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });

  it('con la base caída responde 503 con el formato unificado', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const app = await createApp({
      $queryRaw: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
    });
    try {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(503);
      expect(res.body).toEqual({
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          'El servicio no está disponible. Intentá nuevamente en unos instantes.',
      });
    } finally {
      await app.close();
      jest.restoreAllMocks();
    }
  });
});
