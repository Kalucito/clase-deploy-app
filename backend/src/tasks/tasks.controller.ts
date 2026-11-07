import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { uuidPipe } from '../common/errors';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
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

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', uuidPipe()) id: string): Promise<void> {
    return this.tasks.remove(id);
  }

  @Patch(':id')
  update(
    @Param('id', uuidPipe()) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    return this.tasks.update(id, dto);
  }

  @Patch(':id/move')
  move(
    @Param('id', uuidPipe()) id: string,
    @Body() dto: MoveTaskDto,
  ): Promise<TaskResponse> {
    return this.tasks.move(id, dto);
  }
}
