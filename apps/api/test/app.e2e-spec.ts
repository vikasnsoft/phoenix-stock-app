import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MCPService, McpToolRequest } from '../src/mcp/mcp.service';

interface MockMcpService {
  executeTool: jest.Mock<Promise<unknown>, [McpToolRequest<Record<string, unknown>>]>;
}

describe('AppModule e2e', () => {
  let app: INestApplication;
  let mcpService: MockMcpService;

  beforeAll(async () => {
    mcpService = {
      executeTool: jest.fn()
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(MCPService)
      .useValue(mcpService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /scans/run should wrap MCP scan_stocks response', async () => {
    const mcpResult = { matched_stocks: [], total_scanned: 2 };
    mcpService.executeTool.mockResolvedValueOnce(mcpResult);

    const response = await request(app.getHttpServer())
      .post('/scans/run')
      .send({
        symbols: ['AAPL', 'MSFT'],
        filters: [{ type: 'price', field: 'close', operator: 'gt', value: 0 }],
        filterLogic: 'AND'
      })
      .expect(201);

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

    expect(response.body).toEqual({ data: mcpResult, error: null });
  });

  it('POST /watchlists should create a watchlist using MCP tool', async () => {
    const mcpResult = {
      id: 'wl_test',
      name: 'Tech',
      symbols: ['AAPL', 'MSFT'],
      description: 'test list'
    };

    mcpService.executeTool.mockResolvedValueOnce(mcpResult);

    const response = await request(app.getHttpServer())
      .post('/watchlists')
      .send({
        name: 'Tech',
        symbols: ['AAPL', 'MSFT'],
        description: 'test list'
      })
      .expect(201);

    expect(mcpService.executeTool).toHaveBeenCalledWith({
      toolName: 'create_watchlist',
      payload: {
        name: 'Tech',
        symbols: ['AAPL', 'MSFT'],
        description: 'test list'
      }
    });
    expect(response.body).toEqual({ data: mcpResult, error: null });
  });

  it('POST /saved-scans should create a saved scan using MCP tool', async () => {
    const mcpResult = {
      id: 'scan_test',
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
      symbols: ['AAPL'],
      description: 'test scan'
    };

    mcpService.executeTool.mockResolvedValueOnce(mcpResult);

    const response = await request(app.getHttpServer())
      .post('/saved-scans')
      .send({
        name: 'RSI Scan',
        filters: [
          {
            type: 'indicator',
            field: 'RSI',
            operator: 'gt',
            value: 40,
            timePeriod: 14
          }
        ],
        filterLogic: 'AND',
        symbols: ['AAPL'],
        description: 'test scan'
      })
      .expect(201);

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
        symbols: ['AAPL'],
        description: 'test scan'
      }
    });
    expect(response.body).toEqual({ data: mcpResult, error: null });
  });
});
