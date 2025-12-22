import { Test, TestingModule } from '@nestjs/testing';
import { MCPService } from '../../mcp/mcp.service';
import { FilterConditionDto, FilterLogic } from '../common/dto/filter-config.dto';
import { CreateSavedScanDto } from './dto/create-saved-scan.dto';
import { SavedScansService } from './saved-scans.service';

describe('SavedScansService', () => {
  let service: SavedScansService;
  let mcpService: { executeTool: jest.Mock };

  beforeEach(async () => {
    mcpService = {
      executeTool: jest.fn().mockResolvedValue({})
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedScansService,
        {
          provide: MCPService,
          useValue: mcpService
        }
      ]
    }).compile();

    service = module.get<SavedScansService>(SavedScansService);
  });

  it('should delegate createSavedScan to create_saved_scan tool with mapped filters and logic', async () => {
    const filters: FilterConditionDto[] = [
      {
        type: 'indicator',
        field: 'RSI',
        operator: 'gt',
        value: 40,
        timePeriod: 14
      }
    ];

    const dto: CreateSavedScanDto = {
      name: 'RSI Scan',
      filters,
      filterLogic: FilterLogic.AND,
      symbols: ['AAPL', 'MSFT'],
      description: 'test scan'
    };

    await service.createSavedScan(dto);

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'create_saved_scan',
      payload: {
        name: 'RSI Scan',
        filters: [
          {
            type: 'indicator',
            field: 'RSI',
            operator: 'gt',
            value: 40,
            time_period: 14
          }
        ],
        filter_logic: 'AND',
        symbols: ['AAPL', 'MSFT'],
        description: 'test scan'
      }
    });
  });

  it('should delegate listSavedScans to list_saved_scans tool', async () => {
    await service.listSavedScans();

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'list_saved_scans',
      payload: {}
    });
  });

  it('should delegate runSavedScan to run_saved_scan tool', async () => {
    await service.runSavedScan('scan_1');

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'run_saved_scan',
      payload: { identifier: 'scan_1' }
    });
  });

  it('should delegate deleteSavedScan to delete_saved_scan tool', async () => {
    await service.deleteSavedScan('scan_2');

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'delete_saved_scan',
      payload: { identifier: 'scan_2' }
    });
  });
});
