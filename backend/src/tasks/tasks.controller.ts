import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { uuidPipe } from '../common/errors';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskResponse } from './task.serializer';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  findAll(): Promise<TaskResponse[]> {
    return this.tasks.findAll();
  }

  @Get(':id')
  findOne(@Param('id', uuidPipe()) id: string): Promise<TaskResponse> {
    return this.tasks.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto): Promise<TaskResponse> {
    return this.tasks.create(dto);
  }
}
