import request from 'supertest';
import { createTestApp, resetDb, TestContext } from './helpers/app';

describe('Labels (e2e)', () => {
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

  const create = (body: object) =>
    request(ctx.http).post('/api/tasks').send(body).expect(201);
  const labels = async () =>
    (await request(ctx.http).get('/api/labels').expect(200)).body as string[];

  it('base vacía → []', async () => {
    expect(await labels()).toEqual([]);
  });

  it('"Bug" y "bug" aparecen como una sola', async () => {
    await create({ title: 'a', labels: ['Bug'] });
    await create({ title: 'b', labels: ['bug', 'BUG'] });
    expect(await labels()).toEqual(['Bug']);
  });

  it('ordena alfabéticamente sin distinguir mayúsculas', async () => {
    await create({ title: 'a', labels: ['zeta', 'Beta', 'alfa', 'Gamma'] });
    expect(await labels()).toEqual(['alfa', 'Beta', 'Gamma', 'zeta']);
  });

  it('una etiqueta cuya última tarea se elimina deja de aparecer', async () => {
    const a = await create({ title: 'a', labels: ['x', 'y'] });
    await create({ title: 'b', labels: ['y'] });
    await request(ctx.http).delete(`/api/tasks/${a.body.id}`).expect(204);
    expect(await labels()).toEqual(['y']);
  });

  it('una etiqueta quitada al editar deja de aparecer; una compartida se mantiene', async () => {
    const a = await create({ title: 'a', labels: ['x', 'y'] });
    await create({ title: 'b', labels: ['y'] });
    await request(ctx.http)
      .patch(`/api/tasks/${a.body.id}`)
      .send({ labels: ['z'] })
      .expect(200);
    expect(await labels()).toEqual(['y', 'z']);
    await request(ctx.http)
      .patch(`/api/tasks/${a.body.id}`)
      .send({ labels: [] })
      .expect(200);
    expect(await labels()).toEqual(['y']);
  });

  it('no existen endpoints de escritura de etiquetas', async () => {
    await request(ctx.http).post('/api/labels').send({ name: 'x' }).expect(404);
    await request(ctx.http).patch('/api/labels/x').send({}).expect(404);
    await request(ctx.http).delete('/api/labels/x').expect(404);
  });
});
