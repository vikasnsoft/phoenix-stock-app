import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FinnhubCandle } from './finnhub.service';
import { MarketDataService } from './market-data.service';

@ApiTags('Market Data')
@Controller('market-data')
export class MarketDataController {
  private readonly logger = new Logger(MarketDataController.name);

  constructor(
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

    return this.marketDataService.getLocalCandles(symbol, resolution, Number(from), Number(to));
  }

  @Get('metric')
  @ApiOperation({ summary: 'Get basic financials for a symbol' })
  @ApiQuery({ name: 'symbol', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Financial metrics' })
  async getBasicFinancials(
    @Query('symbol') symbol: string,
  ): Promise<{ metric: any }> {
    this.logger.debug(`Fetching financials for ${symbol}`);
    const metric = await this.marketDataService.getBasicFinancials(symbol);
    return { metric };
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
}
