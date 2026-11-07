import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
};

describe('validateEnv', () => {
  it('acepta una configuración válida y aplica defaults', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('development');
  });

  it('convierte PORT a número', () => {
    expect(validateEnv({ ...base, PORT: '8080' }).PORT).toBe(8080);
  });

  it('falla si falta DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('falla si PORT no es numérico', () => {
    expect(() => validateEnv({ ...base, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('falla en producción sin CORS_ORIGIN', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /CORS_ORIGIN/,
    );
  });

  it('acepta producción con CORS_ORIGIN', () => {
    expect(
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://app.example.com',
      }).CORS_ORIGIN,
    ).toBe('https://app.example.com');
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });
});
