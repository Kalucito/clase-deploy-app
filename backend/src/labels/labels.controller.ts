import { Controller, Get } from '@nestjs/common';
import { LabelsService } from './labels.service';

/** Solo lectura: las etiquetas se crean y quitan a través de las tareas. */
@Controller('labels')
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Get()
  findAll(): Promise<string[]> {
    return this.labels.findInUse();
  }
}
