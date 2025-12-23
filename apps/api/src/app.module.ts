import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './modules/database/database.module';
import { QueuesModule } from './modules/queues/queues.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { SymbolsModule } from './modules/symbols/symbols.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { McpModule } from './mcp/mcp.module';
import { ScansModule } from './modules/scans/scans.module';
import { WatchlistsModule } from './modules/watchlists/watchlists.module';
import { SavedScansModule } from './modules/saved-scans/saved-scans.module';
import { BacktestsModule } from './modules/backtests/backtests.module';
import { EventsModule } from './modules/events/events.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { AuthModule } from './modules/auth/auth.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    // Rate Limiting
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,
      limit: 10,
    }, {
      name: 'medium',
      ttl: 10000,
      limit: 50,
    }, {
      name: 'long',
      ttl: 60000,
      limit: 200,
    }]),
    // Core Modules
    DatabaseModule,
    QueuesModule,
    AuthModule,
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    // Feature Modules
    MarketDataModule,
    SymbolsModule,
    IngestionModule,
    McpModule,
    ScansModule,
    WatchlistsModule,
    SavedScansModule,
    BacktestsModule,
    EventsModule,
    AlertsModule,
    MonitoringModule,
  ]
})
export class AppModule { }
