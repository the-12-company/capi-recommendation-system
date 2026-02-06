import { Injectable, BadRequestException } from '@nestjs/common';
import { SalesService } from '../sales-metrics/sales-metrics.service';
import { PredictionChartPointDto } from './dto/prediction-chart-point.dto';
import { PredictionChartResponseDto } from './dto/prediction-chart-response.dto';
import { PredictionResponseDto } from './dto/prediction-response.dto';

@Injectable()
export class PredictionService {
  constructor(private readonly salesService: SalesService) {}

  async predict(
    metric: 'totalValue' | 'totalSales',
    periods: number,
  ): Promise<PredictionResponseDto> {
    if (periods < 1 || periods > 24) {
      throw new BadRequestException('Invalid prediction horizon');
    }

    const monthly = await this.salesService.getMonthlyInsights();

    if (monthly.length < 3) {
      throw new BadRequestException('Not enough historical data');
    }

    const series = monthly.map(m => m[metric]);

    const seasonLength =
      series.length >= 12 ? 12 : Math.max(2, Math.floor(series.length / 2));

    return {
      basePoints: series.length,
      forecasts: [
        {
          method: 'linear',
          metric,
          periods,
          values: this.linearRegression(series, periods),
        },
        {
          method: 'movingAverage',
          metric,
          periods,
          values: this.movingAverage(series, 3, periods),
        },
        {
          method: 'holtWinters',
          metric,
          periods,
          values: this.holtWinters(
            series,
            seasonLength,
            0.3,
            0.1,
            0.2,
            periods,
          ),
        },
      ],
    };
  }

  // ---------------- MODELOS ----------------

  private linearRegression(series: number[], periods: number): number[] {
    const n = series.length;
    const x = series.map((_, i) => i + 1);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = series.reduce((a, b) => a + b, 0);
    const sumXY = series.reduce((s, y, i) => s + y * x[i], 0);
    const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    const intercept = (sumY - slope * sumX) / n;

    return Array.from(
      { length: periods },
      (_, i) => slope * (n + i + 1) + intercept,
    );
  }

  private movingAverage(
    series: number[],
    window: number,
    periods: number,
  ): number[] {
    if (series.length < window) return [];

    const buffer = [...series];
    const result: number[] = [];

    for (let i = 0; i < periods; i++) {
      const slice = buffer.slice(-window);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      result.push(avg);
      buffer.push(avg);
    }

    return result;
  }

  private holtWinters(
    series: number[],
    seasonLength: number,
    alpha: number,
    beta: number,
    gamma: number,
    periods: number,
  ): number[] {
    if (series.length < seasonLength * 2) return [];

    let level = series[0];
    let trend = series[1] - series[0];
    const seasonals = series.slice(0, seasonLength).map(v => v / level);

    for (let i = 0; i < series.length; i++) {
      const value = series[i];
      const seasonal = seasonals[i % seasonLength];
      const prevLevel = level;

      level = alpha * (value / seasonal) + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      seasonals[i % seasonLength] =
        gamma * (value / level) + (1 - gamma) * seasonal;
    }

    return Array.from(
      { length: periods },
      (_, i) =>
        (level + trend * (i + 1)) *
        seasonals[(series.length + i) % seasonLength],
    );
  }

  async predictChart(
    metric: 'totalValue' | 'totalSales',
    periods: number,
  ): Promise<PredictionChartResponseDto> {
    const prediction = await this.predict(metric, periods);

    const data: PredictionChartPointDto[] = [];

    data.push({
      label: 'Atual',
      base: prediction.basePoints,
    });

    for (let i = 0; i < periods; i++) {
      const point: PredictionChartPointDto = {
        label: `M+${i + 1}`,
      };

      for (const forecast of prediction.forecasts) {
        point[forecast.method] = forecast.values[i] ?? null;
      }

      data.push(point);
    }

    return {
      metric,
      periods,
      data,
    };
  }
}
