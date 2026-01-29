import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';

export class SalesMetricsDto {
  // Período
  @IsString()
  referenceDate: string; // ex: "2026-01"

  // Receita
  @IsNumber()
  @Min(0)
  totalRevenue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recurringRevenue?: number; // MRR

  @IsOptional()
  @IsNumber()
  revenueGrowthRate?: number; // %

  // Clientes
  @IsInt()
  @Min(0)
  newCustomers: number;

  @IsInt()
  @Min(0)
  activeCustomers: number;

  @IsInt()
  @Min(0)
  churnedCustomers: number;

  @IsNumber()
  @Min(0)
  customerChurnRate: number; // %

  @IsOptional()
  @IsNumber()
  @Min(0)
  revenueChurnRate?: number; // %

  // Funil de vendas
  @IsInt()
  @Min(0)
  leadsGenerated: number;

  @IsInt()
  @Min(0)
  qualifiedLeads: number;

  @IsInt()
  @Min(0)
  opportunitiesCreated: number;

  @IsInt()
  @Min(0)
  dealsWon: number;

  @IsNumber()
  @Min(0)
  winRate: number; // %

  @IsNumber()
  @Min(0)
  averageDealValue: number;

  // Eficiência
  @IsInt()
  @Min(0)
  averageSalesCycleDays: number;

  @IsNumber()
  @Min(0)
  customerAcquisitionCost: number; // CAC

  @IsNumber()
  @Min(0)
  lifetimeValue: number; // LTV

  @IsNumber()
  @Min(0)
  ltvToCacRatio: number;

  // Produtividade
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenuePerSalesRep?: number;

  // Retenção e expansão
  @IsOptional()
  @IsNumber()
  @Min(0)
  netRevenueRetention?: number; // %
}
