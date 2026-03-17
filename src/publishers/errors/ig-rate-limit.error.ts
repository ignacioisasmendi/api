export class IgRateLimitError extends Error {
  constructor(
    public readonly platformUserId: string,
    public readonly estimatedRecoveryMs: number,
    message?: string,
  ) {
    super(
      message ??
        `Instagram rate limit reached for account ${platformUserId}`,
    );
    this.name = 'IgRateLimitError';
  }
}
