import { Controller, Get } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) { }

  @Get('queues')
  getQueueStats() {
    return this.monitoringService.getQueueStats();
  }
}
