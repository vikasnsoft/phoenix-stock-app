import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EodIngestWorker } from './workers/eod-ingest.worker';
import { SymbolSyncWorker } from './workers/symbol-sync.worker';
import { IntradayRefreshWorker } from './workers/intraday-refresh.worker';
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
    ),
    MarketDataModule,
    SymbolsModule,
  ],
  controllers: [IngestionController],
  providers: [
    EodIngestWorker,
    SymbolSyncWorker,
    IntradayRefreshWorker,
    IngestionScheduler,
    OhlcIngestionService,
  ],
  exports: [IngestionScheduler, OhlcIngestionService],
})
export class IngestionModule { }
