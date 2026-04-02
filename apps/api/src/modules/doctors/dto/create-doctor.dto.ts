import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({ example: 'doctor.new@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ss123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Dr. Jane Smith' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '555-0100' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Pediatrics' })
  @IsString()
  specialty: string;

  @ApiProperty({ example: 'LIC-123456' })
  @IsString()
  licenseNumber: string;

  @ApiPropertyOptional({ example: 'Pediatrician with 10 years experience.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 200.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAcceptingPatients?: boolean;
}
