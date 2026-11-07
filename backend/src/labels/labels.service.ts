import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Etiquetas con al menos una tarea (CA-08.8), ordenadas alfabéticamente. */
  async findInUse(): Promise<string[]> {
    const rows = await this.prisma.label.findMany({
      where: { tasks: { some: {} } },
      select: { name: true },
    });
    return rows
      .map((r) => r.name)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }
}
