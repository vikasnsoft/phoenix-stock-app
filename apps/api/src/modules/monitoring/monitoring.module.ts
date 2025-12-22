import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';

import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'eod-ingest' },
      { name: 'symbol-sync' },
      { name: 'intraday-refresh' },
      { name: 'alert-evaluation' },
      { name: 'backtest-execution' },
    ),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
})
export class MonitoringModule { }
