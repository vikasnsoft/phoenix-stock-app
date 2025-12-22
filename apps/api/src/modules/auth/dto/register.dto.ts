import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "user@example.com", description: "User email address" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email!: string;

  @ApiProperty({ example: "SecurePass123!", description: "Password (min 8 characters)" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(100, { message: "Password must be at most 100 characters long" })
  password!: string;

  @ApiPropertyOptional({ example: "John Doe", description: "User display name" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
