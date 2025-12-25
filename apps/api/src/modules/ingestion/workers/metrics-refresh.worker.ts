import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FinnhubService } from '../../market-data/finnhub.service';
import { MetricsRefreshJob } from '../models/metrics-refresh-job.type';

@Processor('metrics-refresh')
@Injectable()
export class MetricsRefreshWorker extends WorkerHost {
  private readonly logger = new Logger(MetricsRefreshWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhubService: FinnhubService,
  ) {
    super();
  }

  async process(job: Job<MetricsRefreshJob>): Promise<{ processed: number; inserted: number }> {
    const data: MetricsRefreshJob = job.data;
    const skip: number = data.skip ?? 0;
    const take: number = data.take ?? 1000;
    const delayMs: number = data.delayMs ?? 1100; // ~55 req/min to stay under Finnhub 60/min limit

    this.logger.log(`Metrics refresh started: skip=${skip}, take=${take}, delayMs=${delayMs}`);

    const symbols = await this.prisma.symbol.findMany({
      where: { isActive: true },
      select: { id: true, ticker: true },
      orderBy: { ticker: 'asc' },
      skip,
      take,
    });

    if (symbols.length === 0) {
      this.logger.warn('No symbols found for metrics refresh');
      return { processed: 0, inserted: 0 };
    }

    this.logger.log(`Refreshing metrics for ${symbols.length} symbols via Finnhub...`);

    let processed = 0;
    let inserted = 0;

    for (const symbol of symbols) {
      try {
        const metrics = await this.finnhubService.getBasicFinancials(symbol.ticker);

        if (metrics && metrics.metric && Object.keys(metrics.metric).length > 0) {
          const metricData: Prisma.InputJsonObject = this.normalizeMetrics(metrics.metric);

          await this.prisma.financialMetric.create({
            data: {
              symbolId: symbol.id,
              metric: metricData,
              fetchedAt: new Date(),
            },
          });
          inserted++;
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch metrics for ${symbol.ticker}: ${String(err)}`);
      }

      processed++;
      if (processed % 50 === 0) {
        this.logger.log(`Metrics refresh progress: ${processed}/${symbols.length}, inserted=${inserted}`);
      }

      // Throttle to respect Finnhub rate limit (60 req/min)
      if (processed < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    this.logger.log(`Metrics refresh completed: processed=${processed}, inserted=${inserted}`);
    return { processed, inserted };
  }

  private normalizeMetrics(metric: Record<string, unknown>): Prisma.InputJsonObject {
    return {
      marketCapitalization: this.toNumberOrNull(metric['marketCapitalization']),
      peBasicExclExtraTTM: this.toNumberOrNull(metric['peBasicExclExtraTTM']),
      peTTM: this.toNumberOrNull(metric['peTTM']),
      peNormalizedAnnual: this.toNumberOrNull(metric['peNormalizedAnnual']),
      epsBasicExclExtraTTM: this.toNumberOrNull(metric['epsBasicExclExtraTTM']),
      epsTTM: this.toNumberOrNull(metric['epsTTM']),
      beta: this.toNumberOrNull(metric['beta']),
      dividendYieldIndicatedAnnual: this.toNumberOrNull(metric['dividendYieldIndicatedAnnual']),
      dividendPerShareAnnual: this.toNumberOrNull(metric['dividendPerShareAnnual']),
      revenuePerShareTTM: this.toNumberOrNull(metric['revenuePerShareTTM']),
      bookValuePerShareQuarterly: this.toNumberOrNull(metric['bookValuePerShareQuarterly']),
      pbQuarterly: this.toNumberOrNull(metric['pbQuarterly']),
      roeTTM: this.toNumberOrNull(metric['roeTTM']),
      roaTTM: this.toNumberOrNull(metric['roaTTM']),
      currentRatioQuarterly: this.toNumberOrNull(metric['currentRatioQuarterly']),
      quickRatioQuarterly: this.toNumberOrNull(metric['quickRatioQuarterly']),
      debtEquityQuarterly: this.toNumberOrNull(metric['totalDebt/totalEquityQuarterly']),
      '52WeekHigh': this.toNumberOrNull(metric['52WeekHigh']),
      '52WeekLow': this.toNumberOrNull(metric['52WeekLow']),
      '10DayAverageTradingVolume': this.toNumberOrNull(metric['10DayAverageTradingVolume']),
    };
  }

  private toNumberOrNull(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  }
}
