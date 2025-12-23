import { Injectable, Logger } from '@nestjs/common';
import { MCPService } from '../../mcp/mcp.service';
import { mapFilters } from '../common/filter-mapper';
import { RunScanDto } from './dto/run-scan.dto';
import { RunPresetScanDto } from './dto/run-preset-scan.dto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(
    private readonly mcpService: MCPService,
    private readonly prisma: PrismaService,
  ) { }

  public async runCustomScan(dto: RunScanDto): Promise<Record<string, unknown>> {
    const symbols = await this.resolveSymbolsToScan({
      inputSymbols: dto.symbols,
      skip: dto.skip,
      take: dto.take,
    });
    this.logger.debug(`Running custom scan across ${symbols.length > 0 ? symbols.length : 'ALL'} symbols`);
    const payload = {
      symbols: symbols,
      filters: mapFilters(dto.filters),
      filter_logic: dto.filterLogic ?? 'AND'
    };
    return this.mcpService.executeTool({ toolName: 'scan_stocks', payload });
  }

  private async resolveSymbolsToScan(params: {
    readonly inputSymbols: string[] | undefined;
    readonly skip: number | undefined;
    readonly take: number | undefined;
  }): Promise<string[]> {
    if (params.inputSymbols && params.inputSymbols.length > 0) {
      return params.inputSymbols;
    }
    const skip: number = params.skip ?? 0;
    const take: number = params.take ?? 1000;
    const symbols = await this.prisma.symbol.findMany({
      where: { isActive: true },
      select: { ticker: true },
      orderBy: { ticker: 'asc' },
      skip,
      take,
    });
    return symbols.map((s: { ticker: string }) => s.ticker);
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
