import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ScansService } from '../scans/scans.service';
import { mapFilters } from '../common/filter-mapper';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateWatchlistSymbolsDto } from './dto/update-watchlist-symbols.dto';
import { RunWatchlistScanDto } from './dto/run-watchlist-scan.dto';
import { WatchlistDto } from './dto/watchlist.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import { ScanResultDto } from '../scans/dto/scan-result.dto';
import { FilterConditionDto } from '../common/dto/filter-config.dto';
import { Exchange } from '@prisma/client';

@Injectable()
export class WatchlistsService {
  private readonly logger = new Logger(WatchlistsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scansService: ScansService
  ) { }

  private async getDefaultUser() {
    const user = await this.prisma.user.findFirst();
    if (!user) {
      throw new NotFoundException('No default user found');
    }
    return user;
  }

  async create(createWatchlistDto: CreateWatchlistDto): Promise<WatchlistDto> {
    const user = await this.getDefaultUser();

    // Create watchlist
    const watchlist = await this.prisma.watchlist.create({
      data: {
        name: createWatchlistDto.name,
        description: createWatchlistDto.description,
        userId: user.id,
        symbols: {
          create: createWatchlistDto.symbols.map(ticker => ({
            symbol: {
              connectOrCreate: {
                where: { ticker },
                create: { ticker, name: ticker, exchange: Exchange.OTHER } // Basic symbol creation
              }
            }
          }))
        }
      },
      include: {
        symbols: {
          include: {
            symbol: true
          }
        }
      }
    });

    return this.mapWatchlist(watchlist);
  }

  async findAll(): Promise<{ watchlists: Record<string, WatchlistDto>, order: string[], total_count: number }> {
    const watchlists = await this.prisma.watchlist.findMany({
      include: {
        symbols: {
          include: {
            symbol: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return {
      watchlists: watchlists.reduce((acc: Record<string, WatchlistDto>, wl) => {
        acc[wl.id] = this.mapWatchlist(wl);
        return acc;
      }, {} as Record<string, WatchlistDto>),
      order: watchlists.map(wl => wl.id),
      total_count: watchlists.length
    };
  }

  async findOne(id: string): Promise<WatchlistDto> {
    const watchlist = await this.prisma.watchlist.findUnique({
      where: { id },
      include: {
        symbols: {
          include: {
            symbol: true
          }
        }
      }
    });

    if (!watchlist) {
      throw new NotFoundException(`Watchlist with ID ${id} not found`);
    }

    return this.mapWatchlist(watchlist);
  }

  async update(id: string, updateWatchlistDto: UpdateWatchlistDto): Promise<WatchlistDto> {
    // Check if exists
    await this.findOne(id);

    const data: any = {
      name: updateWatchlistDto.name,
      description: updateWatchlistDto.description,
    };

    if (updateWatchlistDto.symbols) {
      // Replace symbols
      // First delete existing relations
      await this.prisma.watchlistSymbol.deleteMany({
        where: { watchlistId: id }
      });

      // Then create new ones
      data.symbols = {
        create: updateWatchlistDto.symbols.map(ticker => ({
          symbol: {
            connectOrCreate: {
              where: { ticker },
              create: { ticker, name: ticker, exchange: Exchange.OTHER }
            }
          }
        }))
      };
    }

    const watchlist = await this.prisma.watchlist.update({
      where: { id },
      data,
      include: {
        symbols: {
          include: {
            symbol: true
          }
        }
      }
    });

    return this.mapWatchlist(watchlist);
  }

  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    await this.findOne(id); // Ensure exists

    await this.prisma.watchlist.delete({
      where: { id }
    });

    return { id, deleted: true };
  }

  async updateSymbols(identifier: string, symbols: string[]): Promise<WatchlistDto> {
    // Resolve identifier (ID or Name)
    let watchlist = await this.prisma.watchlist.findFirst({
      where: {
        OR: [
          { id: identifier },
          { name: identifier }
        ]
      }
    });

    if (!watchlist) {
      throw new NotFoundException(`Watchlist '${identifier}' not found`);
    }

    // Update symbols
    await this.prisma.watchlistSymbol.deleteMany({
      where: { watchlistId: watchlist.id }
    });

    watchlist = await this.prisma.watchlist.update({
      where: { id: watchlist.id },
      data: {
        symbols: {
          create: symbols.map(ticker => ({
            symbol: {
              connectOrCreate: {
                where: { ticker },
                create: { ticker, name: ticker, exchange: Exchange.OTHER }
              }
            }
          }))
        }
      },
      include: {
        symbols: {
          include: {
            symbol: true
          }
        }
      }
    });

    return this.mapWatchlist(watchlist);
  }

  async runWatchlistScan(identifier: string, dto: RunWatchlistScanDto): Promise<ScanResultDto> {
    // Get watchlist symbols
    const watchlist = await this.prisma.watchlist.findFirst({
      where: {
        OR: [
          { id: identifier },
          { name: identifier }
        ]
      },
      include: {
        symbols: {
          include: {
            symbol: true
          }
        }
      }
    });

    if (!watchlist) {
      throw new NotFoundException(`Watchlist '${identifier}' not found`);
    }

    const symbols = watchlist.symbols.map(ws => ws.symbol.ticker);

    if (symbols.length === 0) {
      throw new BadRequestException(`Watchlist '${watchlist.name}' is empty`);
    }

    // Run scan using ScansService
    const result = await this.scansService.runCustomScan({
      symbols,
      filters: dto.filters,
      filterLogic: dto.filterLogic
    }) as unknown as ScanResultDto;
    return {
      ...result,
      watchlist_identifier: identifier
    };
  }

  private mapWatchlist(wl: any) {
    return {
      id: wl.id,
      name: wl.name,
      description: wl.description,
      symbols: wl.symbols.map((ws: { symbol: { ticker: string } }) => ws.symbol.ticker),
      created_at: wl.createdAt,
      updated_at: wl.updatedAt
    };
  }
}
