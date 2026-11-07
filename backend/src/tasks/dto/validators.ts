import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` que además sea una fecha de calendario real (rechaza 2026-02-31). */
export function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d
  );
}

export function IsCalendarDate(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isCalendarDate',
      target: target.constructor,
      propertyName: propertyKey as string,
      options: {
        message: 'La fecha de vencimiento no es válida (formato AAAA-MM-DD)',
        ...options,
      },
      validator: { validate: (value: unknown) => isCalendarDate(value) },
    });
  };
}

/** trim solo si es string (otros tipos los rechaza el validador correspondiente). */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/** trim a cada ítem de un array de strings. */
export const TrimEach = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((v: unknown) => (typeof v === 'string' ? v.trim() : v))
      : value,
  );
