import { Injectable, Logger } from '@nestjs/common';
import { IPlatformPublisher, PublicationWithRelations, ValidationResult, PublishResult } from './interfaces/platform-publisher.interface';

@Injectable()
export class XPublisher implements IPlatformPublisher {
  private readonly logger = new Logger(XPublisher.name);

  async validatePayload(payload: Record<string, unknown>, _format: string): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!payload.text) {
      errors.push('text is required for X posts');
    }

    if (typeof payload.text === 'string' && payload.text.length > 280) {
      errors.push('text must be 280 characters or less');
    }

    if (payload.media_urls && !Array.isArray(payload.media_urls)) {
      errors.push('media_urls must be an array');
    }

    if (Array.isArray(payload.media_urls) && payload.media_urls.length > 4) {
      errors.push('X supports maximum 4 media items per post');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async publish(_publication: PublicationWithRelations): Promise<PublishResult> {
    this.logger.warn('X (Twitter) publisher not yet implemented');

    // TODO: Implement X (Twitter) API integration
    return {
      success: false,
      message: 'X publishing not yet implemented',
      error: 'This feature is coming soon',
    };
  }
}
