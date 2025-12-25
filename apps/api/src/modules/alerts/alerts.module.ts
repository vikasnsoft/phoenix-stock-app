import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';

import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { SavedScansModule } from '../saved-scans/saved-scans.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { AlertEvaluationWorker } from './workers/alert-evaluation.worker';
import { AlertsScheduler } from './alerts.scheduler';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    MarketDataModule,
    SavedScansModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'alert-evaluation',
    }),
    BullBoardModule.forFeature({
      name: 'alert-evaluation',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [AlertsService, AlertEvaluationWorker, AlertsScheduler],
  controllers: [AlertsController],
  exports: [AlertsService]
})
export class AlertsModule { }
