import { Injectable } from '@nestjs/common';
import { BOARD_LOCK_KEY } from '../common/constants';
import { TaskNotFoundException } from '../common/errors';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { normalizeLabels } from './labels.util';
import { serializeTask, TaskResponse } from './task.serializer';

type Tx = Prisma.TransactionClient;

/** `YYYY-MM-DD` → medianoche UTC (columna `DATE`, sin zonas horarias). */
function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Etiquetas a conectar, creando las que no existan (identidad = normalizedName). */
function labelsConnectOrCreate(
  labels: readonly string[],
): Prisma.LabelCreateOrConnectWithoutTasksInput[] {
  return normalizeLabels(labels).map(({ name, normalizedName }) => ({
    where: { normalizedName },
    create: { name, normalizedName },
  }));
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transacción de escritura serializada: el advisory lock global evita
   * posiciones duplicadas o con huecos con escrituras concurrentes (CL-13).
   * Se libera solo al terminar la transacción.
   */
  private async withBoardLock<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOARD_LOCK_KEY})`;
      return fn(tx);
    });
  }

  /** Orden fijo del tablero: el enum de Postgres ordena por definición de columnas. */
  async findAll(): Promise<TaskResponse[]> {
    const rows = await this.prisma.task.findMany({
      include: { labels: true },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });
    return rows.map(serializeTask);
  }

  async findOne(id: string): Promise<TaskResponse> {
    const row = await this.prisma.task.findUnique({
      where: { id },
      include: { labels: true },
    });
    if (!row) throw new TaskNotFoundException();
    return serializeTask(row);
  }

  /** RN-04: la tarea nueva queda al principio de su columna (posición 0). */
  async create(dto: CreateTaskDto): Promise<TaskResponse> {
    const status = dto.status ?? 'pendiente';
    const now = new Date();
    const row = await this.withBoardLock(async (tx) => {
      await tx.task.updateMany({
        where: { status },
        data: { position: { increment: 1 } },
      });
      return tx.task.create({
        data: {
          title: dto.title,
          description: dto.description ? dto.description : null,
          status,
          priority: dto.priority ?? 'media',
          dueDate: dto.dueDate ? toDate(dto.dueDate) : null,
          position: 0,
          createdAt: now,
          updatedAt: now,
          labels: { connectOrCreate: labelsConnectOrCreate(dto.labels ?? []) },
        },
        include: { labels: true },
      });
    });
    return serializeTask(row);
  }

  /** RN-03: borra y compacta las posiciones de la columna. */
  async remove(id: string): Promise<void> {
    await this.withBoardLock(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id },
        select: { status: true, position: true },
      });
      if (!task) throw new TaskNotFoundException();
      await tx.task.delete({ where: { id } });
      await tx.task.updateMany({
        where: { status: task.status, position: { gt: task.position } },
        data: { position: { decrement: 1 } },
      });
    });
  }
}
