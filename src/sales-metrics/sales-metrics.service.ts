import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse';
import { InjectRepository } from '@nestjs/typeorm';
import { SaleEntity } from './entities/sales.entity';
import { Repository } from 'typeorm';
import { Readable } from 'stream';

// Interface para os dados brutos do CSV
interface MonthlyMetricsRaw {
  totalSales: string | null;
  totalItems: string | null;
  totalValue: string | null;
  totalCost: string | null;
}

export type MonthlyInsight = {
  year: number;
  month: number;
  totalSales: number;
  totalItems: number;
  totalValue: number;
  totalCost: number;

  avgTicket: number;
  avgItemCost: number;
  grossProfit: number;
  grossMarginPct: number;

  momGrowthValuePct?: number;
  momGrowthSalesPct?: number;
};

export type YearlyInsight = {
  year: number;

  totalSales: number;
  totalItems: number;
  totalValue: number;
  totalCost: number;

  avgTicket: number;
  avgItemCost: number;

  grossProfit: number;
  grossMarginPct: number;

  bestMonth?: number;
  worstMonth?: number;

  valueGrowthPct?: number; // crescimento vs ano anterior
};
interface SalesCSVRecord {
  data?: string;
  num_nota_saida?: string | number;
  numero_transacao_venda?: string | number;
  cod_cliente?: string | number;
  nome_cliente?: string;
  cod_rca?: string | number;
  nome_rca?: string;
  cod_produto?: string | number;
  nome_produto?: string;
  dpto_produto?: string;
  qtd_itens?: string | number;
  valor?: string | number;
  custo_mercadoria_vendida?: string | number;
}

@Injectable()
export class SalesService {
  private readonly BATCH_SIZE = 1000;

  constructor(
    @InjectRepository(SaleEntity)
    private readonly salesRepository: Repository<SaleEntity>,
  ) {}

  async processCSV(file: Express.Multer.File): Promise<{ inserted: number }> {
    if (!file) {
      throw new BadRequestException('No file sent');
    }

    if (file.mimetype !== 'text/csv') {
      throw new BadRequestException('Only CSV files are allowed');
    }

    const stream = Readable.from(file.buffer.toString('utf-8'));

    const parser = stream.pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }),
    );

    const batch: Partial<SaleEntity>[] = [];
    let inserted = 0;
    let row = 1;

    for await (const record of parser) {
      row++;

      try {
        const typedRecord = record as SalesCSVRecord;
        batch.push(this.mapRecordToEntity(typedRecord));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        throw new BadRequestException(`Error on row ${row}: ${msg}`);
      }

      if (batch.length >= this.BATCH_SIZE) {
        await this.salesRepository.insert(batch);
        inserted += batch.length;
        batch.length = 0;
      }
    }

    if (batch.length) {
      await this.salesRepository.insert(batch);
      inserted += batch.length;
    }

    return { inserted };
  }

  // 👇 mantém seu método atual, sem mudanças
  private mapRecordToEntity(record: SalesCSVRecord): Partial<SaleEntity> {
    const parseNumber = (value: any, field: string): number => {
      if (value === undefined || value === null || value === '') {
        throw new Error(`Missing field ${field}`);
      }

      const num =
        typeof value === 'string'
          ? parseFloat(value.replace(',', '.'))
          : Number(value);

      if (isNaN(num)) {
        throw new Error(`Invalid number in ${field}`);
      }

      return num;
    };

    const parseOptionalNumber = (value: any): number | undefined => {
      if (!value) return undefined;
      const num =
        typeof value === 'string'
          ? parseFloat(value.replace(',', '.'))
          : Number(value);
      return isNaN(num) ? undefined : num;
    };

    if (!record.data) {
      throw new Error('Missing data');
    }

    return {
      data: new Date(record.data),
      numNotaSaida: parseNumber(record.num_nota_saida, 'num_nota_saida'),
      numeroTransacaoVenda: parseNumber(
        record.numero_transacao_venda,
        'numero_transacao_venda',
      ),
      codCliente: parseNumber(record.cod_cliente, 'cod_cliente'),
      nomeCliente: record.nome_cliente?.trim() ?? '',
      codRca: parseNumber(record.cod_rca, 'cod_rca'),
      nomeRca: record.nome_rca?.trim() ?? '',
      codProduto: parseNumber(record.cod_produto, 'cod_produto'),
      nomeProduto: record.nome_produto?.trim() ?? '',
      dptoProduto: record.dpto_produto || undefined,
      qtdItens: parseNumber(record.qtd_itens, 'qtd_itens'),
      valor: parseNumber(record.valor, 'valor'),
      custoMercadoriaVendida: parseOptionalNumber(
        record.custo_mercadoria_vendida,
      ),
    };
  }

  async getMonthlyMetrics(year: number, month: number) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Invalid month');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const result = await this.salesRepository
      .createQueryBuilder('sale')
      .select([
        'COUNT(*) as "totalSales"',
        'SUM(sale.qtdItens) as "totalItems"',
        'SUM(sale.valor) as "totalValue"',
        'SUM(sale.custoMercadoriaVendida) as "totalCost"',
      ])
      .where('sale.data >= :startDate', { startDate })
      .andWhere('sale.data < :endDate', { endDate })
      .getRawOne<MonthlyMetricsRaw>();

    return {
      year,
      month,
      totalSales: Number(result?.totalSales ?? 0),
      totalItems: Number(result?.totalItems ?? 0),
      totalValue: Number(result?.totalValue ?? 0),
      totalCost: Number(result?.totalCost ?? 0),
    };
  }

  async getMonthlyMetricsAll() {
    const results = await this.salesRepository
      .createQueryBuilder('sale')
      .select([
        'EXTRACT(YEAR FROM sale.data) as year',
        'EXTRACT(MONTH FROM sale.data) as month',
        'COUNT(*) as "totalSales"',
        'SUM(sale.qtdItens) as "totalItems"',
        'SUM(sale.valor) as "totalValue"',
        'SUM(sale.custoMercadoriaVendida) as "totalCost"',
      ])
      .groupBy('year')
      .addGroupBy('month')
      .orderBy('year', 'ASC')
      .addOrderBy('month', 'ASC')
      .getRawMany<{
        year: string;
        month: string;
        totalSales: string | null;
        totalItems: string | null;
        totalValue: string | null;
        totalCost: string | null;
      }>();

    return results.map(r => ({
      year: Number(r.year),
      month: Number(r.month),
      totalSales: Number(r.totalSales ?? 0),
      totalItems: Number(r.totalItems ?? 0),
      totalValue: Number(r.totalValue ?? 0),
      totalCost: Number(r.totalCost ?? 0),
    }));
  }

  async getMonthlyInsights() {
    const data = await this.getMonthlyMetricsAll();

    return data.map((current, index) => {
      const prev = data[index - 1];

      const avgTicket =
        current.totalSales > 0 ? current.totalValue / current.totalSales : 0;

      const avgItemCost =
        current.totalItems > 0 && current.totalCost > 0
          ? current.totalCost / current.totalItems
          : 0;

      const grossProfit = current.totalValue - current.totalCost;

      const grossMarginPct =
        current.totalValue > 0 ? (grossProfit / current.totalValue) * 100 : 0;

      const momGrowthValuePct =
        prev && prev.totalValue > 0
          ? ((current.totalValue - prev.totalValue) / prev.totalValue) * 100
          : undefined;

      const momGrowthSalesPct =
        prev && prev.totalSales > 0
          ? ((current.totalSales - prev.totalSales) / prev.totalSales) * 100
          : undefined;

      return {
        ...current,
        avgTicket,
        avgItemCost,
        grossProfit,
        grossMarginPct,
        momGrowthValuePct,
        momGrowthSalesPct,
      };
    });
  }

  async getYearlyInsights() {
    const monthly = await this.getMonthlyInsights();

    const byYear = new Map<number, typeof monthly>();

    for (const m of monthly) {
      if (!byYear.has(m.year)) {
        byYear.set(m.year, []);
      }
      byYear.get(m.year)!.push(m);
    }

    const yearlyInsights: YearlyInsight[] = [];

    for (const [year, months] of byYear.entries()) {
      const totalSales = months.reduce((s, m) => s + m.totalSales, 0);
      const totalItems = months.reduce((s, m) => s + m.totalItems, 0);
      const totalValue = months.reduce((s, m) => s + m.totalValue, 0);
      const totalCost = months.reduce((s, m) => s + m.totalCost, 0);

      const avgTicket = totalSales > 0 ? totalValue / totalSales : 0;
      const avgItemCost = totalItems > 0 ? totalCost / totalItems : 0;

      const grossProfit = totalValue - totalCost;
      const grossMarginPct =
        totalValue > 0 ? (grossProfit / totalValue) * 100 : 0;

      const sortedByValue = [...months].sort(
        (a, b) => b.totalValue - a.totalValue,
      );

      yearlyInsights.push({
        year,
        totalSales,
        totalItems,
        totalValue,
        totalCost,
        avgTicket,
        avgItemCost,
        grossProfit,
        grossMarginPct,
        bestMonth: sortedByValue[0]?.month,
        worstMonth: sortedByValue.at(-1)?.month,
      });
    }

    // crescimento YoY
    yearlyInsights.sort((a, b) => a.year - b.year);

    for (let i = 1; i < yearlyInsights.length; i++) {
      const curr = yearlyInsights[i];
      const prev = yearlyInsights[i - 1];

      if (prev.totalValue > 0) {
        curr.valueGrowthPct =
          ((curr.totalValue - prev.totalValue) / prev.totalValue) * 100;
      }
    }

    return yearlyInsights;
  }
}
