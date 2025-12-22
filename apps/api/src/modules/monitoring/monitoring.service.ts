import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectQueue('eod-ingest') private readonly eodQueue: Queue,
    @InjectQueue('symbol-sync') private readonly symbolQueue: Queue,
    @InjectQueue('intraday-refresh') private readonly intradayQueue: Queue,
    @InjectQueue('alert-evaluation') private readonly alertQueue: Queue,
    @InjectQueue('backtest-execution') private readonly backtestQueue: Queue,
  ) { }

  async getQueueStats() {
    return {
      eod: await this.eodQueue.getJobCounts(),
      symbolSync: await this.symbolQueue.getJobCounts(),
      intraday: await this.intradayQueue.getJobCounts(),
      alerts: await this.alertQueue.getJobCounts(),
      backtests: await this.backtestQueue.getJobCounts(),
    };
  }
}

