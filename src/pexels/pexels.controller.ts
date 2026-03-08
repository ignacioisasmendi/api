import { Controller, Get, Query } from '@nestjs/common';
import { PexelsService } from './pexels.service';
import { StockSearchDto } from './dto/stock-search.dto';

@Controller('media/stock')
export class PexelsController {
  constructor(private readonly pexels: PexelsService) {}

  /**
   * Search stock photos or videos from Pexels
   * GET /media/stock/search?query=coffee&type=photo&page=1&per_page=20
   */
  @Get('search')
  async search(@Query() dto: StockSearchDto) {
    if (dto.type === 'video') {
      return this.pexels.searchVideos(dto.query, dto.page, dto.per_page);
    }
    return this.pexels.searchPhotos(dto.query, dto.page, dto.per_page);
  }
}
