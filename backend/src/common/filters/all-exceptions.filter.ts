import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { AppException } from '../errors';

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: ErrorDetail[];
}

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  413: 'Payload Too Large',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

const DEFAULT_MESSAGE: Record<number, string> = {
  400: 'La solicitud no es válida',
  404: 'El recurso no existe',
  405: 'Método no permitido',
  409: 'La operación entra en conflicto con el estado actual',
  413: 'El contenido enviado es demasiado grande',
  500: 'Ocurrió un error inesperado. Intentá nuevamente.',
  503: 'El servicio no está disponible. Intentá nuevamente en unos instantes.',
};

const CONNECTION_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
const CONNECTION_NODE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

function isConnectionError(exception: unknown): boolean {
  if (exception instanceof Prisma.PrismaClientInitializationError) return true;
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_CODES.has(exception.code);
  }
  // Errores del driver (pg) que no llegan envueltos por Prisma.
  let current: unknown = exception;
  for (let i = 0; i < 5 && current instanceof Error; i++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && CONNECTION_NODE_CODES.has(code)) {
      return true;
    }
    if (
      /ECONNREFUSED|Can't reach database|terminating connection/i.test(
        current.message,
      )
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);

    if (body.statusCode >= 500) {
      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${body.statusCode} ${body.message}`, stack);
    }

    res.status(body.statusCode).json(body);
  }

  toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return this.build(404, 'La tarea no existe');
      }
      if (exception.code === 'P2002') {
        return this.build(409);
      }
    }

    if (isConnectionError(exception)) {
      return this.build(503);
    }

    // Errores de parseo del body (JSON mal formado, body demasiado grande).
    const err = exception as { status?: unknown; type?: unknown } | null;
    if (
      err &&
      typeof err.status === 'number' &&
      err.status >= 400 &&
      err.status < 500 &&
      typeof err.type === 'string'
    ) {
      return this.build(
        err.status,
        err.status === 400
          ? 'El cuerpo de la solicitud no es un JSON válido'
          : undefined,
      );
    }

    return this.build(HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private fromHttpException(exception: HttpException): ErrorBody {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const payload =
      typeof response === 'object' && response !== null
        ? (response as { message?: unknown; details?: unknown })
        : {};

    if (Array.isArray(payload.details)) {
      return this.build(
        status,
        typeof payload.message === 'string' ? payload.message : undefined,
        payload.details as ErrorDetail[],
      );
    }

    // Los mensajes por defecto de Nest ("Cannot GET /x", "Not Found") están en
    // inglés: solo se conservan los mensajes que definimos nosotros en español.
    const own =
      exception instanceof AppException ? exception.message : undefined;
    return this.build(status, own);
  }

  private build(
    statusCode: number,
    message?: string,
    details?: ErrorDetail[],
  ): ErrorBody {
    const body: ErrorBody = {
      statusCode,
      error: STATUS_TEXT[statusCode] ?? 'Error',
      message:
        message ??
        DEFAULT_MESSAGE[statusCode] ??
        DEFAULT_MESSAGE[statusCode >= 500 ? 500 : 400],
    };
    if (details && details.length > 0) body.details = details;
    return body;
  }
}
