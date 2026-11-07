import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL es obligatoria' })
  DATABASE_URL!: string;

  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? 3001 : Number(value),
  )
  @IsInt({ message: 'PORT debe ser un número entero' })
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @IsOptional()
  @IsIn(['development', 'production', 'test'], {
    message: 'NODE_ENV debe ser development, production o test',
  })
  NODE_ENV: string = 'development';

  // Lista de orígenes separados por coma. Obligatoria en producción.
  @ValidateIf((env: EnvironmentVariables) => env.NODE_ENV === 'production')
  @IsString()
  @IsNotEmpty({ message: 'CORS_ORIGIN es obligatoria en producción' })
  CORS_ORIGIN?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join('; ');
    throw new Error(`Configuración de entorno inválida: ${details}`);
  }
  return validated;
}
