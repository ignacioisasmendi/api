import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ArrayMinSize,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @IsOptional()
  @IsString()
  coverColor?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @IsOptional()
  @IsString()
  coverColor?: string | null;
}

export class MoveTaskDto {
  @IsString()
  @IsNotEmpty()
  listId: string;

  @IsInt()
  order: number;
}

export class ReorderTasksDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  taskIds: string[];
}
