import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  @IsNotEmpty()
  socialAccountId: string;

  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;
}

export class ReportResponseDto {
  downloadUrl: string;
}
