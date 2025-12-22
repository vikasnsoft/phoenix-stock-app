import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IngestionScheduler } from './ingestion.scheduler';
import { OhlcIngestionService } from './ohlc-ingestion.service';

import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

class TriggerEodDto {
  @ApiProperty({ description: 'Specific symbols to ingest (optional)', required: false, type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  symbols?: string[];

  @ApiProperty({ description: 'Force re-ingestion', required: false, type: Boolean })
  @IsOptional()
  force?: boolean;
}

class TriggerSymbolSyncDto {
  @ApiProperty({ description: 'Exchange code (e.g., US, NSE)', example: 'US' })
  @IsString()
  exchange: string = '';
}

class BackfillDto {
  @ApiProperty({ description: 'Ticker symbol to backfill (e.g. AAPL)' })
  @IsString()
  symbol!: string;

  @ApiProperty({ description: 'Resolution (Finnhub-style)', required: false, default: 'D' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiProperty({ description: 'From timestamp (unix seconds)' })
  @IsNumber()
  from!: number;

  @ApiProperty({ description: 'To timestamp (unix seconds)' })
  @IsNumber()
  to!: number;
}

@ApiTags('Ingestion')
@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly scheduler: IngestionScheduler,
    private readonly ohlcIngestionService: OhlcIngestionService,
  ) { }

  @Post('eod/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger EOD data ingestion' })
  @ApiResponse({ status: 200, description: 'Ingestion jobs queued' })
  async triggerEod(@Body() dto: TriggerEodDto) {
    await this.scheduler.triggerEodIngest(dto.symbols);
    return {
      message: dto.symbols
        ? `Queued EOD ingest for ${dto.symbols.length} symbols`
        : 'Queued EOD ingest for all active symbols',
    };
  }

  @Post('symbols/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger symbol sync from Finnhub' })
  @ApiResponse({ status: 200, description: 'Symbol sync job queued' })
  async triggerSymbolSync(@Body() dto: TriggerSymbolSyncDto) {
    await this.scheduler.triggerSymbolSync(dto.exchange);
    return {
      message: `Queued symbol sync for exchange: ${dto.exchange}`,
    };
  }

  @Post('backfill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Backfill OHLC candles for a symbol and date range' })
  @ApiResponse({ status: 200, description: 'Backfill completed' })
  async backfill(@Body() dto: BackfillDto) {
    const resolution = dto.resolution ?? 'D';
    const result = await this.ohlcIngestionService.ingestSymbolRange({
      symbol: dto.symbol,
      resolution,
      from: dto.from,
      to: dto.to,
    });

    return {
      message: `Backfill completed for ${dto.symbol} (${resolution})`,
      ...result,
    };
  }
}
