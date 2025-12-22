import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class RunPresetScanDto {
  @ApiProperty({ description: 'Preset scan name', example: 'breakout_52week' })
  @IsString()
  @MinLength(3)
  public readonly presetName!: string;

  @ApiProperty({ description: 'Symbols to evaluate', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  public readonly symbols!: string[];

  @ApiPropertyOptional({ description: 'Optional overrides for preset filter parameters', type: Object })
  @IsOptional()
  @IsObject()
  public readonly customParams?: Record<string, unknown>;
}
