import { Injectable, Logger } from '@nestjs/common';
import { MCPService } from '../../mcp/mcp.service';
import { mapFilters } from '../common/filter-mapper';
import { RunScanDto } from './dto/run-scan.dto';
import { RunPresetScanDto } from './dto/run-preset-scan.dto';

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(private readonly mcpService: MCPService) { }

  public async runCustomScan(dto: RunScanDto): Promise<Record<string, unknown>> {
    const symbols = dto.symbols ?? [];
    this.logger.debug(`Running custom scan across ${symbols.length > 0 ? symbols.length : 'ALL'} symbols`);
    const payload = {
      symbols: symbols,
      filters: mapFilters(dto.filters),
      filter_logic: dto.filterLogic ?? 'AND'
    };
    return this.mcpService.executeTool({ toolName: 'scan_stocks', payload });
  }

  public async runPresetScan(dto: RunPresetScanDto): Promise<Record<string, unknown>> {
    this.logger.debug(`Running preset scan ${dto.presetName}`);
    const payload = {
      preset_name: dto.presetName,
      symbols: dto.symbols,
      custom_params: dto.customParams ?? {}
    };
    return this.mcpService.executeTool({ toolName: 'run_preset_scan', payload });
  }

  public async parseNaturalLanguageQuery(query: string): Promise<Record<string, unknown>> {
    this.logger.debug(`Parsing natural language query: "${query}"`);
    return this.mcpService.executeTool({ toolName: 'parse_natural_language_query', payload: { query } });
  }
}
