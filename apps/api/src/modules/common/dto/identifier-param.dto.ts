import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class IdentifierParamDto {
  @ApiProperty({ description: 'Resource identifier or friendly name' })
  @IsString()
  @MinLength(3)
  public readonly identifier!: string;
}
