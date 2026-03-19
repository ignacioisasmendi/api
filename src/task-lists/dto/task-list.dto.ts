import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ArrayMinSize,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateTaskListDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class UpdateTaskListDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class ReorderTaskListsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  listIds: string[];
}
