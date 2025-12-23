import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { IngestionScheduler } from './ingestion.scheduler';
import { OhlcIngestionService } from './ohlc-ingestion.service';
import { PocSeedJob } from './models/poc-seed-job.type';
import { PrismaService } from '../database/prisma.service';

import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

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

class PocSeedDto {
  @ApiProperty({ required: false, default: 5, description: 'How many years back to seed (1-5 recommended for POC)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  yearsBack?: number;

  @ApiProperty({ required: false, default: 'US', description: 'Exchange group (US supported)' })
  @IsOptional()
  @IsString()
  exchange?: string;

  @ApiProperty({ required: false, description: 'Optional explicit symbol list to seed', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symbols?: string[];

  @ApiProperty({ required: false, default: 0, description: 'Skip N symbols from DB query when symbols not provided' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  skip?: number;

  @ApiProperty({ required: false, default: 1000, description: 'Take N symbols from DB query when symbols not provided' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  take?: number;

  @ApiProperty({ required: false, default: true, description: 'Seed daily candles via Stooq' })
  @IsOptional()
  @IsBoolean()
  seedCandles?: boolean;

  @ApiProperty({ required: false, default: true, description: 'Seed basic financial metrics via FMP batch quote' })
  @IsOptional()
  @IsBoolean()
  seedMetrics?: boolean;

  @ApiProperty({ required: false, default: 5, description: 'Parallelism for candle backfill' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(25)
  candleConcurrency?: number;

  @ApiProperty({ required: false, default: 50, description: 'Batch size for FMP batch quote' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  metricBatchSize?: number;

  @ApiProperty({ required: false, default: 1000, description: 'Delay in ms between FMP batches to respect free-tier limits' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  metricDelayMs?: number;
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
    @InjectQueue('poc-seed') private readonly pocSeedQueue: Queue<PocSeedJob>,
    private readonly scheduler: IngestionScheduler,
    private readonly ohlcIngestionService: OhlcIngestionService,
    private readonly prisma: PrismaService,
  ) { }

  @Get('seed/status')
  @ApiOperation({ summary: 'Get seed job status and database statistics' })
  @ApiResponse({ status: 200, description: 'Seed status and stats' })
  async getSeedStatus() {
    const [
      activeJobs,
      waitingJobs,
      completedJobs,
      failedJobs,
      symbolCount,
      candleCount,
      metricCount,
    ] = await Promise.all([
      this.pocSeedQueue.getActive(),
      this.pocSeedQueue.getWaiting(),
      this.pocSeedQueue.getCompleted(0, 10),
      this.pocSeedQueue.getFailed(0, 10),
      this.prisma.symbol.count({ where: { isActive: true } }),
      this.prisma.candle.count(),
      this.prisma.financialMetric.count(),
    ]);

    const formatJob = (job: Job<PocSeedJob>) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    });

    return {
      queue: {
        active: activeJobs.map(formatJob),
        waiting: waitingJobs.map(formatJob),
        recentCompleted: completedJobs.map(formatJob),
        recentFailed: failedJobs.map(formatJob),
      },
      database: {
        activeSymbols: symbolCount,
        totalCandles: candleCount,
        totalMetrics: metricCount,
      },
    };
  }

  @Get('seed/job/:jobId')
  @ApiOperation({ summary: 'Get specific seed job status by ID' })
  @ApiResponse({ status: 200, description: 'Job status' })
  async getSeedJobStatus(@Param('jobId') jobId: string) {
    const job = await this.pocSeedQueue.getJob(jobId);
    if (!job) {
      return { error: 'Job not found', jobId };
    }
    const state = await job.getState();
    return {
      id: job.id,
      name: job.name,
      state,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

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

  @Post('metrics/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger metrics refresh via FMP batch API' })
  @ApiResponse({ status: 200, description: 'Metrics refresh job queued' })
  async refreshMetrics(@Body() dto: { skip?: number; take?: number }) {
    await this.scheduler.triggerMetricsRefresh(dto);
    return {
      message: 'Metrics refresh job queued',
      skip: dto.skip ?? 0,
      take: dto.take ?? 1000,
    };
  }

  @Post('poc/seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Queue a POC seed job (1-5y daily candles via Stooq + financial metrics via FMP)' })
  @ApiResponse({ status: 200, description: 'Seed job queued' })
  async seedPoc(@Body() dto: PocSeedDto) {
    const job: PocSeedJob = {
      yearsBack: dto.yearsBack,
      exchange: dto.exchange,
      symbols: dto.symbols,
      skip: dto.skip,
      take: dto.take,
      seedCandles: dto.seedCandles,
      seedMetrics: dto.seedMetrics,
      candleConcurrency: dto.candleConcurrency,
      metricBatchSize: dto.metricBatchSize,
      metricDelayMs: dto.metricDelayMs,
    };
    const queuedJob = await this.pocSeedQueue.add('poc-seed', job, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    });
    return {
      message: 'POC seed job queued',
      jobId: queuedJob.id,
    };
  }
}
