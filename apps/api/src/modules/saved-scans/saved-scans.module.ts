import { Module } from '@nestjs/common';
import { McpModule } from '../../mcp/mcp.module';
import { SavedScansController } from './saved-scans.controller';
import { SavedScansService } from './saved-scans.service';

import { ScansModule } from '../scans/scans.module';

@Module({
  imports: [McpModule, ScansModule],
  controllers: [SavedScansController],
  providers: [SavedScansService],
  exports: [SavedScansService]
})
export class SavedScansModule { }
