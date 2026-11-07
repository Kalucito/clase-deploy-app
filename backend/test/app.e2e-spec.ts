import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

describe('Bootstrap (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('una ruta inexistente responde 404', () => {
    return request(app.getHttpServer()).get('/api/no-existe').expect(404);
  });

  it('los errores usan el formato unificado en español', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/no-existe')
      .expect(404);
    expect(res.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'El recurso no existe',
    });
  });

  it('un JSON mal formado responde 400 sin detalles técnicos', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ')
      .expect(400);
    expect(res.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'La solicitud no es válida',
    });
  });

  it('las rutas sin prefijo /api no existen', () => {
    return request(app.getHttpServer()).get('/tasks').expect(404);
  });

  it('CORS: un origen permitido recibe Access-Control-Allow-Origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/tasks')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    expect(res.headers['access-control-allow-methods']).toContain('PATCH');
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('CORS: un origen no permitido no recibe el header', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/tasks')
      .set('Origin', 'http://malo.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
