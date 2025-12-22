import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, ArrayNotEmpty, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ExpressionNodeDto } from './expression.dto';

export enum FilterLogic {
  AND = 'AND',
  OR = 'OR'
}

export enum FilterType {
  PRICE = 'price',
  INDICATOR = 'indicator',
  VOLUME = 'volume',
  PATTERN = 'pattern',
  EXPRESSION = 'expression',
  CUSTOM = 'custom',
  FINANCIAL = 'financial',
  PRICE_CHANGE = 'price_change',
  VOLUME_CHANGE = 'volume_change',
  PRICE_52WEEK = 'price_52week',
  GAP = 'gap',
}

export type FilterValue = number | string | Array<number | string> | Record<string, any>;

export class FilterConditionDto {
  @ApiProperty({ enum: FilterType, description: 'Filter type such as price, indicator, volume, expression' })
  @IsEnum(FilterType)
  public readonly type!: FilterType;

  @ApiPropertyOptional({ description: 'AST Expression for advanced filters' })
  @IsOptional()
  @ValidateNested()

  @Type(() => ExpressionNodeDto)
  public readonly expression?: ExpressionNodeDto;

  @ApiPropertyOptional({ description: 'Field or indicator name' })
  @IsOptional()
  @IsString()
  public readonly field?: string;

  @ApiProperty({ description: 'Comparison operator' })
  @IsString()
  public readonly operator!: string;

  @ApiPropertyOptional({
    description: 'Comparison value (number, string, range array, or indicator object)',
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'array', items: { oneOf: [{ type: 'string' }, { type: 'number' }] } },
      { type: 'object' },
    ],
  })
  @IsOptional()
  @Allow()
  public readonly value?: FilterValue;

  @ApiPropertyOptional({ description: 'Indicator time period' })
  @IsOptional()
  @IsInt()
  @Min(1)
  public readonly timePeriod?: number;

  @ApiPropertyOptional({ description: 'Offset from the latest candle' })
  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly offset?: number;

  @ApiPropertyOptional({ description: 'Average period used for volume comparisons' })
  @IsOptional()
  @IsInt()
  @Min(1)
  public readonly avgPeriod?: number;

  @ApiPropertyOptional({ description: 'Multiplier for comparative calculations' })
  @IsOptional()
  @IsNumber()
  public readonly multiplier?: number;

  @ApiPropertyOptional({ description: 'Generic lookback window' })
  @IsOptional()
  @IsInt()
  @Min(1)
  public readonly lookback?: number;

  @ApiPropertyOptional({ description: 'Lookback window in trading days (e.g., 252)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  public readonly lookbackDays?: number;

  @ApiPropertyOptional({ description: 'Custom metric identifier used by advanced filters' })
  @IsOptional()
  @IsString()
  public readonly metric?: string;

  @ApiPropertyOptional({ description: 'Candlestick pattern name used by pattern filters (e.g., hammer)' })
  @IsOptional()
  @IsString()
  public readonly pattern?: string;

  @ApiPropertyOptional({ description: 'Timeframe identifier for the condition (e.g., daily, 15min)' })
  @IsOptional()
  @IsString()
  public readonly timeframe?: string;

  @ApiPropertyOptional({ description: 'Optional nested filters for composite criteria', type: () => [FilterConditionDto] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  public readonly filters?: FilterConditionDto[];
}
