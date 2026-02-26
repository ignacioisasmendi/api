import { PublicationWithRelations } from '../../publications/publication.service';

export type { PublicationWithRelations };

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export interface PublishResult {
  success: boolean;
  platformId?: string; // Platform's internal ID (e.g., Instagram media ID)
  link?: string; // Public URL to the published content
  message: string;
  error?: string;
}

export interface IPlatformPublisher {
  /**
   * Validates the payload for the specific platform and format
   */
  validatePayload(
    payload: Record<string, unknown>,
    format: string,
  ): Promise<ValidationResult>;

  /**
   * Publishes content to the platform.
   * Receives the full publication with all relations pre-loaded — do NOT re-fetch from DB.
   */
  publish(publication: PublicationWithRelations): Promise<PublishResult>;

  /**
   * Cancels a scheduled publication (if platform supports it)
   */
  cancel?(publicationId: string): Promise<void>;
}
