import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ParseNaturalLanguageQueryDto {
  @ApiProperty({ description: 'Natural language query to be parsed into filters', example: 'Find stocks with RSI above 70' })
  @IsString()
  @IsNotEmpty()
  query!: string;
}
