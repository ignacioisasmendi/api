import { Injectable, Logger } from '@nestjs/common';
import {
  IPlatformPublisher,
  PublicationWithRelations,
  ValidationResult,
  PublishResult,
} from './interfaces/platform-publisher.interface';

@Injectable()
export class FacebookPublisher implements IPlatformPublisher {
  private readonly logger = new Logger(FacebookPublisher.name);

  async validatePayload(
    payload: Record<string, unknown>,
    _format: string,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!payload.message && !payload.image_url && !payload.video_url) {
      errors.push(
        'At least one of message, image_url, or video_url is required',
      );
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async publish(
    _publication: PublicationWithRelations,
  ): Promise<PublishResult> {
    this.logger.warn('Facebook publisher not yet implemented');

    // TODO: Implement Facebook Graph API integration
    return {
      success: false,
      message: 'Facebook publishing not yet implemented',
      error: 'This feature is coming soon',
    };
  }
}
