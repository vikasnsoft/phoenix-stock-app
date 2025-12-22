import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { FilterConditionDto, FilterLogic } from '../../common/dto/filter-config.dto';

export class CreateSavedScanDto {
  @ApiProperty({ description: 'Saved scan name' })
  @IsString()
  @MinLength(3)
  public readonly name!: string;

  @ApiProperty({ description: 'Filter definitions applied when running this scan', type: () => [FilterConditionDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  public readonly filters!: FilterConditionDto[];

  @ApiPropertyOptional({ description: 'Logical operator for combining filters', enum: FilterLogic, default: FilterLogic.AND })
  @IsOptional()
  @IsEnum(FilterLogic)
  public readonly filterLogic?: FilterLogic;

  @ApiPropertyOptional({ description: 'Default symbols to evaluate', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  public readonly symbols?: string[];

  @ApiPropertyOptional({ description: 'Optional description shown in UI' })
  @IsOptional()
  @IsString()
  public readonly description?: string;
}
