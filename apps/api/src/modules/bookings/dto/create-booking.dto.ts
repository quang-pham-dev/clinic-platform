import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the available time slot',
  })
  @IsUUID()
  slotId: string;

  @ApiPropertyOptional({
    example: 'I have a mild fever',
    description: 'Optional notes for the doctor',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
