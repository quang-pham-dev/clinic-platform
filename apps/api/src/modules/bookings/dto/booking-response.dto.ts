import { AppointmentStatus } from '@/common/types/appointment-status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingSlotDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '2024-01-01' })
  slotDate: string;

  @ApiProperty({ example: '09:00:00' })
  startTime: string;

  @ApiProperty({ example: '09:30:00' })
  endTime: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  patientId: string;

  @ApiProperty()
  doctorId: string;

  @ApiProperty()
  slotId: string;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional({ type: () => BookingSlotDto })
  slot?: BookingSlotDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
