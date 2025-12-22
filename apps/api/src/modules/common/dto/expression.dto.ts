import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export enum NodeType {
  ATTRIBUTE = 'attribute',
  INDICATOR = 'indicator',
  CONSTANT = 'constant',
  BINARY = 'binary',
  FUNCTION = 'function',
  UNARY = 'unary',
}

export class ExpressionNodeDto {
  @ApiProperty({ enum: NodeType })
  @IsEnum(NodeType)
  type!: NodeType;

  // Attribute / Indicator
  @ApiPropertyOptional({ oneOf: [{ type: 'string' }, { type: 'object' }] })
  @IsOptional()
  // Allow string or object (for indicators)
  // @IsString() removed to allow object
  field?: string | Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  time_period?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  offset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeframe?: string;

  // Constant
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  value?: number;

  // Binary / Unary
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({ type: () => ExpressionNodeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpressionNodeDto)
  left?: ExpressionNodeDto;

  @ApiPropertyOptional({ type: () => ExpressionNodeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpressionNodeDto)
  right?: ExpressionNodeDto;

  // Unary Operand
  @ApiPropertyOptional({ type: () => ExpressionNodeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpressionNodeDto)
  operand?: ExpressionNodeDto;

  // Function
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: () => [ExpressionNodeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpressionNodeDto)
  args?: ExpressionNodeDto[];
}
