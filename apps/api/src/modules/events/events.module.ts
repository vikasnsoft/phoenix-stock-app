
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [MarketDataModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule { }
