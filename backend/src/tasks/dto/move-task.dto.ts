import { IsEnum, IsInt, Min } from 'class-validator';
import { TaskStatus } from '../../generated/prisma/enums';

export class MoveTaskDto {
  @IsEnum(TaskStatus, { message: 'El estado no es válido' })
  status!: TaskStatus;

  /** Índice final de la tarea en la columna destino (0 = primera). */
  @IsInt({ message: 'La posición debe ser un número entero' })
  @Min(0, { message: 'La posición no puede ser negativa' })
  position!: number;
}
