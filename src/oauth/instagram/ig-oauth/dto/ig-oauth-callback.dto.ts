import { IsNotEmpty, IsString } from 'class-validator';

export class IgOauthCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
