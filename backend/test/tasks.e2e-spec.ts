import request from 'supertest';
import {
  columnTitles,
  createTestApp,
  expectPositionsContiguous,
  resetDb,
  seedColumn,
  seedTask,
  TestContext,
} from './helpers/app';
import { TaskStatus } from '../src/generated/prisma/enums';

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

  describe('POST /api/tasks', () => {
    const post = (body: unknown) =>
      request(ctx.http)
        .post('/api/tasks')
        .send(body as object);
    const titles = async (status: TaskStatus) =>
      columnTitles(ctx.prisma, status);

    it('solo con título: pendiente/media, posición 0, sin etiquetas', async () => {
      const res = await post({ title: 'Mínima' }).expect(201);
      expect(res.body).toMatchObject({
        title: 'Mínima',
        status: 'pendiente',
        priority: 'media',
        position: 0,
        labels: [],
        description: null,
        dueDate: null,
      });
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.createdAt).toBe(res.body.updatedAt);
      const stored = await ctx.prisma.task.findUniqueOrThrow({
        where: { id: res.body.id },
      });
      expect(stored.title).toBe('Mínima');
    });

    it('con todos los campos', async () => {
      const res = await post({
        title: '  Completa  ',
        description: 'Detalle',
        status: 'en_revision',
        priority: 'alta',
        dueDate: '2026-11-20',
        labels: ['Demo', 'demo', 'front'],
      }).expect(201);
      expect(res.body).toMatchObject({
        title: 'Completa',
        description: 'Detalle',
        status: 'en_revision',
        priority: 'alta',
        dueDate: '2026-11-20',
        labels: ['Demo', 'front'],
        position: 0,
      });
    });

    it('la nueva tarea queda primera y desplaza a las demás; otras columnas intactas', async () => {
      await seedColumn(ctx.prisma, 'pendiente', 3, 'p');
      await seedColumn(ctx.prisma, 'hecho', 2, 'h');
      await post({ title: 'nueva' }).expect(201);
      expect(await titles('pendiente')).toEqual(['nueva', 'p0', 'p1', 'p2']);
      expect(await titles('hecho')).toEqual(['h0', 'h1']);
      await post({ title: 'otra', status: 'hecho' }).expect(201);
      expect(await titles('hecho')).toEqual(['otra', 'h0', 'h1']);
      expect(await titles('pendiente')).toEqual(['nueva', 'p0', 'p1', 'p2']);
      await expectPositionsContiguous(ctx.prisma);
    });

    it('en una columna vacía queda en la posición 0', async () => {
      const res = await post({ title: 'a', status: 'en_progreso' }).expect(201);
      expect(res.body.position).toBe(0);
    });

    it('"Demo"/"demo" → una etiqueta; reutiliza la fila existente', async () => {
      const r1 = await post({ title: 'a', labels: ['Demo', 'demo'] }).expect(
        201,
      );
      expect(r1.body.labels).toEqual(['Demo']);
      const r2 = await post({ title: 'b', labels: ['DEMO'] }).expect(201);
      expect(r2.body.labels).toEqual(['Demo']);
      expect(await ctx.prisma.label.count()).toBe(1);
    });

    it('vencimiento en el pasado está permitido (CL-07)', async () => {
      const res = await post({ title: 'a', dueDate: '2020-01-01' }).expect(201);
      expect(res.body.dueDate).toBe('2020-01-01');
    });

    it('descripción vacía se guarda como null', async () => {
      const res = await post({ title: 'a', description: '' }).expect(201);
      expect(res.body.description).toBeNull();
    });

    it('guarda HTML y emojis tal cual, sin interpretarlos (CL-04)', async () => {
      const title = '<script>alert(1)</script> 🔥 & "x"';
      const res = await post({
        title,
        description: '<b>hola</b>',
        labels: ['<i>'],
      }).expect(201);
      expect(res.body.title).toBe(title);
      expect(res.body.description).toBe('<b>hola</b>');
      expect(res.body.labels).toEqual(['<i>']);
      const get = await request(ctx.http)
        .get(`/api/tasks/${res.body.id}`)
        .expect(200);
      expect(get.body.title).toBe(title);
    });

    it('límites válidos: título 100, descripción 1000, 10 etiquetas de 20 (CL-01)', async () => {
      await post({
        title: 'a'.repeat(100),
        description: 'b'.repeat(1000),
        labels: Array.from({ length: 10 }, (_, i) => `${i}`.padEnd(20, 'x')),
      }).expect(201);
    });

    describe('validaciones → 400 con details por campo', () => {
      const cases: [string, unknown, string][] = [
        ['título vacío', { title: '' }, 'title'],
        ['título solo espacios (CL-03)', { title: '   ' }, 'title'],
        ['sin título', {}, 'title'],
        ['título de 101 (CL-02)', { title: 'a'.repeat(101) }, 'title'],
        [
          'descripción de 1001 (CL-02)',
          { title: 'a', description: 'b'.repeat(1001) },
          'description',
        ],
        [
          '11 etiquetas (CL-06)',
          { title: 'a', labels: Array.from({ length: 11 }, (_, i) => `t${i}`) },
          'labels',
        ],
        [
          'etiqueta de 21 (CL-06)',
          { title: 'a', labels: ['x'.repeat(21)] },
          'labels',
        ],
        ['estado inválido (CL-15)', { title: 'a', status: 'otro' }, 'status'],
        [
          'prioridad inválida (CL-15)',
          { title: 'a', priority: 'urgente' },
          'priority',
        ],
        [
          'fecha inválida (CL-16)',
          { title: 'a', dueDate: '2026-02-31' },
          'dueDate',
        ],
        [
          'formato de fecha (CL-16)',
          { title: 'a', dueDate: '20-11-2026' },
          'dueDate',
        ],
        ['campo desconocido', { title: 'a', foo: 1 }, 'foo'],
        ['position no permitido', { title: 'a', position: 2 }, 'position'],
      ];
      it.each(cases)('%s', async (_name, body, field) => {
        const res = await post(body).expect(400);
        expect(res.body).toMatchObject({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Los datos enviados no son válidos',
        });
        expect(
          res.body.details.map((d: { field: string }) => d.field),
        ).toContain(field);
        for (const d of res.body.details) {
          expect(typeof d.message).toBe('string');
        }
        expect(await ctx.prisma.task.count()).toBe(0);
      });
    });
  });
});
