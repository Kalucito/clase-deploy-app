import { normalizeLabels } from './labels.util';

describe('normalizeLabels', () => {
  it('deduplica sin distinguir mayúsculas y conserva la primera forma', () => {
    expect(normalizeLabels(['Bug', 'bug', ' BUG '])).toEqual([
      { name: 'Bug', normalizedName: 'bug' },
    ]);
  });

  it('hace trim de cada etiqueta', () => {
    expect(normalizeLabels(['  demo  '])).toEqual([
      { name: 'demo', normalizedName: 'demo' },
    ]);
  });

  it('descarta etiquetas vacías o solo con espacios', () => {
    expect(normalizeLabels(['', '   ', 'ok'])).toEqual([
      { name: 'ok', normalizedName: 'ok' },
    ]);
  });

  it('mantiene el orden de entrada', () => {
    expect(normalizeLabels(['b', 'a', 'c']).map((l) => l.name)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('soporta acentos y emojis; acentos distintos no se unifican', () => {
    const r = normalizeLabels(['Café', 'cafe', '🔥 Urgente', '🔥 URGENTE']);
    expect(r.map((l) => l.name)).toEqual(['Café', 'cafe', '🔥 Urgente']);
    expect(r[0].normalizedName).toBe('café');
  });

  it('lista vacía → lista vacía', () => {
    expect(normalizeLabels([])).toEqual([]);
  });

  it('la forma normalizada nunca supera 20 caracteres', () => {
    const r = normalizeLabels(['İ'.repeat(20)]);
    expect(r[0].normalizedName.length).toBeLessThanOrEqual(20);
  });
});
