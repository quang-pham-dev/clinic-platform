import { ApiProperty } from '@nestjs/swagger';

export class SlotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  doctorId: string;

  @ApiProperty({ example: '2026-01-01' })
  slotDate: string;

  @ApiProperty({ example: '09:00:00' })
  startTime: string;

  @ApiProperty({ example: '09:30:00' })
  endTime: string;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  createdAt: Date;
}
