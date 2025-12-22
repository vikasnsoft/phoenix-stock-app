import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Timeframe } from '@prisma/client';
import { FinnhubService, FinnhubCandle } from './finnhub.service';
import { PrismaService } from '../database/prisma.service';
import { MarketDataService } from './market-data.service';

@ApiTags('Market Data')
@Controller('market-data')
export class MarketDataController {
  private readonly logger = new Logger(MarketDataController.name);

  constructor(
    private readonly finnhubService: FinnhubService,
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) { }

  @Get('candles')
  @ApiOperation({ summary: 'Get historical candles for a symbol' })
  @ApiQuery({ name: 'symbol', required: true, type: String })
  @ApiQuery({ name: 'resolution', required: true, type: String, description: '1, 5, 15, 30, 60, D, W, M' })
  @ApiQuery({ name: 'from', required: true, type: Number, description: 'Unix timestamp (seconds)' })
  @ApiQuery({ name: 'to', required: true, type: Number, description: 'Unix timestamp (seconds)' })
  @ApiResponse({ status: 200, description: 'Candle data' })
  async getCandles(
    @Query('symbol') symbol: string,
    @Query('resolution') resolution: string,
    @Query('from') from: number,
    @Query('to') to: number
  ): Promise<FinnhubCandle> {
    this.logger.debug(`Fetching candles for ${symbol} (${resolution})`);
    return this.marketDataService.getCandles(symbol, resolution, Number(from), Number(to));
  }

  @Get('candles/local')
  @ApiOperation({ summary: 'Get historical candles for a symbol from local store' })
  @ApiQuery({ name: 'symbol', required: true, type: String })
  @ApiQuery({ name: 'resolution', required: true, type: String, description: '1, 5, 15, 30, 60, D, W, M' })
  @ApiQuery({ name: 'from', required: true, type: Number, description: 'Unix timestamp (seconds)' })
  @ApiQuery({ name: 'to', required: true, type: Number, description: 'Unix timestamp (seconds)' })
  @ApiResponse({ status: 200, description: 'Local candle data' })
  async getLocalCandles(
    @Query('symbol') symbol: string,
    @Query('resolution') resolution: string,
    @Query('from') from: number,
    @Query('to') to: number,
  ): Promise<FinnhubCandle> {
    this.logger.debug(`Fetching LOCAL candles for ${symbol} (${resolution})`);

    const timeframe = this.mapResolutionToTimeframe(resolution);
    const fromDate = new Date(Number(from) * 1000);
    const toDate = new Date(Number(to) * 1000);

    const candles = await this.prisma.candle.findMany({
      where: {
        symbol: { ticker: symbol },
        timeframe,
        timestamp: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (candles.length === 0) {
      return {
        c: [],
        h: [],
        l: [],
        o: [],
        v: [],
        t: [],
        s: 'no_data',
      };
    }

    return {
      c: candles.map((c) => Number(c.close)),
      h: candles.map((c) => Number(c.high)),
      l: candles.map((c) => Number(c.low)),
      o: candles.map((c) => Number(c.open)),
      v: candles.map((c) => Number(c.volume)),
      t: candles.map((c) => Math.floor(c.timestamp.getTime() / 1000)),
      s: 'ok',
    };
  }

  @Get('metric')
  @ApiOperation({ summary: 'Get basic financials for a symbol' })
  @ApiQuery({ name: 'symbol', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Financial metrics' })
  async getBasicFinancials(
    @Query('symbol') symbol: string,
  ): Promise<any> {
    this.logger.debug(`Fetching financials for ${symbol}`);
    return this.marketDataService.getBasicFinancials(symbol);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Trigger manual market data sync' })
  @ApiResponse({ status: 201, description: 'Sync started' })
  async triggerSync() {
    this.logger.log('Manual sync triggered');
    return this.marketDataService.syncAllMarketData();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get sync status' })
  async getSyncStatus() {
    return this.marketDataService.getSyncStatus();
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
