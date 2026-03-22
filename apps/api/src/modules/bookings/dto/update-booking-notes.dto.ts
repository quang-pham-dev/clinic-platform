import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateBookingNotesDto {
  @ApiProperty({ example: 'Patient has a history of asthma.' })
  @IsString()
  notes: string;
}
