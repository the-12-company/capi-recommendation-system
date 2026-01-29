import PDFDocument from 'pdfkit';
import { SalesMetricsDto } from '../sales-metrics/dto/sales-metrics.dto';
import { Injectable } from '@nestjs/common';

interface AggregatedMetrics {
  totalRecords: number;
  periodRange: {
    start: string;
    end: string;
  };
  aggregated: {
    totalRevenue: number;
    averageRevenue: number;
    totalCustomers: number;
    averageCustomers: number;
    totalDealsWon: number;
    averageWinRate: number;
    averageCAC: number;
    averageLTV: number;
  };
}

@Injectable()
export class PdfGeneratorService {
  generateSalesMetricsReport(
    metrics: SalesMetricsDto[],
    summary: AggregatedMetrics,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: 'Relatório de Métricas de Vendas',
            Author: 'Sistema de Análise',
            Subject: 'Análise de Performance',
          },
        });

        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (error: Error) => reject(error));

        // Gera o conteúdo do PDF
        this.createHeader(doc, summary);
        this.createExecutiveSummary(doc, summary);
        this.createTrendsAnalysis(doc, metrics);
        this.createDetailedTable(doc, metrics);
        this.createInsights(doc, metrics, summary);

        doc.end();
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error('Unknown error during PDF generation'),
        );
      }
    });
  }

  private createHeader(
    doc: PDFKit.PDFDocument,
    summary: AggregatedMetrics,
  ): void {
    // Título principal
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('RELATÓRIO DE MÉTRICAS DE VENDAS', { align: 'center' });

    doc.moveDown(0.5);

    // Subtítulo com período
    doc
      .fontSize(12)
      .font('Helvetica-Oblique')
      .fillColor('#7f8c8d')
      .text(
        `Período: ${this.formatDate(summary.periodRange.start)} a ${this.formatDate(summary.periodRange.end)}`,
        { align: 'center' },
      );

    doc.moveDown(1);

    // Linha separadora
    doc
      .strokeColor('#2c3e50')
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(2);
  }

  private createExecutiveSummary(
    doc: PDFKit.PDFDocument,
    summary: AggregatedMetrics,
  ): void {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('📊 RESUMO EXECUTIVO');

    doc.moveDown(1);

    const startY = doc.y;
    const cardWidth = 230;
    const cardHeight = 80;
    const gap = 15;

    // Coluna esquerda
    let currentY = startY;
    this.drawMetricCard(
      doc,
      50,
      currentY,
      cardWidth,
      cardHeight,
      'Receita Total',
      this.formatCurrency(summary.aggregated.totalRevenue),
      '#27ae60',
    );

    currentY += cardHeight + gap;
    this.drawMetricCard(
      doc,
      50,
      currentY,
      cardWidth,
      cardHeight,
      'Receita Média Mensal',
      this.formatCurrency(summary.aggregated.averageRevenue),
      '#3498db',
    );

    currentY += cardHeight + gap;
    this.drawMetricCard(
      doc,
      50,
      currentY,
      cardWidth,
      cardHeight,
      'Total de Negócios Fechados',
      summary.aggregated.totalDealsWon.toString(),
      '#9b59b6',
    );

    // Coluna direita
    currentY = startY;
    const rightX = 50 + cardWidth + gap;

    this.drawMetricCard(
      doc,
      rightX,
      currentY,
      cardWidth,
      cardHeight,
      'Taxa de Conversão Média',
      `${summary.aggregated.averageWinRate.toFixed(2)}%`,
      '#e67e22',
    );

    currentY += cardHeight + gap;
    this.drawMetricCard(
      doc,
      rightX,
      currentY,
      cardWidth,
      cardHeight,
      'CAC Médio',
      this.formatCurrency(summary.aggregated.averageCAC),
      '#e74c3c',
    );

    currentY += cardHeight + gap;
    this.drawMetricCard(
      doc,
      rightX,
      currentY,
      cardWidth,
      cardHeight,
      'LTV Médio',
      this.formatCurrency(summary.aggregated.averageLTV),
      '#16a085',
    );

    // Move o cursor para depois dos cards
    doc.y = currentY + cardHeight + 30;
  }

  private drawMetricCard(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    color: string,
  ): void {
    // Borda do card
    doc
      .strokeColor(color)
      .lineWidth(2)
      .roundedRect(x, y, width, height, 5)
      .stroke();

    // Label
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#7f8c8d')
      .text(label, x + 10, y + 10, { width: width - 20 });

    // Valor
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor(color)
      .text(value, x + 10, y + 30, { width: width - 20 });
  }

  private createTrendsAnalysis(
    doc: PDFKit.PDFDocument,
    metrics: SalesMetricsDto[],
  ): void {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('📈 ANÁLISE DE TENDÊNCIAS');

    doc.moveDown(1);

    const firstMonth = metrics[0];
    const lastMonth = metrics[metrics.length - 1];

    const revenueGrowth =
      ((lastMonth.totalRevenue - firstMonth.totalRevenue) /
        firstMonth.totalRevenue) *
      100;
    const customerGrowth =
      ((lastMonth.activeCustomers - firstMonth.activeCustomers) /
        firstMonth.activeCustomers) *
      100;
    const avgChurnRate =
      metrics.reduce((sum, m) => sum + m.customerChurnRate, 0) / metrics.length;

    const trends = [
      {
        text: `Crescimento de Receita: ${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(2)}% no período`,
        color: revenueGrowth > 0 ? '#27ae60' : '#e74c3c',
      },
      {
        text: `Crescimento de Clientes Ativos: ${customerGrowth > 0 ? '+' : ''}${customerGrowth.toFixed(2)}%`,
        color: customerGrowth > 0 ? '#27ae60' : '#e74c3c',
      },
      {
        text: `Taxa Média de Churn: ${avgChurnRate.toFixed(2)}%`,
        color:
          avgChurnRate < 2
            ? '#27ae60'
            : avgChurnRate < 5
              ? '#f39c12'
              : '#e74c3c',
      },
      {
        text: `LTV/CAC Ratio Médio: ${lastMonth.ltvToCacRatio.toFixed(2)}x ${lastMonth.ltvToCacRatio > 3 ? '✓ Saudável' : '⚠ Atenção'}`,
        color: lastMonth.ltvToCacRatio > 3 ? '#27ae60' : '#e74c3c',
      },
    ];

    trends.forEach(trend => {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(trend.color)
        .text(`• ${trend.text}`, { indent: 20 });
      doc.moveDown(0.5);
    });

    doc.moveDown(2);
  }

  private createDetailedTable(
    doc: PDFKit.PDFDocument,
    metrics: SalesMetricsDto[],
  ): void {
    // Nova página para a tabela
    doc.addPage();

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('📋 MÉTRICAS DETALHADAS');

    doc.moveDown(1);

    const tableTop = doc.y;
    const colWidths = [60, 75, 60, 55, 50, 70, 65];
    const rowHeight = 25;
    let currentY = tableTop;

    // Headers
    const headers = [
      'Período',
      'Receita',
      'Clientes',
      'Churn %',
      'Deals',
      'Win Rate %',
      'LTV/CAC',
    ];

    // Desenha header
    doc.fillColor('#34495e').rect(50, currentY, 495, rowHeight).fill();

    let currentX = 50;
    headers.forEach((header, i) => {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(header, currentX + 5, currentY + 8, {
          width: colWidths[i] - 10,
          align: 'center',
        });
      currentX += colWidths[i];
    });

    currentY += rowHeight;

    // Desenha linhas de dados
    metrics.forEach((metric, index) => {
      // Verifica se precisa de nova página
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      // Cor de fundo alternada
      if (index % 2 === 0) {
        doc.fillColor('#ecf0f1').rect(50, currentY, 495, rowHeight).fill();
      }

      currentX = 50;

      // Período
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#000000')
        .text(
          this.formatDate(metric.referenceDate),
          currentX + 5,
          currentY + 8,
          {
            width: colWidths[0] - 10,
            align: 'center',
          },
        );
      currentX += colWidths[0];

      // Receita
      doc.text(
        this.formatCurrency(metric.totalRevenue),
        currentX + 5,
        currentY + 8,
        {
          width: colWidths[1] - 10,
          align: 'right',
        },
      );
      currentX += colWidths[1];

      // Clientes
      doc.text(metric.activeCustomers.toString(), currentX + 5, currentY + 8, {
        width: colWidths[2] - 10,
        align: 'center',
      });
      currentX += colWidths[2];

      // Churn
      const churnColor = metric.customerChurnRate < 2 ? '#27ae60' : '#e74c3c';
      doc
        .fillColor(churnColor)
        .text(
          `${metric.customerChurnRate.toFixed(2)}%`,
          currentX + 5,
          currentY + 8,
          {
            width: colWidths[3] - 10,
            align: 'center',
          },
        );
      currentX += colWidths[3];

      // Deals
      doc
        .fillColor('#000000')
        .text(metric.dealsWon.toString(), currentX + 5, currentY + 8, {
          width: colWidths[4] - 10,
          align: 'center',
        });
      currentX += colWidths[4];

      // Win Rate
      doc.text(`${metric.winRate.toFixed(2)}%`, currentX + 5, currentY + 8, {
        width: colWidths[5] - 10,
        align: 'center',
      });
      currentX += colWidths[5];

      // LTV/CAC
      const ltvCacColor = metric.ltvToCacRatio > 3 ? '#27ae60' : '#e74c3c';
      doc
        .fillColor(ltvCacColor)
        .text(
          `${metric.ltvToCacRatio.toFixed(2)}x`,
          currentX + 5,
          currentY + 8,
          {
            width: colWidths[6] - 10,
            align: 'center',
          },
        );

      currentY += rowHeight;
    });

    // Bordas da tabela
    doc
      .strokeColor('#bdc3c7')
      .lineWidth(0.5)
      .rect(50, tableTop, 495, currentY - tableTop)
      .stroke();

    doc.y = currentY + 20;
  }

  private createInsights(
    doc: PDFKit.PDFDocument,
    metrics: SalesMetricsDto[],
    summary: AggregatedMetrics,
  ): void {
    // Nova página para insights
    doc.addPage();

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('💡 INSIGHTS E RECOMENDAÇÕES');

    doc.moveDown(1);

    const insights: string[] = [];

    // Análise de LTV/CAC
    const avgLtvCac =
      metrics.reduce((sum, m) => sum + m.ltvToCacRatio, 0) / metrics.length;
    if (avgLtvCac > 3) {
      insights.push(
        '✅ Excelente relação LTV/CAC (>3x), indicando aquisição de clientes sustentável.',
      );
    } else {
      insights.push(
        '⚠️ Relação LTV/CAC abaixo do ideal. Considere otimizar custos de aquisição ou aumentar o valor do cliente.',
      );
    }

    // Análise de Churn
    const avgChurn =
      metrics.reduce((sum, m) => sum + m.customerChurnRate, 0) / metrics.length;
    if (avgChurn < 2) {
      insights.push(
        '✅ Taxa de churn excelente (<2%), indicando alta satisfação.',
      );
    } else if (avgChurn < 5) {
      insights.push(
        '⚠️ Taxa de churn moderada. Investir em retenção pode aumentar significativamente a receita.',
      );
    } else {
      insights.push(
        '🚨 Taxa de churn alta. Ação imediata necessária para melhorar retenção.',
      );
    }

    // Análise de Win Rate
    const avgWinRate = summary.aggregated.averageWinRate;
    if (avgWinRate > 25) {
      insights.push('✅ Taxa de conversão saudável (>25%).');
    } else {
      insights.push(
        '⚠️ Taxa de conversão pode ser melhorada. Revisar qualificação de leads e processo de vendas.',
      );
    }

    // Tendência de crescimento
    const lastThreeMonths = metrics.slice(-3);
    const avgRecentGrowth =
      lastThreeMonths.reduce((sum, m) => sum + (m.revenueGrowthRate || 0), 0) /
      lastThreeMonths.length;
    if (avgRecentGrowth > 5) {
      insights.push(
        `✅ Crescimento acelerado nos últimos meses (${avgRecentGrowth.toFixed(1)}%).`,
      );
    } else if (avgRecentGrowth > 0) {
      insights.push(`📊 Crescimento estável (${avgRecentGrowth.toFixed(1)}%).`);
    } else {
      insights.push(
        '🚨 Crescimento negativo. Revisão estratégica recomendada.',
      );
    }

    // Renderiza insights
    insights.forEach(insight => {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#000000')
        .text(`• ${insight}`, { indent: 20 });
      doc.moveDown(0.8);
    });

    doc.moveDown(2);

    // Recomendações estratégicas
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#34495e')
      .text('Recomendações Estratégicas:');

    doc.moveDown(1);

    const recommendations = [
      'Continuar monitorando KPIs mensalmente para identificar tendências precocemente.',
      'Investir em programas de retenção para reduzir churn e maximizar LTV.',
      'Otimizar funil de vendas focando na qualificação de leads (lead scoring).',
      'Analisar ciclo de vendas para identificar gargalos e oportunidades de aceleração.',
      'Implementar métricas de cohort para entender melhor o comportamento dos clientes.',
    ];

    recommendations.forEach((rec, index) => {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#000000')
        .text(`${index + 1}. ${rec}`, { indent: 20 });
      doc.moveDown(0.8);
    });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private formatDate(dateStr: string): string {
    const [year, month] = dateStr.split('-');
    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    return `${months[parseInt(month) - 1]}/${year}`;
  }
}
