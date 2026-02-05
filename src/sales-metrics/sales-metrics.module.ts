import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleEntity } from './entities/sales.entity';
import { SalesController } from './sales-metrics.controller';
import { SalesService } from './sales-metrics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleEntity]), // 👈 OBRIGATÓRIO
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesMetricsModule {}
