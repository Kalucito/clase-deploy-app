import { Controller, Get, Logger } from '@nestjs/common';
import { AppException } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error(
        'La base de datos no responde',
        error instanceof Error ? error.stack : String(error),
      );
      throw new AppException(
        503,
        'El servicio no está disponible. Intentá nuevamente en unos instantes.',
      );
    }
    return { status: 'ok' };
  }
}
