import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadMediaDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;
}
