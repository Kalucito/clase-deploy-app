import { execSync } from 'node:child_process';
import './setup-env';

/** Aplica las migraciones sobre la base de test antes de correr los e2e. */
export default function globalSetup(): void {
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env },
  });
}
