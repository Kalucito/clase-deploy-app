import 'dotenv/config';

// Los e2e usan SIEMPRE una base de test separada (nunca la de desarrollo).
const explicit = process.env.TEST_DATABASE_URL;
const dev = process.env.DATABASE_URL ?? '';
process.env.DATABASE_URL =
  explicit ?? dev.replace(/\/taskflow(\?|$)/, '/taskflow_test$1');
if (!/taskflow_test/.test(process.env.DATABASE_URL)) {
  throw new Error('Los tests e2e deben usar la base taskflow_test');
}
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
