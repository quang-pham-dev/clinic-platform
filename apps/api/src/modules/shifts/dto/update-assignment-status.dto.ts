import { AssignmentStatus } from '@clinic-platform/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAssignmentStatusDto {
  @ApiProperty({
    enum: AssignmentStatus,
    example: AssignmentStatus.CANCELLED,
    description: 'Target status for the transition',
  })
  @IsEnum(AssignmentStatus)
  @IsNotEmpty()
  status: AssignmentStatus;

  @ApiPropertyOptional({
    example: 'Staff called in sick',
    description: 'Required for cancellation transitions',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
