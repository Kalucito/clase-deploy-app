import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  DESCRIPTION_MAX_LENGTH,
  LABEL_MAX_LENGTH,
  LABEL_MIN_LENGTH,
  MAX_LABELS_PER_TASK,
  TITLE_MAX_LENGTH,
} from '../../common/constants';
import { Priority, TaskStatus } from '../../generated/prisma/enums';
import { IsCalendarDate, Trim, TrimEach } from './validators';

const present = (_: unknown, value: unknown): boolean => value !== undefined;
const presentAndNotNull = (_: unknown, value: unknown): boolean =>
  value !== undefined && value !== null;

/**
 * Parche parcial. Los campos ausentes no se tocan; `description` y `dueDate`
 * aceptan `null` para vaciarse. `title`, `status`, `priority` y `labels` no
 * admiten `null`.
 */
export class UpdateTaskDto {
  @ValidateIf(present)
  @Trim()
  @IsString({ message: 'El título debe ser texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(TITLE_MAX_LENGTH, {
    message: `El título no puede superar los ${TITLE_MAX_LENGTH} caracteres`,
  })
  title?: string;

  @ValidateIf(presentAndNotNull)
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(DESCRIPTION_MAX_LENGTH, {
    message: `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres`,
  })
  description?: string | null;

  @ValidateIf(present)
  @IsEnum(TaskStatus, { message: 'El estado no es válido' })
  status?: TaskStatus;

  @ValidateIf(present)
  @IsEnum(Priority, { message: 'La prioridad no es válida' })
  priority?: Priority;

  @ValidateIf(presentAndNotNull)
  @IsCalendarDate()
  dueDate?: string | null;

  @ValidateIf(present)
  @IsArray({ message: 'Las etiquetas deben ser una lista' })
  @ArrayMaxSize(MAX_LABELS_PER_TASK, {
    message: `Una tarea no puede tener más de ${MAX_LABELS_PER_TASK} etiquetas`,
  })
  @TrimEach()
  @IsString({ each: true, message: 'Cada etiqueta debe ser texto' })
  @Length(LABEL_MIN_LENGTH, LABEL_MAX_LENGTH, {
    each: true,
    message: `Cada etiqueta debe tener entre ${LABEL_MIN_LENGTH} y ${LABEL_MAX_LENGTH} caracteres`,
  })
  labels?: string[];
}
