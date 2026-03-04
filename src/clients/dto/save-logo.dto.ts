import { IsString, IsNotEmpty } from 'class-validator';

export class SaveLogoDto {
  @IsString()
  @IsNotEmpty()
  logoUrl: string;

  @IsString()
  @IsNotEmpty()
  logoKey: string;
}
