import { IsArray, IsIn, IsInt, IsNumber, Min } from 'class-validator';

export class ForecastResultDto {
  @IsIn(['linear', 'movingAverage', 'holtWinters'])
  method: 'linear' | 'movingAverage' | 'holtWinters';

  @IsIn(['totalValue', 'totalSales'])
  metric: 'totalValue' | 'totalSales';

  @IsInt()
  @Min(1)
  periods: number;

  @IsArray()
  @IsNumber({}, { each: true })
  values: number[];
}
