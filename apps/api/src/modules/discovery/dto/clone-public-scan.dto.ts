import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ClonePublicScanDto {
  @ApiPropertyOptional({ description: 'Optional name for the cloned scan' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  public readonly name?: string;

  @ApiPropertyOptional({ description: 'Optional description for the cloned scan' })
  @IsOptional()
  @IsString()
  public readonly description?: string;
}
