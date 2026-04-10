import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StockSearchDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsIn(['photo', 'video'])
  @IsOptional()
  type: 'photo' | 'video' = 'photo';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(80)
  per_page: number = 20;
}
