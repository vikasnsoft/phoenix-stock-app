import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';

import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../database/database.module';

import { AlertEvaluationWorker } from './workers/alert-evaluation.worker';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'alert-evaluation',
    }),
  ],
  providers: [AlertsService, AlertEvaluationWorker],
  controllers: [AlertsController],
  exports: [AlertsService]
})
export class AlertsModule { }
