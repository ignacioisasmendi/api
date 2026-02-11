// src/shared/storage/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly r2Client: S3Client;
  private readonly bucketName: string | undefined;
  private readonly publicDomain: string | undefined;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME');
    this.publicDomain = this.configService.get<string>('R2_PUBLIC_DOMAIN');

    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.configService.get('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY')!,
      },
    });

    this.logger.log('R2 Storage initialized');
  }

  /**
   * Generate presigned URL for direct upload from client
   */
  async generateUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(this.r2Client, command, { expiresIn });
  }

  /**
   * Upload file directly from server (use sparingly - prefer presigned URLs)
   */
  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.r2Client.send(command);
    return this.getPublicUrl(key);
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.r2Client.send(command);
    this.logger.log(`Deleted file: ${key}`);
  }

  /**
   * Generate public URL for a file
   */
  getPublicUrl(key: string): string {
    return `${this.publicDomain}/${key}`;
  }

  /**
   * Generate storage key for user content
   */
  generateKey(userId: string, contentId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `users/${userId}/content/${contentId}/${timestamp}_${sanitizedFilename}`;
  }
}