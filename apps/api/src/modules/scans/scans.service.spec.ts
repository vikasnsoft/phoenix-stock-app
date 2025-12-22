import { Test, TestingModule } from '@nestjs/testing';
import { FilterLogic, FilterConditionDto, FilterType } from '../common/dto/filter-config.dto';
import { MCPService } from '../../mcp/mcp.service';
import { RunScanDto } from './dto/run-scan.dto';
import { RunPresetScanDto } from './dto/run-preset-scan.dto';
import { ScansService } from './scans.service';
import { NodeType } from '../common/dto/expression.dto';

describe('ScansService', () => {
  let service: ScansService;
  let mcpService: { executeTool: jest.Mock };

  beforeEach(async () => {
    mcpService = {
      executeTool: jest.fn().mockResolvedValue({ matched_stocks: [], total_scanned: 0 })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScansService,
        {
          provide: MCPService,
          useValue: mcpService
        }
      ]
    }).compile();

    service = module.get<ScansService>(ScansService);
  });

  it('should delegate runCustomScan to scan_stocks with mapped payload', async () => {
    const filters: FilterConditionDto[] = [
      {
        type: 'price',
        field: 'close',
        operator: 'gt',
        value: 0
      }
    ];

    const dto: RunScanDto = {
      symbols: ['AAPL', 'MSFT'],
      filters,
      filterLogic: FilterLogic.AND
    };

    const result = await service.runCustomScan(dto);

    expect(mcpService.executeTool).toHaveBeenCalledTimes(1);
    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'scan_stocks',
      payload: {
        symbols: ['AAPL', 'MSFT'],
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
    expect(result).toEqual({ matched_stocks: [], total_scanned: 0 });
  });

  it('should pass expression field through to MCP', async () => {
    const dto: RunScanDto = {
      symbols: ['AAPL'],
      filters: [
        {
          type: FilterType.EXPRESSION,
          operator: 'gt',
          expression: {
            type: NodeType.BINARY,
            operator: '>',
            left: {
              type: NodeType.ATTRIBUTE,
              field: 'close',
              offset: 0,
            },
            right: {
              type: NodeType.CONSTANT,
              value: 150,
            },
          },
        } as any,
      ],
      filterLogic: FilterLogic.AND,
    };

    await service.runCustomScan(dto);

    expect(mcpService.executeTool).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: 'scan_stocks',
        payload: expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              type: FilterType.EXPRESSION,
              expression: expect.any(Object),
            }),
          ]),
        }),
      }),
    );
  });

  it('should delegate runPresetScan to run_preset_scan with correct payload', async () => {
    const dto: RunPresetScanDto = {
      presetName: 'breakout_52week',
      symbols: ['AAPL', 'MSFT'],
      customParams: { threshold: 5 }
    };

    const presetResult = {
      preset_name: 'breakout_52week',
      matched_stocks: [],
      total_scanned: 2
    };

    mcpService.executeTool.mockResolvedValueOnce(presetResult);

    const result = await service.runPresetScan(dto);

    expect(mcpService.executeTool).toHaveBeenCalledTimes(1);
    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'run_preset_scan',
      payload: {
        preset_name: 'breakout_52week',
        symbols: ['AAPL', 'MSFT'],
        custom_params: { threshold: 5 }
      }
    });
    expect(result).toEqual(presetResult);
  });
});
