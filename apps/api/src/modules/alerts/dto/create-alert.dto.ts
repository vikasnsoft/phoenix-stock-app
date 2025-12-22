
import { IsNotEmpty, IsString, IsEnum, IsBoolean, IsOptional, IsJSON, IsDateString } from 'class-validator';
import { AlertType, AlertStatus } from '@prisma/client';

export class CreateAlertDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEnum(AlertType)
  alertType!: AlertType;

  // We can validate JSON structure via custom validator if needed
  @IsNotEmpty()
  condition: any;

  @IsOptional()
  @IsString()
  ticker?: string;

  @IsOptional()
  @IsBoolean()
  emailNotify?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotify?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
