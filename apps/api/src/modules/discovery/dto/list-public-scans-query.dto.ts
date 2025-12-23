import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ScanCategory } from '@prisma/client';

type PublicScanSortBy = 'newest' | 'popular' | 'rating' | 'featured';
const publicScanSortByValues: readonly PublicScanSortBy[] = ['newest', 'popular', 'rating', 'featured'] as const;

export class ListPublicScansQueryDto {
  @ApiPropertyOptional({ description: 'Search by scan name or description' })
  @IsOptional()
  @IsString()
  public readonly search?: string;

  @ApiPropertyOptional({ enum: ScanCategory, description: 'Filter by scan category' })
  @IsOptional()
  @IsEnum(ScanCategory)
  public readonly category?: ScanCategory;

  @ApiPropertyOptional({ description: 'Filter by tag (exact match)' })
  @IsOptional()
  @IsString()
  public readonly tag?: string;

  @ApiPropertyOptional({ enum: publicScanSortByValues, default: 'newest' })
  @IsOptional()
  @IsIn(publicScanSortByValues)
  public readonly sortBy?: PublicScanSortBy;

  @ApiPropertyOptional({ description: 'Pagination skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public readonly skip?: number;

  @ApiPropertyOptional({ description: 'Pagination take', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly take?: number;
}
