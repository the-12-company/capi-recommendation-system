import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sales')
export class SaleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  data: Date;

  @Column()
  numNotaSaida: number;

  @Column()
  numeroTransacaoVenda: number;

  @Column()
  codCliente: number;

  @Column()
  nomeCliente: string;

  @Column()
  codRca: number;

  @Column()
  nomeRca: string;

  @Column()
  codProduto: number;

  @Column()
  nomeProduto: string;

  @Column({ nullable: true })
  dptoProduto?: string; // 👈 undefined, não null

  @Column()
  qtdItens: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  valor: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  custoMercadoriaVendida?: number;
}
