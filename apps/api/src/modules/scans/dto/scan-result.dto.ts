import { ApiProperty } from '@nestjs/swagger';

export class ScanResultDto {
  @ApiProperty()
  total_count!: number;

  @ApiProperty({ type: [Object] })
  results!: any[];

  @ApiProperty({ required: false })
  watchlist_identifier?: string;

  @ApiProperty({ required: false })
  saved_scan_identifier?: string;

  @ApiProperty({ required: false })
  saved_scan_id?: string;
}
