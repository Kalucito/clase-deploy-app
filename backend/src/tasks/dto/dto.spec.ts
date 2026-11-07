import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';
import { MoveTaskDto } from './move-task.dto';
import { UpdateTaskDto } from './update-task.dto';

type Ctor<T> = new () => T;

async function check<T extends object>(
  cls: Ctor<T>,
  body: unknown,
): Promise<{ fields: string[]; instance: T }> {
  const instance = plainToInstance(cls, body);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { fields: errors.map((e) => e.property).sort(), instance };
}

const ok = async <T extends object>(cls: Ctor<T>, body: unknown) =>
  expect((await check(cls, body)).fields).toEqual([]);
const bad = async <T extends object>(
  cls: Ctor<T>,
  body: unknown,
  field: string,
) => expect((await check(cls, body)).fields).toContain(field);

describe('CreateTaskDto', () => {
  it('acepta solo con título', () => ok(CreateTaskDto, { title: 'x' }));

  it('título de 1, 99 y 100 caracteres es válido (CL-01)', async () => {
    for (const n of [1, 99, 100]) {
      await ok(CreateTaskDto, { title: 'a'.repeat(n) });
    }
  });
  it('título de 101 caracteres es inválido (CL-02)', () =>
    bad(CreateTaskDto, { title: 'a'.repeat(101) }, 'title'));
  it('título solo con espacios es inválido (CL-03)', () =>
    bad(CreateTaskDto, { title: '    ' }, 'title'));
  it('título vacío o ausente es inválido', async () => {
    await bad(CreateTaskDto, { title: '' }, 'title');
    await bad(CreateTaskDto, {}, 'title');
  });
  it('el título se recorta (trim) antes de validar el largo', async () => {
    const { fields, instance } = await check(CreateTaskDto, {
      title: `  ${'a'.repeat(100)}  `,
    });
    expect(fields).toEqual([]);
    expect(instance.title).toHaveLength(100);
  });
  it('título no string es inválido', () =>
    bad(CreateTaskDto, { title: 123 }, 'title'));

  it('descripción de 1000 es válida y de 1001 no (CL-01/02)', async () => {
    await ok(CreateTaskDto, { title: 'x', description: 'a'.repeat(1000) });
    await bad(
      CreateTaskDto,
      { title: 'x', description: 'a'.repeat(1001) },
      'description',
    );
  });
  it('descripción vacía es válida', () =>
    ok(CreateTaskDto, { title: 'x', description: '' }));

  it('estado y prioridad inválidos se rechazan (CL-15)', async () => {
    await bad(CreateTaskDto, { title: 'x', status: 'otro' }, 'status');
    await bad(CreateTaskDto, { title: 'x', priority: 'urgente' }, 'priority');
  });
  it('estados y prioridades válidos', async () => {
    for (const status of ['pendiente', 'en_progreso', 'en_revision', 'hecho']) {
      await ok(CreateTaskDto, { title: 'x', status });
    }
    for (const priority of ['baja', 'media', 'alta']) {
      await ok(CreateTaskDto, { title: 'x', priority });
    }
  });

  it('fechas válidas e inválidas (CL-16)', async () => {
    await ok(CreateTaskDto, { title: 'x', dueDate: '2026-11-20' });
    await ok(CreateTaskDto, { title: 'x', dueDate: '2028-02-29' });
    for (const dueDate of [
      '2026-02-31',
      '2027-02-29',
      '20-11-2026',
      '2026-13-01',
      '2026-11-20T00:00:00Z',
      'mañana',
      20261120,
    ]) {
      await bad(CreateTaskDto, { title: 'x', dueDate }, 'dueDate');
    }
  });

  it('etiquetas: 10 válidas, 11 inválidas (CL-06)', async () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`);
    await ok(CreateTaskDto, { title: 'x', labels: mk(10) });
    await bad(CreateTaskDto, { title: 'x', labels: mk(11) }, 'labels');
  });
  it('etiquetas: 20 caracteres válidas, 21 inválidas (CL-06)', async () => {
    await ok(CreateTaskDto, { title: 'x', labels: ['a'.repeat(20)] });
    await bad(
      CreateTaskDto,
      { title: 'x', labels: ['a'.repeat(21)] },
      'labels',
    );
  });
  it('etiquetas vacías, con espacios o no string son inválidas', async () => {
    await bad(CreateTaskDto, { title: 'x', labels: [''] }, 'labels');
    await bad(CreateTaskDto, { title: 'x', labels: ['   '] }, 'labels');
    await bad(CreateTaskDto, { title: 'x', labels: [1] }, 'labels');
    await bad(CreateTaskDto, { title: 'x', labels: 'bug' }, 'labels');
  });

  it('rechaza campos desconocidos', () =>
    bad(CreateTaskDto, { title: 'x', id: 'abc' }, 'id'));
  it('rechaza `position` (no se fija al crear)', () =>
    bad(CreateTaskDto, { title: 'x', position: 3 }, 'position'));
});

describe('UpdateTaskDto', () => {
  it('parche vacío es válido', () => ok(UpdateTaskDto, {}));

  it('null solo se acepta en description y dueDate', async () => {
    await ok(UpdateTaskDto, { description: null });
    await ok(UpdateTaskDto, { dueDate: null });
    await bad(UpdateTaskDto, { title: null }, 'title');
    await bad(UpdateTaskDto, { status: null }, 'status');
    await bad(UpdateTaskDto, { priority: null }, 'priority');
    await bad(UpdateTaskDto, { labels: null }, 'labels');
  });

  it('mismas reglas que la creación', async () => {
    await bad(UpdateTaskDto, { title: 'a'.repeat(101) }, 'title');
    await bad(UpdateTaskDto, { title: '  ' }, 'title');
    await bad(UpdateTaskDto, { description: 'a'.repeat(1001) }, 'description');
    await bad(UpdateTaskDto, { dueDate: '2026-02-31' }, 'dueDate');
    await bad(UpdateTaskDto, { status: 'otro' }, 'status');
    await bad(UpdateTaskDto, { labels: ['a'.repeat(21)] }, 'labels');
    await ok(UpdateTaskDto, {
      title: 'Nuevo',
      description: 'd',
      status: 'hecho',
      priority: 'alta',
      dueDate: '2026-12-01',
      labels: ['a'],
    });
  });

  it('acepta labels vacío (quitar todas)', () =>
    ok(UpdateTaskDto, { labels: [] }));

  it('rechaza campos desconocidos y `position`', async () => {
    await bad(UpdateTaskDto, { foo: 1 }, 'foo');
    await bad(UpdateTaskDto, { position: 1 }, 'position');
  });
});

describe('MoveTaskDto', () => {
  it('acepta estado válido y posición entera ≥ 0', async () => {
    await ok(MoveTaskDto, { status: 'hecho', position: 0 });
    await ok(MoveTaskDto, { status: 'pendiente', position: 999 });
  });
  it('rechaza posición negativa, decimal o no numérica', async () => {
    await bad(MoveTaskDto, { status: 'hecho', position: -1 }, 'position');
    await bad(MoveTaskDto, { status: 'hecho', position: 1.5 }, 'position');
    await bad(MoveTaskDto, { status: 'hecho', position: '2' }, 'position');
  });
  it('rechaza estado inválido o ausente y posición ausente', async () => {
    await bad(MoveTaskDto, { status: 'otro', position: 0 }, 'status');
    await bad(MoveTaskDto, { position: 0 }, 'status');
    await bad(MoveTaskDto, { status: 'hecho' }, 'position');
  });
  it('rechaza campos desconocidos', () =>
    bad(MoveTaskDto, { status: 'hecho', position: 0, title: 'x' }, 'title'));
});
