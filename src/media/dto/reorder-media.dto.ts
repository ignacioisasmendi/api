import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ReorderMediaDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  mediaIds: string[];
}
