import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BacktestStatus, Timeframe } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ScansService } from '../scans/scans.service';
import { CreateBacktestDto } from './dto/create-backtest.dto';

interface CreateBacktestResult {
  id: string;
  status: BacktestStatus;
}

interface BacktestSummary {
  id: string;
  name: string;
  status: BacktestStatus;
  startDate: Date;
  endDate: Date;
  totalMatches: number | null;
  createdAt: Date;
  completedAt: Date | null;
}

import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class BacktestsService {
  private readonly logger = new Logger(BacktestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scansService: ScansService,
    @InjectQueue('backtest-execution') private readonly backtestQueue: Queue,
  ) { }

  async create(dto: CreateBacktestDto, userId: string): Promise<CreateBacktestResult> {
    const backtest = await this.prisma.backtest.create({
      data: {
        userId,
        savedScanId: dto.savedScanId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        timeframe: dto.timeframe ?? Timeframe.DAY_1,
        definition: dto.definition,
        status: BacktestStatus.PENDING,
      },
    });

    // Dispatch job to queue instead of inline execution
    await this.backtestQueue.add('execute', { backtestId: backtest.id });

    return { id: backtest.id, status: BacktestStatus.PENDING };
  }

  // Renamed to public for Worker access
  async executeBacktestPublic(backtestId: string): Promise<void> {
    this.logger.log(`Starting backtest ${backtestId}`);

    await this.prisma.backtest.update({
      where: { id: backtestId },
      data: { status: BacktestStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const backtest = await this.prisma.backtest.findUnique({
        where: { id: backtestId },
      });

      if (!backtest) {
        throw new Error('Backtest not found');
      }

      const definition = backtest.definition as any;
      const symbols: string[] = definition.symbols ?? ['AAPL'];

      const signals: any[] = [];
      let currentDate: Date = new Date(backtest.startDate);
      const endDate: Date = new Date(backtest.endDate);

      while (currentDate <= endDate) {
        const result = await this.scansService.runCustomScan({
          symbols,
          filters: definition.filters,
          filterLogic: definition.filterLogic ?? 'AND',
        } as any);

        const matched = (result as any).matched_stocks ?? [];

        for (const stock of matched) {
          signals.push({
            date: currentDate.toISOString().split('T')[0],
            symbol: stock.symbol,
            type: 'BUY',
            price: stock.close,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalMatches: number = signals.length;
      const uniqueSymbols: number = new Set(signals.map((s) => s.symbol)).size;

      const results = {
        signals,
        summary: {
          totalSignals: totalMatches,
          uniqueSymbols,
          dateRange: {
            start: backtest.startDate.toISOString().split('T')[0],
            end: backtest.endDate.toISOString().split('T')[0],
          },
        },
      };

      await this.prisma.backtest.update({
        where: { id: backtestId },
        data: {
          status: BacktestStatus.COMPLETED,
          results,
          totalMatches,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Backtest ${backtestId} completed: ${totalMatches} signals`);
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);

      this.logger.error(`Backtest ${backtestId} failed: ${message}`);

      await this.prisma.backtest.update({
        where: { id: backtestId },
        data: {
          status: BacktestStatus.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        },
      });
    }
  }

  async findAll(userId: string): Promise<{ backtests: BacktestSummary[] }> {
    const backtests = await this.prisma.backtest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        totalMatches: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return { backtests };
  }

  async findOne(id: string, userId: string): Promise<any> {
    const backtest = await this.prisma.backtest.findFirst({
      where: { id, userId },
    });

    if (!backtest) {
      throw new NotFoundException(`Backtest ${id} not found`);
    }

    return backtest;
  }
}
