import { IsString, IsNotEmpty } from 'class-validator';
import { InitDirectPostDto } from '../post/dto/init-direct-post.dto';

/**
 * Extends InitDirectPostDto with the socialAccountId required
 * to resolve tokens from the database.
 *
 * Used by:  POST /tiktok/publish/init
 */
export class InitDirectPostWithAccountDto extends InitDirectPostDto {
  @IsString({ message: 'socialAccountId must be a string' })
  @IsNotEmpty({ message: 'socialAccountId is required' })
  socialAccountId: string;
}
