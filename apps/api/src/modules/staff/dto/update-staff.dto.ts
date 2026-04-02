import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateStaffDto {
  @ApiProperty({ example: 'new-dept-uuid', required: false })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ example: 'NRS-0046', required: false })
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @ApiProperty({ example: 'Jane Smith Updated', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: '555-0100', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}
