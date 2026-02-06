import { Controller, Get, Query } from '@nestjs/common';
import { PredictionService } from './prediction.service';

@Controller('prediction')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get()
  async predict(
    @Query('metric') metric: 'totalValue' | 'totalSales' = 'totalValue',
    @Query('months') months = '3',
  ) {
    return this.predictionService.predict(metric, Number(months));
  }

  @Get('chart')
  async getPredictionChart(
    @Query('metric') metric: 'totalValue' | 'totalSales',
    @Query('periods') periods = 3,
  ) {
    return this.predictionService.predictChart(metric, Number(periods));
  }
}
