import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Timeframe } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { FinnhubService } from '../market-data/finnhub.service';

export interface IngestSymbolRangeParams {
  symbol: string;
  resolution: string;
  from: number;
  to: number;
}

export interface IngestSymbolRangeResult {
  inserted: number;
  updated: number;
}

@Injectable()
export class OhlcIngestionService {
  private readonly logger = new Logger(OhlcIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhub: FinnhubService,
  ) { }

  async ingestDataForSymbol(symbol: string, resolution: string): Promise<IngestSymbolRangeResult> {
    const to = Math.floor(Date.now() / 1000);
    // Fetch last 24 hours for intraday
    const from = to - (24 * 60 * 60);

    // Map human readable resolution to API resolution if needed, or pass through
    // For now assuming resolution is passed as API compatible or mapping handled inside ingestSymbolRange?
    // The previous implementation expects Finnhub resolutions ('D', '60', etc) but mapResolutionToTimeframe handles both?
    // Actually mapResolutionToTimeframe only handles Finnhub style keys.
    // Let's ensure we pass Finnhub keys. 

    // Simple mapping for '15min' -> '15' logic
    let apiResolution = resolution;
    if (resolution === '15min') apiResolution = '15';
    if (resolution === '5min') apiResolution = '5';
    if (resolution === '1min') apiResolution = '1';
    if (resolution === '60min') apiResolution = '60';
    if (resolution === 'daily') apiResolution = 'D';

    return this.ingestSymbolRange({
      symbol,
      resolution: apiResolution,
      from,
      to
    });
  }

  async ingestSymbolRange(params: IngestSymbolRangeParams): Promise<IngestSymbolRangeResult> {
    const { symbol, resolution, from, to } = params;

    const symbolRecord = await this.prisma.symbol.findUnique({
      where: { ticker: symbol },
    });

    if (!symbolRecord) {
      throw new NotFoundException(`Symbol ${symbol} not found`);
    }

    const candles = await this.finnhub.getCandles(symbol, resolution, from, to);

    if (!candles || candles.s !== 'ok' || !candles.c || candles.c.length === 0) {
      this.logger.warn(`No candle data for ${symbol} (resolution=${resolution}) status=${candles?.s}`);
      return { inserted: 0, updated: 0 };
    }

    const timeframe = this.mapResolutionToTimeframe(resolution);

    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < candles.c.length; i += 1) {
      const timestamp = new Date(candles.t[i] * 1000);

      const result = await this.prisma.candle.upsert({
        where: {
          symbolId_timeframe_timestamp: {
            symbolId: symbolRecord.id,
            timeframe,
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
          timeframe,
          timestamp,
          open: candles.o[i],
          high: candles.h[i],
          low: candles.l[i],
          close: candles.c[i],
          volume: BigInt(candles.v[i]),
        },
      });

      // Heuristic: if createdAt === timestamp and no previous row, treat as inserted
      if (result.createdAt.getTime() === result.timestamp.getTime()) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    this.logger.log(`Ingested candles for ${symbol} (${resolution}) inserted=${inserted} updated=${updated}`);

    return { inserted, updated };
  }

  private mapResolutionToTimeframe(resolution: string): Timeframe {
    if (resolution === 'D') return Timeframe.DAY_1;
    if (resolution === '60') return Timeframe.HOUR_1;
    if (resolution === '30') return Timeframe.MIN_30;
    if (resolution === '15') return Timeframe.MIN_15;
    if (resolution === '5') return Timeframe.MIN_5;
    if (resolution === '1') return Timeframe.MIN_1;
    if (resolution === 'W') return Timeframe.WEEK_1;
    if (resolution === 'M') return Timeframe.MONTH_1;
    return Timeframe.DAY_1;
  }
}
