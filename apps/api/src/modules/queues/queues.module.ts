import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // BullMQ with Redis connection
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),

    // Register queues
    BullModule.registerQueue(
      { name: 'eod-ingest' },
      { name: 'symbol-sync' },
      { name: 'intraday-refresh' },
    ),

    // Enable scheduling
    ScheduleModule.forRoot(),
  ],
  exports: [BullModule],
})
export class QueuesModule { }
