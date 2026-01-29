import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { jwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PdfGeneratorService } from './pdf-generator.service';
import { SalesMetricsDto } from '../sales-metrics/dto/sales-metrics.dto';

interface GeneratePdfDto {
  metrics: SalesMetricsDto[];
  summary: {
    totalRecords: number;
    periodRange: {
      start: string;
      end: string;
    };
    aggregated: {
      totalRevenue: number;
      averageRevenue: number;
      totalCustomers: number;
      averageCustomers: number;
      totalDealsWon: number;
      averageWinRate: number;
      averageCAC: number;
      averageLTV: number;
    };
  };
}

@Controller('pdf-generator')
export class PdfGeneratorController {
  constructor(private readonly pdfGeneratorService: PdfGeneratorService) {}

  @Post('sales-report')
  @UseGuards(jwtAuthGuard)
  async generateSalesReport(
    @Body() data: GeneratePdfDto,
    @Res() res: Response,
  ) {
    if (!data.metrics || !data.summary) {
      throw new BadRequestException('Missing metrics or summary data');
    }

    try {
      const pdfBuffer =
        await this.pdfGeneratorService.generateSalesMetricsReport(
          data.metrics,
          data.summary,
        );

      const filename = `sales-report-${data.summary.periodRange.start}-${data.summary.periodRange.end}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to generate PDF: ${errorMessage}`);
    }
  }
}
