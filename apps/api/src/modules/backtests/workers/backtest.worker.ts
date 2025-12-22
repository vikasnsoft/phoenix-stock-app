
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BacktestsService } from '../backtests.service';

@Processor('backtest-execution')
export class BacktestWorker extends WorkerHost {
  private readonly logger = new Logger(BacktestWorker.name);

  constructor(private readonly backtestsService: BacktestsService) {
    super();
  }

  async process(job: Job<{ backtestId: string }, any, string>): Promise<any> {
    const { backtestId } = job.data;
    this.logger.log(`Executing backtest job for ${backtestId}`);

    // We call the service's execution method directly.
    // Ideally, the service's `executeBacktest` would be public or we move logic here.
    // For now, let's assume we can make `executeBacktest` public in the Service.

    // Actually, `BacktestsService` already has `executeBacktest` but it is private in the current file view.
    // We should expose it or move the logic.
    // Given the pattern, it's better to keep logic in Service and have Worker call it.

    await this.backtestsService.executeBacktestPublic(backtestId);
    return { status: 'completed' };
  }
}
