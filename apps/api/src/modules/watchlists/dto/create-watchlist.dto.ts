import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWatchlistDto {
  @ApiProperty({ description: 'Display name for the watchlist' })
  @IsString()
  @MinLength(3)
  public readonly name!: string;

  @ApiProperty({ description: 'Ticker symbols belonging to the watchlist', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  public readonly symbols!: string[];

  @ApiPropertyOptional({ description: 'Optional description shown to users' })
  @IsOptional()
  @IsString()
  public readonly description?: string;
}
