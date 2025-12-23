import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { FilterConditionDto, FilterLogic } from '../../common/dto/filter-config.dto';

export class RunScanDto {
  @ApiPropertyOptional({ description: 'Symbols to scan (empty = full universe)', type: [String], example: ['AAPL', 'MSFT'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly symbols?: string[];

  @ApiPropertyOptional({ description: 'Skip N symbols when scanning DB universe (only used when symbols is empty)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  public readonly skip?: number;

  @ApiPropertyOptional({ description: 'Take N symbols when scanning DB universe (only used when symbols is empty)', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  public readonly take?: number;

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
