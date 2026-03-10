import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetClientId } from '../decorators/get-client-id.decorator';
import { AccountInsightsQueryDto } from './dto/account-insights-query.dto';
import { InstagramInsightsService } from './instagram-insights.service';

@Controller('instagram')
export class InstagramInsightsController {
  constructor(private readonly insightsService: InstagramInsightsService) {}

  /**
   * GET /v1/instagram/:accountId/insights?period=7d|30d
   * Returns aggregated account-level metrics for the given period.
   */
  @Get(':accountId/insights')
  getAccountInsights(
    @Param('accountId') accountId: string,
    @Query() query: AccountInsightsQueryDto,
    @GetClientId() clientId: string,
  ) {
    return this.insightsService.getAccountInsights(
      accountId,
      clientId,
      query.period,
    );
  }

  /**
   * GET /v1/instagram/:accountId/media/:mediaId/insights
   * Returns post-level metrics for a single media item.
   */
  @Get(':accountId/media/:mediaId/insights')
  getMediaInsights(
    @Param('accountId') accountId: string,
    @Param('mediaId') mediaId: string,
    @GetClientId() clientId: string,
  ) {
    return this.insightsService.getMediaInsights(accountId, clientId, mediaId);
  }

  /**
   * GET /v1/instagram/:accountId/profile
   * Returns account profile stats (followers, following, post count).
   */
  @Get(':accountId/profile')
  getProfile(
    @Param('accountId') accountId: string,
    @GetClientId() clientId: string,
  ) {
    return this.insightsService.getProfile(accountId, clientId);
  }

  /**
   * GET /v1/instagram/:accountId/media
   * Returns the last 25 media items (URLs only, no insights required).
   */
  @Get(':accountId/media')
  getMedia(
    @Param('accountId') accountId: string,
    @GetClientId() clientId: string,
  ) {
    return this.insightsService.getMedia(accountId, clientId);
  }

  /**
   * GET /v1/instagram/:accountId/media-with-insights
   * Returns the last 25 media items with their insights attached.
   */
  @Get(':accountId/media-with-insights')
  getMediaWithInsights(
    @Param('accountId') accountId: string,
    @GetClientId() clientId: string,
  ) {
    return this.insightsService.getMediaWithInsights(accountId, clientId);
  }
}
