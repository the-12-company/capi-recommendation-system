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
}
