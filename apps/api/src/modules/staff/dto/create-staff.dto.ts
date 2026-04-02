import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/** Roles allowed for staff creation */
export enum StaffRole {
  HEAD_NURSE = 'head_nurse',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
}

export class CreateStaffDto {
  @ApiProperty({ example: 'nurse.an@clinic.local' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Nurse@123' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'nurse', enum: StaffRole })
  @IsEnum(StaffRole)
  @IsNotEmpty()
  role: StaffRole;

  @ApiProperty({ example: 'dept-uuid', required: false })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ example: 'Tran Thi An' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '0912345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'NRS-0045', required: false })
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @ApiProperty({ example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  hireDate?: string;
}
