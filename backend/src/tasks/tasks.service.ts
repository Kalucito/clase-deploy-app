import { Injectable } from '@nestjs/common';
import { TaskNotFoundException } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { serializeTask, TaskResponse } from './task.serializer';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

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
}
