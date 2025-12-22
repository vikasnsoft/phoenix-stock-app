import { ApiProperty } from '@nestjs/swagger';
import { Symbol, Exchange } from '@prisma/client';

export class SymbolDto implements Symbol {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ticker!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: Exchange })
  exchange!: Exchange;

  @ApiProperty({ required: false, nullable: true, type: String })
  sector!: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  industry!: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  marketCap!: bigint | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false, nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  website!: string | null;

  @ApiProperty({ required: false, nullable: true })
  ipo!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  delistDate!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  lastSyncedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class SymbolListResponseDto {
  @ApiProperty({ type: [SymbolDto] })
  symbols!: SymbolDto[];

  @ApiProperty()
  total!: number;
}
