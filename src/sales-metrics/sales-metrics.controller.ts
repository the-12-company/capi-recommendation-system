import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { jwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SalesMetricsService } from './sales-metrics.service';

@Controller('sales-metrics')
export class SalesMetricsController {
  constructor(private readonly salesMetricsService: SalesMetricsService) {}

  @Post('upload-csv')
  @UseGuards(jwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const salesMetrics = this.salesMetricsService.processCSV(file);
    const aggregatedMetrics =
      this.salesMetricsService.calculateAggregatedMetrics(salesMetrics);

    return {
      success: true,
      message: 'CSV processed successfully',
      data: {
        metrics: salesMetrics,
        summary: aggregatedMetrics,
      },
    };
  }
}
