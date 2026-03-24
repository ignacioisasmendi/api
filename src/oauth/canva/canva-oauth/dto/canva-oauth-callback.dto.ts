import { IsNotEmpty, IsString } from 'class-validator';

export class CanvaOauthCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  codeVerifier: string;
}
