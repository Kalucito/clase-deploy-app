import { Logger } from '@nestjs/common';
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

  describe('DELETE /api/tasks/:id', () => {
    const del = (id: string) => request(ctx.http).delete(`/api/tasks/${id}`);

    it.each([
      ['la primera', 0, ['p1', 'p2', 'p3']],
      ['una del medio', 1, ['p0', 'p2', 'p3']],
      ['la última', 3, ['p0', 'p1', 'p2']],
    ])('borrar %s compacta las posiciones', async (_n, idx, expected) => {
      const col = await seedColumn(ctx.prisma, 'pendiente', 4, 'p');
      await seedColumn(ctx.prisma, 'hecho', 2, 'h');
      const res = await del(col[idx].id).expect(204);
      expect(res.text).toBe('');
      expect(await columnTitles(ctx.prisma, 'pendiente')).toEqual(expected);
      expect(await columnTitles(ctx.prisma, 'hecho')).toEqual(['h0', 'h1']);
      await expectPositionsContiguous(ctx.prisma);
    });

    it('borrar de nuevo → 404', async () => {
      const [t] = await seedColumn(ctx.prisma, 'pendiente', 1);
      await del(t.id).expect(204);
      const res = await del(t.id).expect(404);
      expect(res.body.message).toBe('La tarea no existe');
    });

    it('id inválido → 400', async () => {
      await del('abc').expect(400);
    });

    it('no cambia updatedAt de las vecinas', async () => {
      const past = new Date('2026-01-01T00:00:00.000Z');
      const a = await seedTask(ctx.prisma, {
        title: 'a',
        position: 0,
        updatedAt: past,
      });
      const b = await seedTask(ctx.prisma, {
        title: 'b',
        position: 1,
        updatedAt: past,
      });
      await del(a.id).expect(204);
      const after = await ctx.prisma.task.findUniqueOrThrow({
        where: { id: b.id },
      });
      expect(after.position).toBe(0);
      expect(after.updatedAt.toISOString()).toBe(past.toISOString());
    });

    it('conserva las etiquetas huérfanas en la base', async () => {
      const t = await seedTask(ctx.prisma, {
        title: 'a',
        position: 0,
        labels: ['solo'],
      });
      await del(t.id).expect(204);
      expect(await ctx.prisma.label.count()).toBe(1);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    const patch = (id: string, body: unknown) =>
      request(ctx.http)
        .patch(`/api/tasks/${id}`)
        .send(body as object);
    const past = new Date('2026-01-01T00:00:00.000Z');

    async function seedFull() {
      return seedTask(ctx.prisma, {
        title: 'orig',
        description: 'desc',
        position: 0,
        dueDate: '2026-12-01',
        labels: ['a', 'b'],
        updatedAt: past,
      });
    }

    it.each([
      ['title', { title: '  Nuevo  ' }, { title: 'Nuevo' }],
      ['description', { description: 'otra' }, { description: 'otra' }],
      ['priority', { priority: 'alta' }, { priority: 'alta' }],
      ['dueDate', { dueDate: '2027-01-15' }, { dueDate: '2027-01-15' }],
    ])('edita %s sin mover la tarea', async (_f, body, expected) => {
      const t = await seedFull();
      await seedTask(ctx.prisma, { title: 'x1', position: 1 });
      const res = await patch(t.id, body).expect(200);
      expect(res.body).toMatchObject({
        ...expected,
        position: 0,
        status: 'pendiente',
      });
      expect(res.body.createdAt).toBe(t.createdAt.toISOString());
      expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
        past.getTime(),
      );
      await expectPositionsContiguous(ctx.prisma);
    });

    it('un parche vacío no cambia nada', async () => {
      const t = await seedFull();
      const res = await patch(t.id, {}).expect(200);
      expect(res.body).toMatchObject({
        title: 'orig',
        description: 'desc',
        dueDate: '2026-12-01',
        labels: ['a', 'b'],
      });
    });

    it('null vacía description y dueDate (CA-04.4)', async () => {
      const t = await seedFull();
      const res = await patch(t.id, {
        dueDate: null,
        description: null,
      }).expect(200);
      expect(res.body).toMatchObject({ dueDate: null, description: null });
      const res2 = await patch(t.id, { description: '' }).expect(200);
      expect(res2.body.description).toBeNull();
    });

    it('reemplaza el conjunto de etiquetas (deduplicado)', async () => {
      const t = await seedFull();
      const res = await patch(t.id, { labels: ['c', 'C', 'a'] }).expect(200);
      expect(res.body.labels).toEqual(['a', 'c']);
      const res2 = await patch(t.id, { labels: [] }).expect(200);
      expect(res2.body.labels).toEqual([]);
    });

    it.each([
      ['la primera', 0, ['p1', 'p2', 'p3']],
      ['una del medio', 1, ['p0', 'p2', 'p3']],
      ['la última', 3, ['p0', 'p1', 'p2']],
    ])(
      'cambiar estado de %s la deja al final del destino y compacta el origen',
      async (_n, idx, origin) => {
        const col = await seedColumn(ctx.prisma, 'pendiente', 4, 'p');
        await seedColumn(ctx.prisma, 'en_revision', 2, 'r');
        const res = await patch(col[idx].id, { status: 'en_revision' }).expect(
          200,
        );
        expect(res.body).toMatchObject({ status: 'en_revision', position: 2 });
        expect(await columnTitles(ctx.prisma, 'pendiente')).toEqual(origin);
        expect(await columnTitles(ctx.prisma, 'en_revision')).toEqual([
          'r0',
          'r1',
          `p${idx}`,
        ]);
        await expectPositionsContiguous(ctx.prisma);
      },
    );

    it('cambiar estado hacia una columna vacía → posición 0', async () => {
      const [t] = await seedColumn(ctx.prisma, 'pendiente', 1);
      const res = await patch(t.id, { status: 'hecho' }).expect(200);
      expect(res.body).toMatchObject({ status: 'hecho', position: 0 });
    });

    it('enviar el mismo estado no cambia la posición', async () => {
      const col = await seedColumn(ctx.prisma, 'pendiente', 3, 'p');
      const res = await patch(col[1].id, {
        status: 'pendiente',
        title: 'z',
      }).expect(200);
      expect(res.body.position).toBe(1);
      expect(await columnTitles(ctx.prisma, 'pendiente')).toEqual([
        'p0',
        'z',
        'p2',
      ]);
    });

    it('no cambia updatedAt de las vecinas', async () => {
      const a = await seedTask(ctx.prisma, {
        title: 'a',
        position: 0,
        updatedAt: past,
      });
      const b = await seedTask(ctx.prisma, {
        title: 'b',
        position: 1,
        updatedAt: past,
      });
      const c = await seedTask(ctx.prisma, {
        title: 'c',
        status: 'hecho',
        position: 0,
        updatedAt: past,
      });
      await patch(a.id, { status: 'hecho' }).expect(200);
      for (const id of [b.id, c.id]) {
        const row = await ctx.prisma.task.findUniqueOrThrow({ where: { id } });
        expect(row.updatedAt.toISOString()).toBe(past.toISOString());
      }
    });

    it('title: null → 400', async () => {
      const t = await seedFull();
      const res = await patch(t.id, { title: null }).expect(400);
      expect(res.body.details.map((d: { field: string }) => d.field)).toContain(
        'title',
      );
    });

    it.each([
      ['título de 101', { title: 'a'.repeat(101) }],
      ['título en blanco', { title: '  ' }],
      ['descripción de 1001', { description: 'a'.repeat(1001) }],
      ['estado inválido', { status: 'otro' }],
      ['prioridad inválida', { priority: 'x' }],
      ['fecha inválida', { dueDate: '2026-02-31' }],
      [
        '11 etiquetas',
        { labels: Array.from({ length: 11 }, (_, i) => `t${i}`) },
      ],
      ['campo desconocido', { position: 1 }],
    ])('%s → 400', async (_n, body) => {
      const t = await seedFull();
      await patch(t.id, body).expect(400);
      const row = await ctx.prisma.task.findUniqueOrThrow({
        where: { id: t.id },
      });
      expect(row.title).toBe('orig');
    });

    it('tarea inexistente → 404 (CL-12)', async () => {
      const res = await patch('7b1e0a2e-5d1c-4a0e-9c3e-1d2f3a4b5c6d', {
        title: 'x',
      }).expect(404);
      expect(res.body.message).toBe('La tarea no existe');
    });

    it('id inválido → 400', async () => {
      await patch('abc', { title: 'x' }).expect(400);
    });
  });

  describe('PATCH /api/tasks/:id/move', () => {
    const move = (id: string, body: unknown) =>
      request(ctx.http)
        .patch(`/api/tasks/${id}/move`)
        .send(body as object);
    const past = new Date('2026-01-01T00:00:00.000Z');

    // Dentro de la misma columna: todas las combinaciones origen → destino.
    const pairs: [number, number][] = [];
    for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) pairs.push([a, b]);

    it.each(pairs)('misma columna: posición %i → %i', async (a, b) => {
      const col = await seedColumn(ctx.prisma, 'en_progreso', 5, 't');
      const expected = col.map((t) => t.title);
      const [moved] = expected.splice(a, 1);
      expected.splice(b, 0, moved);

      const res = await move(col[a].id, {
        status: 'en_progreso',
        position: b,
      }).expect(200);
      expect(res.body).toMatchObject({
        id: col[a].id,
        status: 'en_progreso',
        position: b,
      });
      expect(await columnTitles(ctx.prisma, 'en_progreso')).toEqual(expected);
      await expectPositionsContiguous(ctx.prisma);
    });

    // Entre columnas: origen de 5, destino de 3 (destino 0..3 = inicio, medio, final).
    const cross: [number, number][] = [];
    for (let a = 0; a < 5; a++) for (let b = 0; b <= 3; b++) cross.push([a, b]);

    it.each(cross)('entre columnas: origen %i → destino %i', async (a, b) => {
      const src = await seedColumn(ctx.prisma, 'pendiente', 5, 's');
      await seedColumn(ctx.prisma, 'en_revision', 3, 'd');
      const srcExpected = src.map((t) => t.title);
      const [moved] = srcExpected.splice(a, 1);
      const dstExpected = ['d0', 'd1', 'd2'];
      dstExpected.splice(b, 0, moved);

      const res = await move(src[a].id, {
        status: 'en_revision',
        position: b,
      }).expect(200);
      expect(res.body).toMatchObject({ status: 'en_revision', position: b });
      expect(await columnTitles(ctx.prisma, 'pendiente')).toEqual(srcExpected);
      expect(await columnTitles(ctx.prisma, 'en_revision')).toEqual(
        dstExpected,
      );
      await expectPositionsContiguous(ctx.prisma);
    });

    it('a una columna vacía', async () => {
      const col = await seedColumn(ctx.prisma, 'pendiente', 2, 's');
      const res = await move(col[0].id, {
        status: 'hecho',
        position: 0,
      }).expect(200);
      expect(res.body).toMatchObject({ status: 'hecho', position: 0 });
      expect(await columnTitles(ctx.prisma, 'pendiente')).toEqual(['s1']);
      await expectPositionsContiguous(ctx.prisma);
    });

    it('posición fuera de rango se acota al final (CL-14)', async () => {
      const col = await seedColumn(ctx.prisma, 'pendiente', 3, 's');
      await seedColumn(ctx.prisma, 'hecho', 2, 'h');
      let res = await move(col[0].id, {
        status: 'pendiente',
        position: 999,
      }).expect(200);
      expect(res.body.position).toBe(2);
      expect(await columnTitles(ctx.prisma, 'pendiente')).toEqual([
        's1',
        's2',
        's0',
      ]);
      res = await move(col[1].id, { status: 'hecho', position: 999 }).expect(
        200,
      );
      expect(res.body).toMatchObject({ status: 'hecho', position: 2 });
      expect(await columnTitles(ctx.prisma, 'hecho')).toEqual([
        'h0',
        'h1',
        's1',
      ]);
      await expectPositionsContiguous(ctx.prisma);
    });

    it('misma posición y estado: 200 sin tocar updatedAt', async () => {
      const t = await seedTask(ctx.prisma, {
        title: 'a',
        position: 0,
        updatedAt: past,
      });
      const res = await move(t.id, { status: 'pendiente', position: 0 }).expect(
        200,
      );
      expect(res.body.updatedAt).toBe(past.toISOString());
      const same = await move(t.id, {
        status: 'pendiente',
        position: 50,
      }).expect(200);
      expect(same.body.updatedAt).toBe(past.toISOString());
    });

    it('updatedAt cambia solo en la tarea movida', async () => {
      const a = await seedTask(ctx.prisma, {
        title: 'a',
        position: 0,
        updatedAt: past,
      });
      const b = await seedTask(ctx.prisma, {
        title: 'b',
        position: 1,
        updatedAt: past,
      });
      const c = await seedTask(ctx.prisma, {
        title: 'c',
        status: 'hecho',
        position: 0,
        updatedAt: past,
      });
      const res = await move(a.id, { status: 'hecho', position: 0 }).expect(
        200,
      );
      expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
        past.getTime(),
      );
      for (const id of [b.id, c.id]) {
        const row = await ctx.prisma.task.findUniqueOrThrow({ where: { id } });
        expect(row.updatedAt.toISOString()).toBe(past.toISOString());
      }
    });

    it('conserva el resto de los campos de la tarea', async () => {
      const t = await seedTask(ctx.prisma, {
        title: 'a',
        position: 0,
        labels: ['x'],
        description: 'd',
        dueDate: '2026-12-01',
      });
      const res = await move(t.id, { status: 'hecho', position: 0 }).expect(
        200,
      );
      expect(res.body).toMatchObject({
        title: 'a',
        labels: ['x'],
        description: 'd',
        dueDate: '2026-12-01',
      });
    });

    it.each([
      ['posición negativa', { status: 'hecho', position: -1 }],
      ['posición decimal', { status: 'hecho', position: 1.5 }],
      ['estado inválido', { status: 'otro', position: 0 }],
      ['sin estado', { position: 0 }],
      ['sin posición', { status: 'hecho' }],
      ['campo desconocido', { status: 'hecho', position: 0, title: 'x' }],
    ])('%s → 400', async (_n, body) => {
      const t = await seedTask(ctx.prisma, { title: 'a', position: 0 });
      await move(t.id, body).expect(400);
      const row = await ctx.prisma.task.findUniqueOrThrow({
        where: { id: t.id },
      });
      expect(row.status).toBe('pendiente');
    });

    it('tarea inexistente → 404 (CL-12)', async () => {
      const res = await move('7b1e0a2e-5d1c-4a0e-9c3e-1d2f3a4b5c6d', {
        status: 'hecho',
        position: 0,
      }).expect(404);
      expect(res.body.message).toBe('La tarea no existe');
    });

    it('id inválido → 400', async () => {
      await move('abc', { status: 'hecho', position: 0 }).expect(400);
    });

    it('atomicidad: un fallo a mitad de la transacción no deja estado parcial (RN-06)', async () => {
      const src = await seedColumn(ctx.prisma, 'pendiente', 3, 's');
      await seedColumn(ctx.prisma, 'hecho', 2, 'h');
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const original = ctx.prisma.$transaction.bind(ctx.prisma) as (
        fn: (tx: Record<string, unknown>) => Promise<unknown>,
      ) => Promise<unknown>;
      // Fuerza un error en el último paso (update de la tarea), después de los desplazamientos.
      jest.spyOn(ctx.prisma, '$transaction').mockImplementation(((
        fn: (tx: Record<string, unknown>) => Promise<unknown>,
      ) =>
        original((tx) =>
          fn(
            new Proxy(tx, {
              get(target, key) {
                if (key !== 'task') return Reflect.get(target, key) as unknown;
                const task = target.task as Record<string, unknown>;
                return new Proxy(task, {
                  get(t, k) {
                    if (k === 'update') {
                      return () => Promise.reject(new Error('fallo simulado'));
                    }
                    const v = Reflect.get(t, k) as unknown;
                    return typeof v === 'function' ? v.bind(t) : v;
                  },
                });
              },
            }),
          ),
        )) as never);

      const res = await move(src[0].id, { status: 'hecho', position: 1 });
      jest.restoreAllMocks();
      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toContain('fallo simulado');
      expect(await columnTitles(ctx.prisma, 'pendiente')).toEqual([
        's0',
        's1',
        's2',
      ]);
      expect(await columnTitles(ctx.prisma, 'hecho')).toEqual(['h0', 'h1']);
      await expectPositionsContiguous(ctx.prisma);
    });
  });
});
