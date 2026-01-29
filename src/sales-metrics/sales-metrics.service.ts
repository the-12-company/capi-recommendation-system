import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { SalesMetricsDto } from './dto/sales-metrics.dto';

// Interface para os dados brutos do CSV
interface CSVRecord {
  referenceDate?: string;
  totalRevenue?: string | number;
  recurringRevenue?: string | number;
  revenueGrowthRate?: string | number;
  newCustomers?: string | number;
  activeCustomers?: string | number;
  churnedCustomers?: string | number;
  customerChurnRate?: string | number;
  revenueChurnRate?: string | number;
  leadsGenerated?: string | number;
  qualifiedLeads?: string | number;
  opportunitiesCreated?: string | number;
  dealsWon?: string | number;
  winRate?: string | number;
  averageDealValue?: string | number;
  averageSalesCycleDays?: string | number;
  customerAcquisitionCost?: string | number;
  lifetimeValue?: string | number;
  ltvToCacRatio?: string | number;
  revenuePerSalesRep?: string | number;
  netRevenueRetention?: string | number;
}

@Injectable()
export class SalesMetricsService {
  processCSV(file: Express.Multer.File): SalesMetricsDto[] {
    if (!file) {
      throw new BadRequestException('No file sent');
    }

    // Valida tamanho do arquivo (5MB max para CSV)
    const maxFileSize = 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size exceeds maximum allowed (5MB)');
    }

    // Valida tipo de arquivo
    if (file.mimetype !== 'text/csv') {
      throw new BadRequestException(
        'Invalid file type. Only CSV files are allowed',
      );
    }

    try {
      // Converte buffer para string UTF-8
      const csvContent = file.buffer.toString('utf-8');

      // Parse do CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true,
        cast_date: false,
      });

      // Valida se há dados
      if (!records || records.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      // Mapeia e valida cada registro
      const salesMetrics: SalesMetricsDto[] = records.map(
        (record: CSVRecord, index: number) => {
          try {
            return this.validateAndMapRecord(record);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(
              `Error processing row ${index + 2}: ${errorMessage}`,
            );
          }
        },
      );

      return salesMetrics;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to process CSV: ${errorMessage}`);
    }
  }

  private validateAndMapRecord(record: CSVRecord): SalesMetricsDto {
    // Valida campos obrigatórios
    const requiredFields: (keyof CSVRecord)[] = [
      'referenceDate',
      'totalRevenue',
      'newCustomers',
      'activeCustomers',
      'churnedCustomers',
      'customerChurnRate',
      'leadsGenerated',
      'qualifiedLeads',
      'opportunitiesCreated',
      'dealsWon',
      'winRate',
      'averageDealValue',
      'averageSalesCycleDays',
      'customerAcquisitionCost',
      'lifetimeValue',
      'ltvToCacRatio',
    ];

    for (const field of requiredFields) {
      const value = record[field];
      if (value === undefined || value === null || value === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Valida formato da data (YYYY-MM)
    const dateRegex = /^\d{4}-\d{2}$/;
    const referenceDate = record.referenceDate;

    if (!referenceDate || typeof referenceDate !== 'string') {
      throw new Error('referenceDate must be a string');
    }

    if (!dateRegex.test(referenceDate)) {
      throw new Error(
        `Invalid referenceDate format. Expected YYYY-MM, got: ${referenceDate}`,
      );
    }

    // Converte e valida números
    const parseNumber = (
      value: string | number | undefined,
      fieldName: string,
    ): number => {
      if (value === undefined || value === null) {
        throw new Error(`Missing value for field ${fieldName}`);
      }

      const num =
        typeof value === 'string'
          ? parseFloat(value.replace(',', '.'))
          : Number(value);

      if (isNaN(num)) {
        throw new Error(`Invalid number for field ${fieldName}: ${value}`);
      }

      return num;
    };

    const parseOptionalNumber = (
      value: string | number | undefined,
    ): number | undefined => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      const num =
        typeof value === 'string'
          ? parseFloat(value.replace(',', '.'))
          : Number(value);

      return isNaN(num) ? undefined : num;
    };

    return {
      // Período
      referenceDate: referenceDate.trim(),

      // Receita
      totalRevenue: parseNumber(record.totalRevenue, 'totalRevenue'),
      recurringRevenue: parseOptionalNumber(record.recurringRevenue),
      revenueGrowthRate: parseOptionalNumber(record.revenueGrowthRate),

      // Clientes
      newCustomers: parseNumber(record.newCustomers, 'newCustomers'),
      activeCustomers: parseNumber(record.activeCustomers, 'activeCustomers'),
      churnedCustomers: parseNumber(
        record.churnedCustomers,
        'churnedCustomers',
      ),
      customerChurnRate: parseNumber(
        record.customerChurnRate,
        'customerChurnRate',
      ),
      revenueChurnRate: parseOptionalNumber(record.revenueChurnRate),

      // Funil de vendas
      leadsGenerated: parseNumber(record.leadsGenerated, 'leadsGenerated'),
      qualifiedLeads: parseNumber(record.qualifiedLeads, 'qualifiedLeads'),
      opportunitiesCreated: parseNumber(
        record.opportunitiesCreated,
        'opportunitiesCreated',
      ),
      dealsWon: parseNumber(record.dealsWon, 'dealsWon'),
      winRate: parseNumber(record.winRate, 'winRate'),
      averageDealValue: parseNumber(
        record.averageDealValue,
        'averageDealValue',
      ),

      // Eficiência
      averageSalesCycleDays: parseNumber(
        record.averageSalesCycleDays,
        'averageSalesCycleDays',
      ),
      customerAcquisitionCost: parseNumber(
        record.customerAcquisitionCost,
        'customerAcquisitionCost',
      ),
      lifetimeValue: parseNumber(record.lifetimeValue, 'lifetimeValue'),
      ltvToCacRatio: parseNumber(record.ltvToCacRatio, 'ltvToCacRatio'),

      // Produtividade
      revenuePerSalesRep: parseOptionalNumber(record.revenuePerSalesRep),

      // Retenção e expansão
      netRevenueRetention: parseOptionalNumber(record.netRevenueRetention),
    };
  }

  // Método auxiliar para calcular estatísticas agregadas
  calculateAggregatedMetrics(metrics: SalesMetricsDto[]) {
    if (metrics.length === 0) {
      return null;
    }

    const totalRevenue = metrics.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalCustomers = metrics.reduce(
      (sum, m) => sum + m.activeCustomers,
      0,
    );
    const totalDeals = metrics.reduce((sum, m) => sum + m.dealsWon, 0);

    return {
      totalRecords: metrics.length,
      periodRange: {
        start: metrics[0].referenceDate,
        end: metrics[metrics.length - 1].referenceDate,
      },
      aggregated: {
        totalRevenue,
        averageRevenue: totalRevenue / metrics.length,
        totalCustomers,
        averageCustomers: totalCustomers / metrics.length,
        totalDealsWon: totalDeals,
        averageWinRate:
          metrics.reduce((sum, m) => sum + m.winRate, 0) / metrics.length,
        averageCAC:
          metrics.reduce((sum, m) => sum + m.customerAcquisitionCost, 0) /
          metrics.length,
        averageLTV:
          metrics.reduce((sum, m) => sum + m.lifetimeValue, 0) / metrics.length,
      },
    };
  }
}
