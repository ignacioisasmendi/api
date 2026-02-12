import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCalendarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}

export class UpdateCalendarDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}

export class AssignContentDto {
  @IsString()
  @IsNotEmpty()
  contentId: string;
}
