import { Module } from '@nestjs/common';
import { ScansModule } from '../scans/scans.module';
import { BacktestsController } from './backtests.controller';
import { BacktestsService } from './backtests.service';

import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';
import { BacktestWorker } from './workers/backtest.worker';

@Module({
  imports: [
    ScansModule,
    BullModule.registerQueue({
      name: 'backtest-execution',
    }),
    BullBoardModule.forFeature({
      name: 'backtest-execution',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [BacktestsController],
  providers: [BacktestsService, BacktestWorker],
  exports: [BacktestsService],
})
export class BacktestsModule { }
