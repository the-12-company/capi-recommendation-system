import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PredictionChartPointDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsNumber()
  base?: number;

  @IsOptional()
  @IsNumber()
  linear?: number;

  @IsOptional()
  @IsNumber()
  movingAverage?: number;

  @IsOptional()
  @IsNumber()
  holtWinters?: number;
}
