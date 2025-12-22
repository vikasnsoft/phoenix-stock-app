import { Module } from '@nestjs/common';
import { McpModule } from '../../mcp/mcp.module';
import { WatchlistsController } from './watchlists.controller';
import { WatchlistsService } from './watchlists.service';

import { ScansModule } from '../scans/scans.module';

@Module({
  imports: [McpModule, ScansModule],
  controllers: [WatchlistsController],
  providers: [WatchlistsService]
})
export class WatchlistsModule { }
