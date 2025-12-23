import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { EodIngestWorker } from './workers/eod-ingest.worker';
import { SymbolSyncWorker } from './workers/symbol-sync.worker';
import { IntradayRefreshWorker } from './workers/intraday-refresh.worker';
import { PocSeedWorker } from './workers/poc-seed.worker';
import { MetricsRefreshWorker } from './workers/metrics-refresh.worker';
import { IngestionScheduler } from './ingestion.scheduler';
import { IngestionController } from './ingestion.controller';
import { MarketDataModule } from '../market-data/market-data.module';
import { SymbolsModule } from '../symbols/symbols.module';
import { OhlcIngestionService } from './ohlc-ingestion.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'eod-ingest' },
      { name: 'symbol-sync' },
      { name: 'intraday-refresh' },
      { name: 'poc-seed' },
      { name: 'metrics-refresh' },
    ),
    BullBoardModule.forFeature(
      { name: 'eod-ingest', adapter: BullMQAdapter },
      { name: 'symbol-sync', adapter: BullMQAdapter },
      { name: 'intraday-refresh', adapter: BullMQAdapter },
      { name: 'poc-seed', adapter: BullMQAdapter },
      { name: 'metrics-refresh', adapter: BullMQAdapter },
    ),
    MarketDataModule,
    SymbolsModule,
  ],
  controllers: [IngestionController],
  providers: [
    EodIngestWorker,
    SymbolSyncWorker,
    IntradayRefreshWorker,
    PocSeedWorker,
    MetricsRefreshWorker,
    IngestionScheduler,
    OhlcIngestionService,
  ],
  exports: [IngestionScheduler, OhlcIngestionService],
})
export class IngestionModule { }
