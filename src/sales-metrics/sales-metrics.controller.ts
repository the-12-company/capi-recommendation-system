import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { jwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SalesService } from './sales-metrics.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('upload-csv')
  @UseGuards(jwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.salesService.processCSV(file);

    return {
      success: true,
      message: 'CSV ingested successfully',
      data: {
        insertedRows: result.inserted,
      },
    };
  }

  @Get('monthly')
  async getMonthlyMetrics(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const parsedYear = Number(year);
    const parsedMonth = Number(month);

    if (!parsedYear || !parsedMonth) {
      throw new BadRequestException('year and month are required');
    }

    return this.salesService.getMonthlyMetrics(parsedYear, parsedMonth);
  }

  // métricas agregadas de todos os meses
  @Get('monthly/all')
  async getAllMonthlyMetrics() {
    return this.salesService.getMonthlyMetricsAll();
  }

  // insights mensais (ticket, margem, MoM etc)
  @Get('monthly/insights')
  async getMonthlyInsights() {
    return this.salesService.getMonthlyInsights();
  }

  // insights anuais (visão estratégica)
  @Get('yearly/insights')
  async getYearlyInsights() {
    return this.salesService.getYearlyInsights();
  }
}
