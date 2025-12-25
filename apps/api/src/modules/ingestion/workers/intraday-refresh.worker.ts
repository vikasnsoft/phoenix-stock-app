
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OhlcIngestionService } from '../ohlc-ingestion.service';

interface IntradayRefreshJob {
  readonly skip?: number;
  readonly take?: number;
  readonly resolution?: string;
  readonly delayMs?: number;
}

interface IntradayRefreshResult {
  readonly status: 'completed';
  readonly resolution: string;
  readonly processed: number;
  readonly inserted: number;
  readonly updated: number;
}

@Processor('intraday-refresh')
@Injectable()
export class IntradayRefreshWorker extends WorkerHost {
  private readonly logger = new Logger(IntradayRefreshWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ohlcIngestionService: OhlcIngestionService,
  ) {
    super();
  }

  public async process(job: Job<IntradayRefreshJob, IntradayRefreshResult, string>): Promise<IntradayRefreshResult> {
    const skip: number = job.data.skip ?? 0;
    const take: number = job.data.take ?? 50;
    const resolution: string = job.data.resolution ?? '15min';
    const delayMs: number = job.data.delayMs ?? 1100;
    this.logger.log(`Processing intraday refresh: ${String(job.id)} (skip=${skip}, take=${take}, resolution=${resolution})`);
    try {
      const symbols = await this.prisma.symbol.findMany({
        where: { isActive: true },
        select: { ticker: true },
        orderBy: { ticker: 'asc' },
        skip,
        take,
      });
      let processed = 0;
      let inserted = 0;
      let updated = 0;
      for (const symbol of symbols) {
        const result = await this.ohlcIngestionService.ingestDataForSymbol(symbol.ticker, resolution);
        processed += 1;
        inserted += result.inserted;
        updated += result.updated;
        if (processed < symbols.length) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
      return {
        status: 'completed',
        resolution,
        processed,
        inserted,
        updated,
      };
    } catch (error) {
      this.logger.error(`Failed to process intraday refresh`, error);
      throw error;
    }
  }
}
