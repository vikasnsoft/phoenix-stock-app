import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { FilterConditionDto, FilterLogic } from '../../common/dto/filter-config.dto';

export class UpdateSavedScanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public readonly name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public readonly description?: string;

  @ApiPropertyOptional({ type: () => [FilterConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  public readonly filters?: FilterConditionDto[];

  @ApiPropertyOptional({ enum: FilterLogic })
  @IsOptional()
  public readonly filterLogic?: FilterLogic;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  public readonly symbols?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public readonly comment?: string;
}
