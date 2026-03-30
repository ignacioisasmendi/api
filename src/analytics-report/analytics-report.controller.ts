import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AnalyticsReportService } from './analytics-report.service';
import { GenerateReportDto, ReportResponseDto } from './analytics-report.dto';
import { GetClientId } from '../decorators';
import { RequireFeature } from '../plans/decorators/require-feature.decorator';

@Controller('analytics-report')
@RequireFeature('analytics')
export class AnalyticsReportController {
  constructor(private readonly service: AnalyticsReportService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async generate(
    @Body() dto: GenerateReportDto,
    @GetClientId() clientId: string,
  ): Promise<ReportResponseDto> {
    return this.service.generate(dto, clientId);
  }
}
