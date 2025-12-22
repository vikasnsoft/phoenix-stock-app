import { Test, TestingModule } from '@nestjs/testing';
import { MCPService } from '../../mcp/mcp.service';
import { FilterConditionDto, FilterLogic } from '../common/dto/filter-config.dto';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateWatchlistSymbolsDto } from './dto/update-watchlist-symbols.dto';
import { RunWatchlistScanDto } from './dto/run-watchlist-scan.dto';
import { WatchlistsService } from './watchlists.service';

describe('WatchlistsService', () => {
  let service: WatchlistsService;
  let mcpService: { executeTool: jest.Mock };

  beforeEach(async () => {
    mcpService = {
      executeTool: jest.fn().mockResolvedValue({})
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistsService,
        {
          provide: MCPService,
          useValue: mcpService
        }
      ]
    }).compile();

    service = module.get<WatchlistsService>(WatchlistsService);
  });

  it('should delegate createWatchlist to create_watchlist tool', async () => {
    const dto: CreateWatchlistDto = {
      name: 'My Watchlist',
      symbols: ['AAPL', 'MSFT'],
      description: 'test list'
    };

    await service.createWatchlist(dto);

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'create_watchlist',
      payload: {
        name: 'My Watchlist',
        symbols: ['AAPL', 'MSFT'],
        description: 'test list'
      }
    });
  });

  it('should delegate listWatchlists to list_watchlists tool', async () => {
    await service.listWatchlists();

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'list_watchlists',
      payload: {}
    });
  });

  it('should delegate updateWatchlistSymbols to update_watchlist_symbols tool', async () => {
    const dto: UpdateWatchlistSymbolsDto = {
      symbols: ['GOOGL', 'TSLA']
    };

    await service.updateWatchlistSymbols('wl_1', dto);

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'update_watchlist_symbols',
      payload: {
        identifier: 'wl_1',
        symbols: ['GOOGL', 'TSLA']
      }
    });
  });

  it('should delegate deleteWatchlist to delete_watchlist tool', async () => {
    await service.deleteWatchlist('wl_2');

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'delete_watchlist',
      payload: { identifier: 'wl_2' }
    });
  });

  it('should delegate runWatchlistScan to get_watchlist_scan_results tool with mapped filters', async () => {
    const filters: FilterConditionDto[] = [
      {
        type: 'price',
        field: 'close',
        operator: 'gt',
        value: 0
      }
    ];

    const dto: RunWatchlistScanDto = {
      filters,
      filterLogic: FilterLogic.AND
    };

    await service.runWatchlistScan('wl_3', dto);

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'get_watchlist_scan_results',
      payload: {
        identifier: 'wl_3',
        filters: [
          {
            type: 'price',
            field: 'close',
            operator: 'gt',
            value: 0
          }
        ],
        filter_logic: 'AND'
      }
    });
  });
});
