import { HttpException, ParseUUIDPipe, ValidationError } from '@nestjs/common';
import type { ErrorDetail } from './filters/all-exceptions.filter';

/** Excepción con mensaje propio, ya redactado en español para el usuario final. */
export class AppException extends HttpException {
  constructor(status: number, message: string) {
    super(message, status);
  }
}

export class TaskNotFoundException extends AppException {
  constructor() {
    super(404, 'La tarea no existe');
  }
}

export class ValidationFailedException extends HttpException {
  constructor(details: ErrorDetail[]) {
    super({ message: 'Los datos enviados no son válidos', details }, 400);
  }
}

/** `:id` debe ser un UUID; si no, 400 con mensaje en español. */
export function uuidPipe(): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: () =>
      new AppException(400, 'El identificador no es válido'),
  });
}

/** Aplana los errores (incluso anidados) de class-validator a `{field, message}`. */
export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): ErrorDetail[] {
  const details: ErrorDetail[] = [];
  for (const error of errors) {
    const field = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        details.push({ field: parent ? parent : field, message });
      }
    }
    if (error.children?.length) {
      details.push(...flattenValidationErrors(error.children, field));
    }
  }
  // Sin duplicados exactos (ej. varios ítems inválidos de `labels`).
  const seen = new Set<string>();
  return details.filter((d) => {
    const key = `${d.field}|${d.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
