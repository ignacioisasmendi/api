import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ReplyDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2200)
  message: string;
}
