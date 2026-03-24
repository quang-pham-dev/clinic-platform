import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsString, ValidateNested } from 'class-validator';

export class CreateSlotDto {
  @ApiProperty({ example: '2026-11-01' })
  @IsDateString()
  slotDate: string;

  @ApiProperty({ example: '09:00:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '09:30:00' })
  @IsString()
  endTime: string;
}

export class CreateBulkSlotsDto {
  @ApiProperty({ type: [CreateSlotDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateSlotDto)
  slots: CreateSlotDto[];
}
