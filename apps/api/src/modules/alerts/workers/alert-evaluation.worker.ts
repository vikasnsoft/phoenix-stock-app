
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Processor('alert-evaluation')
export class AlertEvaluationWorker extends WorkerHost {
  private readonly logger = new Logger(AlertEvaluationWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Evaluating alerts: ${job.id}`);
    try {
      const activeAlerts = await this.prisma.alert.findMany({
        where: { status: 'ACTIVE' }
      });

      // Mock evaluation logic for now
      // In reality, check latest candles for specific symbols or re-run scans
      let triggeredCount = 0;

      for (const alert of activeAlerts) {
        // Simplified check logic would go here
        // e.g. if (alert.type === PRICE_CROSS && currentPrice > condition)
        // this.logger.debug(`Evaluating alert ${alert.name} for ${alert.ticker}`);
      }

      return { status: 'completed', evaluated: activeAlerts.length, triggered: triggeredCount };
    } catch (error) {
      this.logger.error(`Failed to evaluate alerts`, error);
      throw error;
    }
  }
}
