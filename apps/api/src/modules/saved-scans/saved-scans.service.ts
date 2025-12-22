import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ScansService } from '../scans/scans.service';
import { mapFilters } from '../common/filter-mapper';
import { CreateSavedScanDto } from './dto/create-saved-scan.dto';
import { SavedScanDto } from './dto/saved-scan.dto';
import { ScanResultDto } from '../scans/dto/scan-result.dto';
import { FilterConditionDto } from '../common/dto/filter-config.dto';
import { UpdateSavedScanDto } from './dto/update-saved-scan.dto';

@Injectable()
export class SavedScansService {
  private readonly logger = new Logger(SavedScansService.name);

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

  async getVersions(scanId: string): Promise<{ id: string; versionNumber: number; createdAt: Date; comment: string | null }[]> {
    const versions = await (this.prisma as any).savedScanVersion.findMany({
      where: { savedScanId: scanId },
      orderBy: { versionNumber: 'desc' }
    });

    return versions.map((v: any) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      createdAt: v.createdAt,
      comment: v.comment ?? null
    }));
  }

  async create(createSavedScanDto: CreateSavedScanDto): Promise<SavedScanDto> {
    const user = await this.getDefaultUser();

    const definition = {
      filters: createSavedScanDto.filters,
      filterLogic: createSavedScanDto.filterLogic
    } as any;

    const savedScan = await (this.prisma as any).savedScan.create({
      data: {
        name: createSavedScanDto.name,
        description: createSavedScanDto.description,
        userId: user.id,
        definition,
        symbolUniverse: createSavedScanDto.symbols || [],
        versions: {
          create: {
            versionNumber: 1,
            definition,
            comment: 'Initial version'
          }
        }
      }
    });

    return this.mapSavedScan(savedScan);
  }

  async update(id: string, dto: UpdateSavedScanDto): Promise<SavedScanDto> {
    const existing = await (this.prisma as any).savedScan.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Saved scan ${id} not found`);
    }

    const latestVersion = (existing as any).versions?.[0];
    const nextVersionNumber: number = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const currentDefinition = existing.definition as any;
    const nextFilters = dto.filters ?? currentDefinition.filters;
    const nextFilterLogic = dto.filterLogic ?? currentDefinition.filterLogic;

    const updated = await (this.prisma as any).savedScan.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        definition: {
          filters: nextFilters,
          filterLogic: nextFilterLogic
        } as any,
        symbolUniverse: dto.symbols ?? existing.symbolUniverse,
        versions: {
          create: {
            versionNumber: nextVersionNumber,
            definition: {
              filters: nextFilters,
              filterLogic: nextFilterLogic
            } as any,
            comment: dto.comment ?? `Version ${nextVersionNumber}`
          }
        }
      }
    });

    return this.mapSavedScan(updated);
  }

  async findAll(): Promise<{ scans: Record<string, unknown>, order: string[], total_count: number }> {
    const scans = await this.prisma.savedScan.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    return {
      scans: scans.reduce((acc: Record<string, unknown>, scan) => {
        acc[scan.id] = this.mapSavedScan(scan);
        return acc;
      }, {} as Record<string, unknown>),
      order: scans.map(s => s.id),
      total_count: scans.length
    };
  }

  public async runSavedScan(identifier: string): Promise<Record<string, unknown>> {
    this.logger.debug(`Running saved scan ${identifier}`);

    let savedScan = await this.prisma.savedScan.findUnique({ where: { id: identifier } });
    if (!savedScan) {
      const user = await this.getDefaultUser();
      savedScan = await this.prisma.savedScan.findFirst({
        where: { name: identifier, userId: user.id }
      });
    }

    if (!savedScan) {
      throw new NotFoundException(`Saved scan ${identifier} not found`);
    }

    const definition = savedScan.definition as any;
    const filters = definition.filters || [];
    const filterLogic = definition.filterLogic || 'AND';
    const symbols = savedScan.symbolUniverse;

    // Delegate to ScansService
    const result = await this.scansService.runCustomScan({
      symbols,
      filters, // Already mapped in definition? No, mapFilters returns FilterConditionDto[]?
      // Wait, mapFilters returns FilterConditionDto[].
      // But ScansService.runCustomScan expects RunScanDto which has filters: FilterConditionDto[].
      // So if I stored mapped filters, I might need to unmap or just pass them if they match.
      // Let's check mapFilters.
      filterLogic
    });

    return {
      ...result,
      saved_scan_identifier: identifier,
      saved_scan_id: savedScan.id
    };
  }

  public async deleteSavedScan(identifier: string): Promise<Record<string, unknown>> {
    this.logger.debug(`Deleting saved scan ${identifier}`);

    let savedScan = await this.prisma.savedScan.findUnique({ where: { id: identifier } });
    if (!savedScan) {
      const user = await this.getDefaultUser();
      savedScan = await this.prisma.savedScan.findFirst({
        where: { name: identifier, userId: user.id }
      });
    }

    if (!savedScan) {
      throw new NotFoundException(`Saved scan ${identifier} not found`);
    }

    await this.prisma.savedScan.delete({ where: { id: savedScan.id } });

    return { id: savedScan.id, deleted: true };
  }

  private mapSavedScan(scan: any) {
    const definition = scan.definition as any;
    return {
      id: scan.id,
      name: scan.name,
      description: scan.description,
      filters: definition.filters,
      filter_logic: definition.filterLogic,
      symbols: scan.symbolUniverse,
      created_at: scan.createdAt,
      updated_at: scan.updatedAt
    };
  }
}
