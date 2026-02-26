import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreateKanbanColumnDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  mappedStatus?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateKanbanColumnDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mappedStatus?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class ReorderColumnsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  columnIds: string[];
}
