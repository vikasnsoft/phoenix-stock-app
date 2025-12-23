import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RatePublicScanDto {
  @ApiProperty({ description: 'Rating 1-5' })
  @IsInt()
  @Min(1)
  @Max(5)
  public readonly rating!: number;

  @ApiPropertyOptional({ description: 'Optional review text' })
  @IsOptional()
  @IsString()
  public readonly review?: string;
}
