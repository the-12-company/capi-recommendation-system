import {
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleDto {
  @Type(() => Date)
  @IsDate()
  data: Date;

  @IsInt()
  numNotaSaida: number;

  @IsInt()
  numeroTransacaoVenda: number;

  @IsInt()
  codCliente: number;

  @IsString()
  nomeCliente: string;

  @IsInt()
  codRca: number;

  @IsString()
  nomeRca: string;

  @IsInt()
  codProduto: number;

  @IsString()
  nomeProduto: string;

  @IsOptional()
  @IsString()
  dptoProduto?: string;

  @IsInt()
  @Min(1)
  qtdItens: number;

  @IsNumber()
  @Min(0)
  valor: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  custoMercadoriaVendida?: number;
}
