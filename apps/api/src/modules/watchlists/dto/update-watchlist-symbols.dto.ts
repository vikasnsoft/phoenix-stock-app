import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString, MinLength } from 'class-validator';

export class UpdateWatchlistSymbolsDto {
  @ApiProperty({ description: 'Complete replacement list of symbols', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  public readonly symbols!: string[];
}
