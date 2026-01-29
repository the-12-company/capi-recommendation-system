import { Module } from '@nestjs/common';
import { SalesMetricsController } from './sales-metrics.controller';
import { SalesMetricsService } from './sales-metrics.service';

@Module({
  controllers: [SalesMetricsController],
  providers: [SalesMetricsService],
  exports: [SalesMetricsService], // Exporta para usar em outros módulos (ex: PDF generator)
})
export class SalesMetricsModule {}
