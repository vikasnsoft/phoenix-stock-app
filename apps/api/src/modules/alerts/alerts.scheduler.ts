import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AlertsScheduler {
  private readonly logger = new Logger(AlertsScheduler.name);

  constructor(
    @InjectQueue('alert-evaluation') private readonly alertQueue: Queue,
  ) { }

  @Cron(CronExpression.EVERY_5_MINUTES)
  public async scheduleEvaluation(): Promise<void> {
    this.logger.debug('Queueing alert evaluation job');
    await this.alertQueue.add('evaluate-all', {});
  }
}
