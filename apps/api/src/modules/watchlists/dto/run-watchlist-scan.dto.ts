import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { FilterConditionDto, FilterLogic } from '../../common/dto/filter-config.dto';

export class RunWatchlistScanDto {
  @ApiProperty({ description: 'Filters applied to watchlist symbols', type: () => [FilterConditionDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  public readonly filters!: FilterConditionDto[];

  @ApiPropertyOptional({ description: 'Logical operator across filters', enum: FilterLogic, default: FilterLogic.AND })
  @IsOptional()
  @IsEnum(FilterLogic)
  public readonly filterLogic?: FilterLogic;
}
