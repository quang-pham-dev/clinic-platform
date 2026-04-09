import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class QueryScheduleDto {
  @ApiProperty({ example: '2026-04-01', description: 'Start of date range' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2026-04-07', description: 'End of date range' })
  @IsDateString()
  to: string;
}
