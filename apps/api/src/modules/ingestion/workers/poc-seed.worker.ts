import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Exchange, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OhlcIngestionService } from '../ohlc-ingestion.service';
import { FinnhubService } from '../../market-data/finnhub.service';
import { PocSeedJob } from '../models/poc-seed-job.type';

@Processor('poc-seed')
@Injectable()
export class PocSeedWorker extends WorkerHost {
  private readonly logger = new Logger(PocSeedWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ohlcIngestionService: OhlcIngestionService,
    private readonly finnhubService: FinnhubService,
  ) {
    super();
  }

  public async process(job: Job<PocSeedJob>): Promise<Record<string, unknown>> {
    const yearsBack: number = job.data.yearsBack ?? 5;
    const seedCandles: boolean = job.data.seedCandles ?? true;
    const seedMetrics: boolean = job.data.seedMetrics ?? true;
    const candleConcurrency: number = job.data.candleConcurrency ?? 5;
    const metricBatchSize: number = job.data.metricBatchSize ?? 50;
    const metricDelayMs: number = job.data.metricDelayMs ?? 1000;
    const nowSeconds: number = Math.floor(Date.now() / 1000);
    const fromSeconds: number = nowSeconds - yearsBack * 365 * 24 * 60 * 60;
    const tickers: readonly string[] = await this.resolveTickers({
      exchange: job.data.exchange ?? 'US',
      skip: job.data.skip,
      take: job.data.take,
      symbols: job.data.symbols,
    });
    this.logger.log(
      `Starting POC seed: tickers=${tickers.length} yearsBack=${yearsBack} seedCandles=${seedCandles} seedMetrics=${seedMetrics}`,
    );
    const result: Record<string, unknown> = {
      tickers: tickers.length,
      yearsBack,
      from: fromSeconds,
      to: nowSeconds,
      candles: { processed: 0, inserted: 0 },
      metrics: { processed: 0, inserted: 0 },
    };
    if (seedCandles) {
      const candleOutcome = await this.seedDailyCandles({
        tickers,
        from: fromSeconds,
        to: nowSeconds,
        concurrency: candleConcurrency,
      });
      result.candles = candleOutcome;
    }
    if (seedMetrics) {
      const metricsOutcome = await this.seedFinancialMetrics({
        tickers,
        batchSize: metricBatchSize,
        delayMs: metricDelayMs,
      });
      result.metrics = metricsOutcome;
    }
    return result;
  }

  private async resolveTickers(params: {
    readonly exchange: string;
    readonly skip?: number;
    readonly take?: number;
    readonly symbols?: readonly string[];
  }): Promise<readonly string[]> {
    if (params.symbols && params.symbols.length > 0) {
      return params.symbols
        .map((s: string) => s.trim().toUpperCase())
        .filter((s: string) => s.length > 0);
    }
    const exchange: string = params.exchange.toUpperCase();
    const skip: number = params.skip ?? 0;
    const take: number = params.take ?? 1000;
    const where: Record<string, unknown> = { isActive: true };
    if (exchange === 'US') {
      where.exchange = { in: [Exchange.NYSE, Exchange.NASDAQ, Exchange.AMEX, Exchange.OTC] };
    }
    const symbols = await this.prisma.symbol.findMany({
      where,
      select: { ticker: true },
      orderBy: { ticker: 'asc' },
      skip,
      take,
    });
    return symbols.map((s: { ticker: string }) => s.ticker);
  }

  private async seedDailyCandles(params: {
    readonly tickers: readonly string[];
    readonly from: number;
    readonly to: number;
    readonly concurrency: number;
  }): Promise<Record<string, number>> {
    const concurrency: number = Math.max(1, Math.min(params.concurrency, 3)); // Max 3 concurrent to avoid overwhelming Stooq
    let processed = 0;
    let inserted = 0;
    for (let i = 0; i < params.tickers.length; i += concurrency) {
      const batch: readonly string[] = params.tickers.slice(i, i + concurrency);
      const outcomes = await Promise.all(
        batch.map(async (ticker: string) => {
          try {
            const ingestion = await this.ohlcIngestionService.ingestSymbolRange({
              symbol: ticker,
              resolution: 'D',
              from: params.from,
              to: params.to,
            });
            return { ok: true as const, inserted: ingestion.inserted };
          } catch (err) {
            return { ok: false as const, error: err };
          }
        }),
      );
      for (const outcome of outcomes) {
        processed += 1;
        if (outcome.ok) {
          inserted += outcome.inserted;
        }
      }
      if (processed % 50 === 0) {
        this.logger.log(`POC seed candles progress: processed=${processed}/${params.tickers.length}`);
      }
    }
    return { processed, inserted };
  }

  private async seedFinancialMetrics(params: {
    readonly tickers: readonly string[];
    readonly batchSize: number;
    readonly delayMs: number;
  }): Promise<Record<string, number>> {
    const delayMs: number = Math.max(1100, params.delayMs); // Min 1.1s to respect Finnhub 60/min limit
    let processed = 0;
    let inserted = 0;

    // Get symbol IDs upfront
    const symbolRows = await this.prisma.symbol.findMany({
      where: { ticker: { in: [...params.tickers] } },
      select: { id: true, ticker: true },
    });
    const symbolIdByTicker = new Map<string, string>(
      symbolRows.map((row) => [row.ticker, row.id]),
    );

    for (const ticker of params.tickers) {
      const symbolId = symbolIdByTicker.get(ticker);
      if (!symbolId) {
        processed++;
        continue;
      }

      try {
        const metrics = await this.finnhubService.getBasicFinancials(ticker);

        if (metrics && metrics.metric && Object.keys(metrics.metric).length > 0) {
          const metricData: Prisma.InputJsonObject = this.normalizeMetrics(metrics.metric);

          await this.prisma.financialMetric.create({
            data: {
              symbolId,
              metric: metricData,
              fetchedAt: new Date(),
            },
          });
          inserted++;
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch metrics for ${ticker}: ${String(err)}`);
      }

      processed++;
      if (processed % 50 === 0) {
        this.logger.log(`POC seed metrics progress: ${processed}/${params.tickers.length}, inserted=${inserted}`);
      }

      // Throttle to respect Finnhub rate limit (60 req/min)
      if (processed < params.tickers.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
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
      '52WeekHigh': this.toNumberOrNull(metric['52WeekHigh']),
      '52WeekLow': this.toNumberOrNull(metric['52WeekLow']),
    };
  }

  private toNumberOrNull(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  }
}
