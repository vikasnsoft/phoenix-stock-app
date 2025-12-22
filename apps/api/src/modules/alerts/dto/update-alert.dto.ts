
import { PartialType } from '@nestjs/swagger';
import { CreateAlertDto } from './create-alert.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { AlertStatus } from '@prisma/client';

export class UpdateAlertDto extends PartialType(CreateAlertDto) {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;
}
