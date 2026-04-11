import { IsString, IsNotEmpty } from 'class-validator';

export class AssignContentDto {
  @IsString()
  @IsNotEmpty()
  contentId: string;
}
