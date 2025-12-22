import { Module } from '@nestjs/common';
import { FinnhubService } from './finnhub.service';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';

@Module({
  controllers: [MarketDataController],
  providers: [FinnhubService, MarketDataService],
  exports: [FinnhubService, MarketDataService],
})
export class MarketDataModule { }
