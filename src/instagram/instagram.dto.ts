import { IsString, IsUrl, IsNotEmpty, IsDateString } from 'class-validator';

export class CreatePostDto {
  @IsUrl({}, { message: 'image_url must be a valid URL' })
  @IsNotEmpty({ message: 'image_url is required' })
  image_url: string;

  @IsString({ message: 'caption must be a string' })
  @IsNotEmpty({ message: 'caption is required' })
  caption: string;
}

export class SchedulePostDto {
  @IsString({ message: 'caption must be a string' })
  @IsNotEmpty({ message: 'caption is required' })
  caption: string;

  @IsUrl({}, { message: 'mediaUrl must be a valid URL' })
  @IsNotEmpty({ message: 'mediaUrl is required' })
  mediaUrl: string;

  @IsDateString({}, { message: 'publishAt must be a valid date' })
  @IsNotEmpty({ message: 'publishAt is required' })
  publishAt: string;

  @IsString({ message: 'socialAccountId must be a string' })
  @IsNotEmpty({ message: 'socialAccountId is required' })
  socialAccountId: string;
}

export class CreateMediaResponse {
  id: string;
}

export class PublishMediaResponse {
  id: string;
}
