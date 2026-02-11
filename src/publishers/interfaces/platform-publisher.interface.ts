import { Publication } from '@prisma/client';

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export interface PublishResult {
  success: boolean;
  platformId?: string;  // Platform's internal ID (e.g., Instagram media ID)
  link?: string;        // Public URL to the published content
  message: string;
  error?: string;
}

export interface IPlatformPublisher {
  /**
   * Validates the payload for the specific platform and format
   */
  validatePayload(payload: any, format: string): Promise<ValidationResult>;

  /**
   * Publishes content to the platform
   */
  publish(publication: Publication): Promise<PublishResult>;

  /**
   * Cancels a scheduled publication (if platform supports it)
   */
  cancel?(publicationId: string): Promise<void>;
}
