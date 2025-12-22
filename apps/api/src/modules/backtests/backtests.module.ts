import { Module } from '@nestjs/common';
import { ScansModule } from '../scans/scans.module';
import { BacktestsController } from './backtests.controller';
import { BacktestsService } from './backtests.service';

import { BullModule } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BacktestWorker } from './workers/backtest.worker';

@Module({
  imports: [
    ScansModule,
    BullModule.registerQueue({
      name: 'backtest-execution',
    }),
  ],
  controllers: [BacktestsController],
  providers: [BacktestsService, BacktestWorker],
  exports: [BacktestsService],
})
export class BacktestsModule { }
