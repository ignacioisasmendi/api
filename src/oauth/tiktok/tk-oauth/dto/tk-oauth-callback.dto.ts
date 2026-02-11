import { IsNotEmpty, IsString } from 'class-validator';

export class TkOauthCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
