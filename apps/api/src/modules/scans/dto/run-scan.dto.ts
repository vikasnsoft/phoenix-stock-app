import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { FilterConditionDto, FilterLogic } from '../../common/dto/filter-config.dto';

export class RunScanDto {
  @ApiPropertyOptional({ description: 'Symbols to scan (empty = full universe)', type: [String], example: ['AAPL', 'MSFT'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly symbols?: string[];

  @ApiProperty({ description: 'Filters to evaluate', type: () => [FilterConditionDto] })
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
