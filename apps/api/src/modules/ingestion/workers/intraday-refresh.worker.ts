
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { OhlcIngestionService } from '../ohlc-ingestion.service';

@Processor('intraday-refresh')
export class IntradayRefreshWorker extends WorkerHost {
  private readonly logger = new Logger(IntradayRefreshWorker.name);

  constructor(private readonly ohlcIngestionService: OhlcIngestionService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing intraday refresh: ${job.id}`);
    try {
      // Example: Refresh data for top symbols or active watchlists
      // For MVP, we might mock this or just refresh a hardcoded list
      // Real implementation would look up active tickers
      const tickers = job.data.tickers || ['AAPL', 'MSFT', 'GOOGL'];

      for (const ticker of tickers) {
        // Fetch 1min or 5min data
        await this.ohlcIngestionService.ingestDataForSymbol(ticker, '15min');
      }

      return { status: 'completed', tickersProcessed: tickers.length };
    } catch (error) {
      this.logger.error(`Failed to process intraday refresh`, error);
      throw error;
    }
  }
}
