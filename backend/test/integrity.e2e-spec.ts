import { Logger } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  expectPositionsContiguous,
  resetDb,
  seedColumn,
  STATUSES,
  TestContext,
} from './helpers/app';

/** PRNG determinista (mulberry32) para que las secuencias "aleatorias" sean reproducibles. */
function rng(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Integridad, concurrencia y errores (e2e)', () => {
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

  const api = () => request(ctx.http);

  it('invariante de posiciones tras una secuencia aleatoria de crear/mover/editar/borrar', async () => {
    const rand = rng(42);
    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
    const ids: string[] = [];

    for (let i = 0; i < 80; i++) {
      const op = rand();
      if (ids.length === 0 || op < 0.3) {
        const res = await api()
          .post('/api/tasks')
          .send({ title: `t${i}`, status: pick(STATUSES) })
          .expect(201);
        ids.push(res.body.id);
      } else if (op < 0.7) {
        await api()
          .patch(`/api/tasks/${pick(ids)}/move`)
          .send({ status: pick(STATUSES), position: Math.floor(rand() * 8) })
          .expect(200);
      } else if (op < 0.85) {
        await api()
          .patch(`/api/tasks/${pick(ids)}`)
          .send({ status: pick(STATUSES) })
          .expect(200);
      } else {
        const id = pick(ids);
        await api().delete(`/api/tasks/${id}`).expect(204);
        ids.splice(ids.indexOf(id), 1);
      }
      await expectPositionsContiguous(ctx.prisma);
    }
    expect(await ctx.prisma.task.count()).toBe(ids.length);
  });

  it('25+ operaciones concurrentes (create + move + edit) no dejan duplicados ni huecos (CL-13)', async () => {
    const a = await seedColumn(ctx.prisma, 'pendiente', 5, 'p');
    const b = await seedColumn(ctx.prisma, 'en_progreso', 5, 'e');
    const all = [...a, ...b];
    const rand = rng(7);

    const ops: Promise<request.Response>[] = [];
    for (let i = 0; i < 10; i++) {
      ops.push(
        api()
          .post('/api/tasks')
          .send({ title: `n${i}`, status: STATUSES[i % 3] }),
      );
    }
    for (let i = 0; i < 12; i++) {
      ops.push(
        api()
          .patch(`/api/tasks/${all[i % all.length].id}/move`)
          .send({
            status: STATUSES[Math.floor(rand() * 4)],
            position: Math.floor(rand() * 6),
          }),
      );
    }
    for (let i = 0; i < 4; i++) {
      ops.push(
        api()
          .patch(`/api/tasks/${all[i].id}`)
          .send({ status: STATUSES[(i + 1) % 4] }),
      );
    }
    const results = await Promise.all(ops);
    expect(results.length).toBeGreaterThanOrEqual(20);
    expect(results.every((r) => r.status === 201 || r.status === 200)).toBe(
      true,
    );
    expect(await ctx.prisma.task.count()).toBe(10 + 10);
    await expectPositionsContiguous(ctx.prisma);
  });

  it('creaciones concurrentes en la misma columna: todas con posiciones únicas', async () => {
    await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        api()
          .post('/api/tasks')
          .send({ title: `c${i}` })
          .expect(201),
      ),
    );
    const rows = await ctx.prisma.task.findMany({ select: { position: true } });
    expect(rows.map((r) => r.position).sort((x, y) => x - y)).toEqual(
      Array.from({ length: 15 }, (_, i) => i),
    );
  });

  it('borrados y movimientos concurrentes mantienen el invariante', async () => {
    const col = await seedColumn(ctx.prisma, 'pendiente', 10, 'p');
    const results = await Promise.all([
      ...col.slice(0, 4).map((t) => api().delete(`/api/tasks/${t.id}`)),
      ...col
        .slice(4)
        .map((t, i) =>
          api()
            .patch(`/api/tasks/${t.id}/move`)
            .send({ status: 'hecho', position: i }),
        ),
    ]);
    expect(results.every((r) => [200, 204].includes(r.status))).toBe(true);
    await expectPositionsContiguous(ctx.prisma);
  });

  it('todas las respuestas de error cumplen el formato unificado', async () => {
    const t = await seedColumn(ctx.prisma, 'pendiente', 1);
    const id = t[0].id;
    const ghost = '7b1e0a2e-5d1c-4a0e-9c3e-1d2f3a4b5c6d';
    const responses = await Promise.all([
      api().post('/api/tasks').send({ title: '' }),
      api().post('/api/tasks').send({ title: 'x', foo: 1 }),
      api()
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('{"x":'),
      api().get('/api/tasks/abc'),
      api().get(`/api/tasks/${ghost}`),
      api().patch(`/api/tasks/${ghost}`).send({ title: 'x' }),
      api().patch(`/api/tasks/${id}`).send({ title: null }),
      api().patch(`/api/tasks/${id}/move`).send({ status: 'x', position: -1 }),
      api()
        .patch(`/api/tasks/${ghost}/move`)
        .send({ status: 'hecho', position: 0 }),
      api().delete(`/api/tasks/${ghost}`),
      api().get('/api/no-existe'),
    ]);
    for (const res of responses) {
      expect([400, 404]).toContain(res.status);
      expect(res.body).toEqual(
        expect.objectContaining({
          statusCode: res.status,
          error: expect.any(String),
          message: expect.any(String),
        }),
      );
      expect(
        Object.keys(res.body).every((k) =>
          ['statusCode', 'error', 'message', 'details'].includes(k),
        ),
      ).toBe(true);
      // Sin detalles técnicos ni mensajes en inglés de Nest/Prisma.
      expect(res.body.message).not.toMatch(
        /prisma|Cannot |Validation failed|Unexpected|stack/i,
      );
    }
  });

  it('base caída → 503 con el formato unificado en los endpoints de tareas', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(ctx.prisma.task, 'findMany').mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
        code: 'ECONNREFUSED',
      }),
    );
    const res = await api().get('/api/tasks').expect(503);
    jest.restoreAllMocks();
    expect(res.body).toEqual({
      statusCode: 503,
      error: 'Service Unavailable',
      message:
        'El servicio no está disponible. Intentá nuevamente en unos instantes.',
    });
  });

  it('un error inesperado → 500 genérico sin filtrar texto interno', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest
      .spyOn(ctx.prisma.task, 'findMany')
      .mockRejectedValue(new Error('detalle secreto de SQL'));
    const res = await api().get('/api/tasks').expect(500);
    jest.restoreAllMocks();
    expect(res.body.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secreto');
  });

  it('CORS: orígenes permitido y no permitido en una petición real', async () => {
    const ok = await api()
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    const no = await api()
      .get('/api/health')
      .set('Origin', 'http://evil.example');
    expect(no.headers['access-control-allow-origin']).toBeUndefined();
  });
});
