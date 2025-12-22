import { Module } from '@nestjs/common';
import { FinnhubService } from './finnhub.service';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { RedisCacheService } from './redis-cache.service';
import { StooqService } from './stooq.service';

@Module({
  controllers: [MarketDataController],
  providers: [FinnhubService, MarketDataService, RedisCacheService, StooqService],
  exports: [FinnhubService, MarketDataService, RedisCacheService, StooqService],
})
export class MarketDataModule { }
