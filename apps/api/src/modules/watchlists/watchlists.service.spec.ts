import { Test, TestingModule } from '@nestjs/testing';
import { FilterConditionDto, FilterLogic, FilterType } from '../common/dto/filter-config.dto';
import { PrismaService } from '../database/prisma.service';
import { ScansService } from '../scans/scans.service';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateWatchlistSymbolsDto } from './dto/update-watchlist-symbols.dto';
import { RunWatchlistScanDto } from './dto/run-watchlist-scan.dto';
import { WatchlistsService } from './watchlists.service';

describe('WatchlistsService', () => {
  let service: WatchlistsService;
  let prismaService: {
    user: { findFirst: jest.Mock };
    watchlist: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    watchlistSymbol: { deleteMany: jest.Mock };
  };
  let scansService: { runCustomScan: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      user: { findFirst: jest.fn() },
      watchlist: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      watchlistSymbol: { deleteMany: jest.fn() },
    };
    scansService = {
      runCustomScan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: ScansService,
          useValue: scansService,
        },
      ]
    }).compile();

    service = module.get<WatchlistsService>(WatchlistsService);
  });

  it('should create a watchlist', async () => {
    const dto: CreateWatchlistDto = {
      name: 'My Watchlist',
      symbols: ['AAPL', 'MSFT'],
      description: 'test list'
    };
    prismaService.user.findFirst.mockResolvedValue({ id: 'user_1' });
    prismaService.watchlist.create.mockResolvedValue({
      id: 'wl_1',
      name: dto.name,
      description: dto.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      symbols: dto.symbols.map((ticker: string) => ({ symbol: { ticker } })),
    });
    const created = await service.create(dto);
    expect(prismaService.watchlist.create).toHaveBeenCalled();
    expect(created.id).toBe('wl_1');
  });

  it('should list watchlists', async () => {
    prismaService.watchlist.findMany.mockResolvedValue([]);
    const result = await service.findAll();
    expect(prismaService.watchlist.findMany).toHaveBeenCalled();
    expect(result.total_count).toBe(0);
  });

  it('should update symbols', async () => {
    const dto: UpdateWatchlistSymbolsDto = {
      symbols: ['GOOGL', 'TSLA']
    };
    prismaService.watchlist.findFirst.mockResolvedValue({ id: 'wl_1' });
    prismaService.watchlist.update.mockResolvedValue({
      id: 'wl_1',
      name: 'My Watchlist',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      symbols: dto.symbols.map((ticker: string) => ({ symbol: { ticker } })),
    });
    const updated = await service.updateSymbols('wl_1', dto.symbols);
    expect(prismaService.watchlistSymbol.deleteMany).toHaveBeenCalledWith({ where: { watchlistId: 'wl_1' } });
    expect(updated.symbols).toEqual(dto.symbols);
  });

  it('should run a watchlist scan', async () => {
    const filters: FilterConditionDto[] = [
      {
        type: FilterType.PRICE,
        field: 'close',
        operator: 'gt',
        value: 0
      }
    ];

    const dto: RunWatchlistScanDto = {
      filters,
      filterLogic: FilterLogic.AND
    };

    prismaService.watchlist.findFirst.mockResolvedValue({
      id: 'wl_3',
      name: 'WL',
      symbols: [{ symbol: { ticker: 'AAPL' } }],
    });
    scansService.runCustomScan.mockResolvedValue({ matched_stocks: [] });
    await service.runWatchlistScan('wl_3', dto);
    expect(scansService.runCustomScan).toHaveBeenCalledWith({
      symbols: ['AAPL'],
      filters: dto.filters,
      filterLogic: dto.filterLogic,
    });
  });
});
