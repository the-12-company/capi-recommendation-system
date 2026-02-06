import { Module } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { PredictionController } from './prediction.controller';
import { SalesMetricsModule } from '../sales-metrics/sales-metrics.module';

@Module({
  imports: [SalesMetricsModule],
  controllers: [PredictionController],
  providers: [PredictionService],
})
export class PredictionModule {}
