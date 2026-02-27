import { MediaType } from '@prisma/client';

export class MediaResponseDto {
  id: string;
  contentId: string;
  url: string;
  key: string;
  type: MediaType;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnail: string | null;
  order: number;
  createdAt: Date;
  signedUrl: string;
}
