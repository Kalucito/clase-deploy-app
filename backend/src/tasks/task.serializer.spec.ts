import { serializeTask, TaskRow } from './task.serializer';

const base: TaskRow = {
  id: '7b1e0a2e-5d1c-4a0e-9c3e-1d2f3a4b5c6d',
  title: 'Preparar demo',
  description: 'Texto',
  status: 'pendiente',
  priority: 'media',
  dueDate: new Date('2026-11-20T00:00:00.000Z'),
  position: 0,
  createdAt: new Date('2026-11-07T14:03:11.120Z'),
  updatedAt: new Date('2026-11-07T14:03:11.120Z'),
  labels: [{ name: 'frontend' }, { name: 'Demo' }],
};

describe('serializeTask', () => {
  it('produce la forma pública del recurso', () => {
    expect(serializeTask(base)).toEqual({
      id: base.id,
      title: 'Preparar demo',
      description: 'Texto',
      status: 'pendiente',
      priority: 'media',
      dueDate: '2026-11-20',
      labels: ['Demo', 'frontend'],
      position: 0,
      createdAt: '2026-11-07T14:03:11.120Z',
      updatedAt: '2026-11-07T14:03:11.120Z',
    });
  });

  it('dueDate nula → null', () => {
    expect(serializeTask({ ...base, dueDate: null }).dueDate).toBeNull();
  });

  it('description vacía o nula → null', () => {
    expect(serializeTask({ ...base, description: '' }).description).toBeNull();
    expect(
      serializeTask({ ...base, description: null }).description,
    ).toBeNull();
  });

  it('no hay desfase de zona horaria en dueDate', () => {
    const tz = process.env.TZ;
    process.env.TZ = 'America/Argentina/Buenos_Aires';
    expect(
      serializeTask({ ...base, dueDate: new Date('2026-01-01T00:00:00.000Z') })
        .dueDate,
    ).toBe('2026-01-01');
    process.env.TZ = tz;
  });

  it('sin etiquetas → []', () => {
    expect(serializeTask({ ...base, labels: [] }).labels).toEqual([]);
  });
});
