import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { EodIngestJob } from './workers/eod-ingest.worker';
import { SymbolSyncJob } from './workers/symbol-sync.worker';
import { MetricsRefreshJob } from './models/metrics-refresh-job.type';

@Injectable()
export class IngestionScheduler {
  private readonly logger = new Logger(IngestionScheduler.name);

  constructor(
    @InjectQueue('eod-ingest') private eodQueue: Queue<EodIngestJob>,
    @InjectQueue('symbol-sync') private symbolSyncQueue: Queue<SymbolSyncJob>,
    @InjectQueue('metrics-refresh') private metricsQueue: Queue<MetricsRefreshJob>,
    private readonly prisma: PrismaService,
  ) { }

  /**
   * Daily EOD ingest - runs at 6 PM EST (after market close)
   * Fetches yesterday's closing data for all active symbols
   */
  @Cron('0 18 * * 1-5', { timeZone: 'America/New_York' }) // 6 PM EST, weekdays only
  async scheduleEodIngest() {
    this.logger.log('Starting scheduled EOD ingest...');

    try {
      // Get all active symbols
      const symbols = await this.prisma.symbol.findMany({
        where: { isActive: true },
        select: { ticker: true },
        take: 1000, // Limit to prevent overwhelming the system
      });

      this.logger.log(`Queuing EOD ingest for ${symbols.length} symbols...`);

      // Queue jobs for each symbol
      const jobs = symbols.map((symbol, index) => ({
        name: `eod-${symbol.ticker}`,
        data: { symbol: symbol.ticker },
        opts: {
          delay: index * 100, // Stagger by 100ms to avoid rate limits
          attempts: 3,
          backoff: {
            type: 'exponential' as const,
            delay: 2000,
          },
        },
      }));

      await this.eodQueue.addBulk(jobs);

      this.logger.log(`✓ Queued ${jobs.length} EOD ingest jobs`);
    } catch (error) {
      this.logger.error('Failed to schedule EOD ingest:', error);
    }
  }

  /**
   * Weekly symbol sync - runs every Sunday at 2 AM
   * Syncs symbol master data from Finnhub
   */
  @Cron(CronExpression.EVERY_WEEK, { timeZone: 'America/New_York' })
  async scheduleSymbolSync() {
    this.logger.log('Starting scheduled symbol sync...');

    try {
      const exchanges = ['US']; // Can add more exchanges as needed

      for (const exchange of exchanges) {
        await this.symbolSyncQueue.add(
          `sync-${exchange}`,
          { exchange },
          {
            attempts: 2,
            backoff: {
              type: 'exponential' as const,
              delay: 5000,
            },
          }
        );
      }

      this.logger.log(`✓ Queued symbol sync for ${exchanges.length} exchanges`);
    } catch (error) {
      this.logger.error('Failed to schedule symbol sync:', error);
    }
  }

  /**
   * Manual trigger for EOD ingest (useful for testing or catch-up)
   */
  async triggerEodIngest(symbols?: string[]) {
    this.logger.log('Manually triggering EOD ingest...');

    if (symbols && symbols.length > 0) {
      // Specific symbols
      const jobs = symbols.map((symbol, index) => ({
        name: `manual-eod-${symbol}`,
        data: { symbol },
        opts: {
          delay: index * 100,
          attempts: 3,
        },
      }));

      await this.eodQueue.addBulk(jobs);
      this.logger.log(`✓ Queued ${jobs.length} manual EOD jobs`);
    } else {
      // All active symbols
      await this.scheduleEodIngest();
    }
  }

  /**
   * Manual trigger for symbol sync
   */
  async triggerSymbolSync(exchange: string) {
    this.logger.log(`Manually triggering symbol sync for ${exchange}...`);

    await this.symbolSyncQueue.add(
      `manual-sync-${exchange}`,
      { exchange },
      { attempts: 2 }
    );

    this.logger.log(`✓ Queued symbol sync for ${exchange}`);
  }

  /**
   * Daily metrics refresh - runs at 7 PM EST (after EOD ingest)
   * Updates financial metrics for all active symbols via FMP batch API
   */
  @Cron('0 19 * * 1-5', { timeZone: 'America/New_York' }) // 7 PM EST, weekdays only
  async scheduleMetricsRefresh() {
    this.logger.log('Starting scheduled metrics refresh...');

    try {
      await this.metricsQueue.add(
        'daily-metrics-refresh',
        {
          take: 2000,
          batchSize: 50,
          delayMs: 1000,
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential' as const,
            delay: 5000,
          },
        }
      );

      this.logger.log('✓ Queued daily metrics refresh job');
    } catch (error) {
      this.logger.error('Failed to schedule metrics refresh:', error);
    }
  }

  /**
   * Manual trigger for metrics refresh
   */
  async triggerMetricsRefresh(params?: { skip?: number; take?: number }) {
    this.logger.log('Manually triggering metrics refresh...');

    await this.metricsQueue.add(
      'manual-metrics-refresh',
      {
        skip: params?.skip ?? 0,
        take: params?.take ?? 1000,
        batchSize: 50,
        delayMs: 1000,
      },
      { attempts: 2 }
    );

    this.logger.log('✓ Queued manual metrics refresh job');
  }
}
