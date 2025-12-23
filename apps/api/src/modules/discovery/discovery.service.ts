import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ClonePublicScanDto } from './dto/clone-public-scan.dto';
import { ListPublicScansQueryDto } from './dto/list-public-scans-query.dto';
import { RatePublicScanDto } from './dto/rate-public-scan.dto';

interface ListPublicScansParams {
  readonly query: ListPublicScansQueryDto;
}

interface GetPublicScanParams {
  readonly id: string;
}

interface ClonePublicScanParams {
  readonly sourceId: string;
  readonly userId: string;
  readonly dto: ClonePublicScanDto;
}

interface RatePublicScanParams {
  readonly savedScanId: string;
  readonly userId: string;
  readonly dto: RatePublicScanDto;
}

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) { }

  public async listPublicScans(params: ListPublicScansParams): Promise<Record<string, unknown>> {
    const skip: number = params.query.skip ?? 0;
    const take: number = params.query.take ?? 20;
    const where: Prisma.SavedScanWhereInput = {
      isPublic: true,
      ...(params.query.category ? { category: params.query.category } : {}),
      ...(params.query.tag ? { tags: { has: params.query.tag } } : {}),
      ...(params.query.search
        ? {
          OR: [
            { name: { contains: params.query.search, mode: 'insensitive' } },
            { description: { contains: params.query.search, mode: 'insensitive' } },
          ],
        }
        : {}),
    };
    const orderBy = this.getOrderBy(params.query.sortBy);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.savedScan.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          tags: true,
          isFeatured: true,
          runCount: true,
          cloneCount: true,
          avgRating: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.savedScan.count({ where }),
    ]);
    return {
      items,
      total,
      skip,
      take,
    };
  }

  public async getPublicScan(params: GetPublicScanParams): Promise<Record<string, unknown>> {
    const scan = await this.prisma.savedScan.findFirst({
      where: { id: params.id, isPublic: true },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        tags: true,
        isFeatured: true,
        runCount: true,
        cloneCount: true,
        avgRating: true,
        definition: true,
        symbolUniverse: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!scan) {
      throw new NotFoundException(`Public scan ${params.id} not found`);
    }
    const ratingCount = await this.prisma.scanRating.count({ where: { savedScanId: params.id } });
    return { ...scan, ratingCount };
  }

  public async clonePublicScan(params: ClonePublicScanParams): Promise<Record<string, unknown>> {
    const source = await this.prisma.savedScan.findFirst({
      where: { id: params.sourceId, isPublic: true },
    });
    if (!source) {
      throw new NotFoundException(`Public scan ${params.sourceId} not found`);
    }
    const clonedName: string = params.dto.name ?? `Copy of ${source.name}`;
    const clonedDescription: string | null = params.dto.description ?? source.description ?? null;
    const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const definition = source.definition as Prisma.InputJsonValue;
      const newScan = await tx.savedScan.create({
        data: {
          userId: params.userId,
          name: clonedName,
          description: clonedDescription,
          definition,
          symbolUniverse: source.symbolUniverse,
          category: source.category,
          tags: source.tags,
          isPublic: false,
          isFeatured: false,
          clonedFromId: source.id,
          versions: {
            create: {
              versionNumber: 1,
              definition,
              comment: 'Cloned from public scan',
            },
          },
        },
      });
      await tx.savedScan.update({
        where: { id: source.id },
        data: { cloneCount: { increment: 1 } },
      });
      return newScan;
    });
    return created as unknown as Record<string, unknown>;
  }

  public async ratePublicScan(params: RatePublicScanParams): Promise<Record<string, unknown>> {
    const existing = await this.prisma.savedScan.findFirst({
      where: { id: params.savedScanId, isPublic: true },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Public scan ${params.savedScanId} not found`);
    }
    const rating = await this.prisma.scanRating.upsert({
      where: { savedScanId_userId: { savedScanId: params.savedScanId, userId: params.userId } },
      create: {
        savedScanId: params.savedScanId,
        userId: params.userId,
        rating: params.dto.rating,
        review: params.dto.review,
      },
      update: {
        rating: params.dto.rating,
        review: params.dto.review,
      },
    });
    const aggregate = await this.prisma.scanRating.aggregate({
      where: { savedScanId: params.savedScanId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const avgRating: number = aggregate._avg.rating ? Number(aggregate._avg.rating) : 0;
    await this.prisma.savedScan.update({
      where: { id: params.savedScanId },
      data: { avgRating },
    });
    return {
      rating,
      avgRating,
      ratingCount: aggregate._count.rating,
    };
  }

  private getOrderBy(sortBy: string | undefined): Prisma.SavedScanOrderByWithRelationInput[] {
    if (sortBy === 'rating') {
      return [{ avgRating: 'desc' }, { runCount: 'desc' }, { updatedAt: 'desc' }];
    }
    if (sortBy === 'popular') {
      return [{ runCount: 'desc' }, { cloneCount: 'desc' }, { updatedAt: 'desc' }];
    }
    if (sortBy === 'featured') {
      return [{ isFeatured: 'desc' }, { updatedAt: 'desc' }];
    }
    return [{ updatedAt: 'desc' }];
  }
}
