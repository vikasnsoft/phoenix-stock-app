import { Module } from '@nestjs/common';
import { McpModule } from '../../mcp/mcp.module';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';

@Module({
  imports: [McpModule],
  controllers: [ScansController],
  providers: [ScansService],
  exports: [ScansService]
})
export class ScansModule { }
