import {
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  AppException,
  flattenValidationErrors,
  TaskNotFoundException,
  ValidationFailedException,
} from '../errors';
import { AllExceptionsFilter } from './all-exceptions.filter';

function prismaError(code: string, message = 'Texto interno de Prisma'): Error {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: 'test',
  });
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('validación → 400 con details por campo', () => {
    const body = filter.toBody(
      new ValidationFailedException([
        { field: 'title', message: 'El título es obligatorio' },
      ]),
    );
    expect(body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Los datos enviados no son válidos',
      details: [{ field: 'title', message: 'El título es obligatorio' }],
    });
  });

  it('UUID inválido (AppException 400) conserva su mensaje', () => {
    const body = filter.toBody(
      new AppException(400, 'El identificador no es válido'),
    );
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('El identificador no es válido');
  });

  it('TaskNotFoundException → 404 "La tarea no existe"', () => {
    expect(filter.toBody(new TaskNotFoundException())).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'La tarea no existe',
    });
  });

  it('Prisma P2025 → 404 "La tarea no existe"', () => {
    const body = filter.toBody(prismaError('P2025'));
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('La tarea no existe');
  });

  it('Prisma P2002 → 409', () => {
    expect(filter.toBody(prismaError('P2002')).statusCode).toBe(409);
  });

  it.each(['P1001', 'P1002'])('Prisma %s → 503', (code) => {
    const body = filter.toBody(prismaError(code));
    expect(body.statusCode).toBe(503);
    expect(body.message).not.toContain('Prisma');
  });

  it('error de conexión del driver (ECONNREFUSED) → 503', () => {
    const err = Object.assign(
      new Error('connect ECONNREFUSED 127.0.0.1:5432'),
      {
        code: 'ECONNREFUSED',
      },
    );
    expect(filter.toBody(err).statusCode).toBe(503);
  });

  it('ruta inexistente de Nest se traduce a español', () => {
    const body = filter.toBody(new NotFoundException('Cannot GET /x'));
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('El recurso no existe');
  });

  it('HttpException genérica no filtra su texto en inglés', () => {
    const body = filter.toBody(new BadRequestException('Unexpected token }'));
    expect(body.message).toBe('La solicitud no es válida');
    expect(new HttpException('x', 405)).toBeDefined();
  });

  it('JSON mal formado → 400 en español', () => {
    const err = Object.assign(new SyntaxError('Unexpected token'), {
      status: 400,
      type: 'entity.parse.failed',
    });
    const body = filter.toBody(err);
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('El cuerpo de la solicitud no es un JSON válido');
  });

  it('error genérico → 500 sin exponer el mensaje original', () => {
    const body = filter.toBody(new Error('SELECT * FROM secreto falló'));
    expect(body.statusCode).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secreto');
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('error de Prisma desconocido → 500 sin texto de Prisma', () => {
    const body = filter.toBody(
      prismaError('P9999', 'Detalle interno de Prisma'),
    );
    expect(body.statusCode).toBe(500);
    expect(JSON.stringify(body)).not.toContain('Detalle interno');
  });

  it('loguea los 5xx con stack y no los 4xx', () => {
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ json }) }),
      }),
    } as never;

    filter.catch(new Error('boom'), host);
    expect(logger).toHaveBeenCalledTimes(1);
    expect(String(logger.mock.calls[0][1])).toContain('boom');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );

    logger.mockClear();
    filter.catch(new TaskNotFoundException(), host);
    expect(logger).not.toHaveBeenCalled();
    logger.mockRestore();
  });
});

describe('flattenValidationErrors', () => {
  it('aplana errores anidados y elimina duplicados', () => {
    const details = flattenValidationErrors([
      {
        property: 'title',
        constraints: { isNotEmpty: 'El título es obligatorio' },
      },
      {
        property: 'labels',
        children: [
          { property: '0', constraints: { length: 'Etiqueta inválida' } },
          { property: '1', constraints: { length: 'Etiqueta inválida' } },
        ],
      },
    ]);
    expect(details).toEqual([
      { field: 'title', message: 'El título es obligatorio' },
      { field: 'labels', message: 'Etiqueta inválida' },
    ]);
  });
});
