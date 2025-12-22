import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SymbolsService } from '../../symbols/symbols.service';

export interface SymbolSyncJob {
  exchange: string; // US, NASDAQ, etc.
}

@Processor('symbol-sync')
@Injectable()
export class SymbolSyncWorker extends WorkerHost {
  private readonly logger = new Logger(SymbolSyncWorker.name);

  constructor(private readonly symbolsService: SymbolsService) {
    super();
  }

  async process(job: Job<SymbolSyncJob>): Promise<any> {
    const { exchange } = job.data;
    this.logger.log(`Processing symbol sync for exchange: ${exchange}...`);

    try {
      const result = await this.symbolsService.syncFromFinnhub(exchange);

      this.logger.log(
        `✓ Symbol sync complete for ${exchange}: ${result.synced} synced, ${result.errors} errors`
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to sync symbols for ${exchange}:`, error);
      throw error;
    }
  }
}
