import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FilterConditionDto, FilterLogic } from '../../common/dto/filter-config.dto';

export class SavedScanDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ type: [FilterConditionDto] })
  filters!: FilterConditionDto[];

  @ApiPropertyOptional({ enum: FilterLogic })
  filter_logic?: FilterLogic;

  @ApiProperty({ type: [String] })
  symbols!: string[];

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}
