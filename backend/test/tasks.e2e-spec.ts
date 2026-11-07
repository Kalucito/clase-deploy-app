import request from 'supertest';
import {
  columnTitles,
  createTestApp,
  expectPositionsContiguous,
  resetDb,
  seedTask,
  TestContext,
} from './helpers/app';

describe('Tasks (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await resetDb(ctx.prisma);
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
  });

  describe('GET /api/tasks', () => {
    it('base vacía → 200 []', async () => {
      const res = await request(ctx.http).get('/api/tasks').expect(200);
      expect(res.body).toEqual([]);
    });

    it('ordena por columna del tablero y luego por posición', async () => {
      await seedTask(ctx.prisma, { title: 'h0', status: 'hecho', position: 0 });
      await seedTask(ctx.prisma, {
        title: 'p1',
        status: 'pendiente',
        position: 1,
      });
      await seedTask(ctx.prisma, {
        title: 'r0',
        status: 'en_revision',
        position: 0,
      });
      await seedTask(ctx.prisma, {
        title: 'p0',
        status: 'pendiente',
        position: 0,
      });
      await seedTask(ctx.prisma, {
        title: 'e0',
        status: 'en_progreso',
        position: 0,
      });
      const res = await request(ctx.http).get('/api/tasks').expect(200);
      expect(res.body.map((t: { title: string }) => t.title)).toEqual([
        'p0',
        'p1',
        'e0',
        'r0',
        'h0',
      ]);
      await expectPositionsContiguous(ctx.prisma);
      expect(await columnTitles(ctx.prisma, 'pendiente')).toEqual(['p0', 'p1']);
    });

    it('devuelve la forma exacta del recurso', async () => {
      const t = await seedTask(ctx.prisma, {
        title: 'Preparar demo',
        description: 'Texto',
        position: 0,
        dueDate: '2026-11-20',
        labels: ['Demo', 'frontend'],
      });
      const res = await request(ctx.http).get('/api/tasks').expect(200);
      expect(res.body).toEqual([
        {
          id: t.id,
          title: 'Preparar demo',
          description: 'Texto',
          status: 'pendiente',
          priority: 'media',
          dueDate: '2026-11-20',
          labels: ['Demo', 'frontend'],
          position: 0,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        },
      ]);
    });

    it('description y dueDate ausentes salen como null', async () => {
      await seedTask(ctx.prisma, { title: 'x', position: 0 });
      const res = await request(ctx.http).get('/api/tasks').expect(200);
      expect(res.body[0]).toMatchObject({
        description: null,
        dueDate: null,
        labels: [],
      });
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('200 con la tarea', async () => {
      const t = await seedTask(ctx.prisma, {
        title: 'uno',
        position: 0,
        labels: ['a'],
      });
      const res = await request(ctx.http).get(`/api/tasks/${t.id}`).expect(200);
      expect(res.body).toMatchObject({ id: t.id, title: 'uno', labels: ['a'] });
    });

    it('404 "La tarea no existe" si no existe', async () => {
      const res = await request(ctx.http)
        .get('/api/tasks/7b1e0a2e-5d1c-4a0e-9c3e-1d2f3a4b5c6d')
        .expect(404);
      expect(res.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'La tarea no existe',
      });
    });

    it('400 si el id no es un UUID', async () => {
      const res = await request(ctx.http).get('/api/tasks/abc').expect(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'El identificador no es válido',
      });
    });
  });
});
