import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTaskBoardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateTaskBoardDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
