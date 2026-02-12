import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePublicCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  authorName: string;

  @IsEmail()
  @IsOptional()
  authorEmail?: string;

  @IsString()
  @IsOptional()
  publicationId?: string;
}

export class UpdatePublicCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}
