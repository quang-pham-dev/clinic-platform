import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'uuid', description: 'The staff member user ID' })
  @IsUUID()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({ example: 'uuid', description: 'Shift template ID' })
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    example: '2026-04-01',
    description: 'Date of the shift (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  shiftDate: string;

  @ApiPropertyOptional({ example: 'Cover for sick leave' })
  @IsOptional()
  @IsString()
  notes?: string;
}
