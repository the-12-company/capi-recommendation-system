import { IsIn, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PredictionChartPointDto } from './prediction-chart-point.dto';

export class PredictionChartResponseDto {
  @IsIn(['totalValue', 'totalSales'])
  metric: 'totalValue' | 'totalSales';

  @IsInt()
  periods: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PredictionChartPointDto)
  data: PredictionChartPointDto[];
}
