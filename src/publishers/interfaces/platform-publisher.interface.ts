import { PublicationWithRelations } from '../../publications/publication.service';

export type { PublicationWithRelations };

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export interface PrepareResult {
  success: boolean;
  containerId?: string; // Platform container ID ready for publishing
  message: string;
  error?: string;
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
   * (Optional) Pre-creates a media container and waits for processing.
   * Called minutes before publishAt so that the final publish is near-instant.
   * Returns a containerId that will be stored and passed to publish() later.
   */
  prepare?(publication: PublicationWithRelations): Promise<PrepareResult>;

  /**
   * Publishes content to the platform.
   * If publication.containerId is set (from a prior prepare()), the publisher
   * should skip container creation and call the final publish endpoint directly.
   */
  publish(publication: PublicationWithRelations): Promise<PublishResult>;

  /**
   * Cancels a scheduled publication (if platform supports it)
   */
  cancel?(publicationId: string): Promise<void>;
}
