import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { FinnhubService } from '../../market-data/finnhub.service';
import { Timeframe } from '@prisma/client';

export interface EodIngestJob {
  symbol: string;
  date?: string; // YYYY-MM-DD format, defaults to yesterday
}

@Processor('eod-ingest')
@Injectable()
export class EodIngestWorker extends WorkerHost {
  private readonly logger = new Logger(EodIngestWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhub: FinnhubService,
  ) {
    super();
  }

  async process(job: Job<EodIngestJob>): Promise<any> {
    const { symbol, date } = job.data;
    this.logger.log(`Processing EOD ingest for ${symbol}...`);

    try {
      // Get symbol from database
      const symbolRecord = await this.prisma.symbol.findUnique({
        where: { ticker: symbol },
      });

      if (!symbolRecord) {
        throw new Error(`Symbol ${symbol} not found in database`);
      }

      // Calculate date range (fetch last 30 days if no date specified)
      const endDate = date ? new Date(date) : new Date();
      endDate.setHours(0, 0, 0, 0);

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);

      const toTimestamp = Math.floor(endDate.getTime() / 1000);
      const fromTimestamp = Math.floor(startDate.getTime() / 1000);

      // Fetch candles from Finnhub
      const candles = await this.finnhub.getCandles(
        symbol,
        'D', // Daily resolution
        fromTimestamp,
        toTimestamp
      );

      if (candles.s !== 'ok' || !candles.c || candles.c.length === 0) {
        this.logger.warn(`No candle data for ${symbol}`);
        return { symbol, candlesStored: 0 };
      }

      // Store candles in database
      let stored = 0;
      for (let i = 0; i < candles.c.length; i++) {
        const timestamp = new Date(candles.t[i] * 1000);

        await this.prisma.candle.upsert({
          where: {
            symbolId_timeframe_timestamp: {
              symbolId: symbolRecord.id,
              timeframe: Timeframe.DAY_1,
              timestamp,
            },
          },
          update: {
            open: candles.o[i],
            high: candles.h[i],
            low: candles.l[i],
            close: candles.c[i],
            volume: BigInt(candles.v[i]),
          },
          create: {
            symbolId: symbolRecord.id,
            timeframe: Timeframe.DAY_1,
            timestamp,
            open: candles.o[i],
            high: candles.h[i],
            low: candles.l[i],
            close: candles.c[i],
            volume: BigInt(candles.v[i]),
          },
        });

        stored++;
      }

      this.logger.log(`✓ Stored ${stored} candles for ${symbol}`);
      return { symbol, candlesStored: stored };

    } catch (error) {
      this.logger.error(`Failed to ingest EOD data for ${symbol}:`, error);
      throw error;
    }
  }
}
