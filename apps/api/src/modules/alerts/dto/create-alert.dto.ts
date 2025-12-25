
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { AlertType } from '@prisma/client';

export class CreateAlertDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEnum(AlertType)
  alertType!: AlertType;

  // We can validate JSON structure via custom validator if needed
  @IsNotEmpty()
  @IsObject()
  condition!: Record<string, unknown>;

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
