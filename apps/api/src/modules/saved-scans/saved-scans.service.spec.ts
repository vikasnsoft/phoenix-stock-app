import { Test, TestingModule } from '@nestjs/testing';
import { FilterConditionDto, FilterLogic, FilterType } from '../common/dto/filter-config.dto';
import { PrismaService } from '../database/prisma.service';
import { ScansService } from '../scans/scans.service';
import { CreateSavedScanDto } from './dto/create-saved-scan.dto';
import { SavedScansService } from './saved-scans.service';

describe('SavedScansService', () => {
  let service: SavedScansService;
  let prismaService: {
    user: { findFirst: jest.Mock };
    savedScan: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };
  let scansService: { runCustomScan: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      user: { findFirst: jest.fn() },
      savedScan: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };
    scansService = {
      runCustomScan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedScansService,
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

    service = module.get<SavedScansService>(SavedScansService);
  });

  it('should create a saved scan', async () => {
    const filters: FilterConditionDto[] = [
      {
        type: FilterType.INDICATOR,
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

    prismaService.user.findFirst.mockResolvedValue({ id: 'user_1' });
    (prismaService.savedScan.create as any).mockResolvedValue({
      id: 'scan_1',
      name: dto.name,
      description: dto.description,
      definition: { filters: dto.filters, filterLogic: dto.filterLogic },
      symbolUniverse: dto.symbols ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const created = await service.create(dto);
    expect(prismaService.savedScan.create).toHaveBeenCalled();
    expect(created.id).toBe('scan_1');
  });

  it('should list saved scans', async () => {
    prismaService.savedScan.findMany.mockResolvedValue([]);
    const result = await service.findAll();
    expect(prismaService.savedScan.findMany).toHaveBeenCalled();
    expect(result.total_count).toBe(0);
  });

  it('should run a saved scan by id', async () => {
    prismaService.savedScan.findUnique.mockResolvedValue({
      id: 'scan_1',
      name: 'RSI Scan',
      definition: { filters: [], filterLogic: 'AND' },
      symbolUniverse: ['AAPL'],
    });
    scansService.runCustomScan.mockResolvedValue({ matched_stocks: [] });
    await service.runSavedScan('scan_1');
    expect(scansService.runCustomScan).toHaveBeenCalled();
  });

  it('should delete a saved scan by id', async () => {
    prismaService.savedScan.findUnique.mockResolvedValue({ id: 'scan_2' });
    prismaService.savedScan.delete.mockResolvedValue({ id: 'scan_2' });
    const result = await service.deleteSavedScan('scan_2');
    expect(prismaService.savedScan.delete).toHaveBeenCalledWith({ where: { id: 'scan_2' } });
    expect(result.deleted).toBe(true);
  });
});
