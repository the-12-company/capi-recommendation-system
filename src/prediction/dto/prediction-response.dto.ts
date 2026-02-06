import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ForecastResultDto } from './forecast-response.dto';

export class PredictionResponseDto {
  @IsInt()
  @Min(1)
  basePoints: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ForecastResultDto)
  forecasts: ForecastResultDto[];
}
