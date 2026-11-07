import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TaskStatus } from '../../src/generated/prisma/enums';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  http: App;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return {
    app,
    prisma: app.get(PrismaService),
    http: app.getHttpServer() as App,
  };
}

export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
}

export const STATUSES: TaskStatus[] = [
  'pendiente',
  'en_progreso',
  'en_revision',
  'hecho',
];

interface SeedTask {
  title: string;
  status?: TaskStatus;
  position: number;
  labels?: string[];
  dueDate?: string;
  description?: string;
  updatedAt?: Date;
}

/** Siembra una tarea directamente con Prisma (sin pasar por la API). */
export async function seedTask(prisma: PrismaService, t: SeedTask) {
  return prisma.task.create({
    data: {
      title: t.title,
      status: t.status ?? 'pendiente',
      position: t.position,
      description: t.description,
      dueDate: t.dueDate ? new Date(`${t.dueDate}T00:00:00.000Z`) : undefined,
      updatedAt: t.updatedAt,
      labels: {
        connectOrCreate: (t.labels ?? []).map((name) => ({
          where: { normalizedName: name.toLowerCase() },
          create: { name, normalizedName: name.toLowerCase() },
        })),
      },
    },
  });
}

/** Siembra `n` tareas en una columna con títulos `${prefix}0..n-1` en orden. */
export async function seedColumn(
  prisma: PrismaService,
  status: TaskStatus,
  n: number,
  prefix = status,
) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(
      await seedTask(prisma, { title: `${prefix}${i}`, status, position: i }),
    );
  }
  return out;
}

/** Invariante RN-03: en cada columna las posiciones son exactamente 0..n-1. */
export async function expectPositionsContiguous(
  prisma: PrismaService,
): Promise<void> {
  for (const status of STATUSES) {
    const rows = await prisma.task.findMany({
      where: { status },
      orderBy: { position: 'asc' },
      select: { position: true },
    });
    expect({ status, positions: rows.map((r) => r.position) }).toEqual({
      status,
      positions: rows.map((_, i) => i),
    });
  }
}

/** Títulos de una columna en orden de posición. */
export async function columnTitles(
  prisma: PrismaService,
  status: TaskStatus,
): Promise<string[]> {
  const rows = await prisma.task.findMany({
    where: { status },
    orderBy: { position: 'asc' },
    select: { title: true },
  });
  return rows.map((r) => r.title);
}
