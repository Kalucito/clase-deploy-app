import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
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

export class CreateTaskDto {
  @Trim()
  @IsString({ message: 'El título debe ser texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(TITLE_MAX_LENGTH, {
    message: `El título no puede superar los ${TITLE_MAX_LENGTH} caracteres`,
  })
  title!: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(DESCRIPTION_MAX_LENGTH, {
    message: `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres`,
  })
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus, { message: 'El estado no es válido' })
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Priority, { message: 'La prioridad no es válida' })
  priority?: Priority;

  @IsOptional()
  @IsCalendarDate()
  dueDate?: string | null;

  @IsOptional()
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
