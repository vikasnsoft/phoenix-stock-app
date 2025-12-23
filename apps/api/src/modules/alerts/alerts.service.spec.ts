import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../database/prisma.service';

describe('AlertsService', () => {
  let service: AlertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: {
            alert: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            alertHistory: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: getQueueToken('alert-evaluation'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
