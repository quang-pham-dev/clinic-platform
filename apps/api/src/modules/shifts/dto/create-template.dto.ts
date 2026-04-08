import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Morning shift' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '07:00', description: 'HH:mm format' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @ApiProperty({ example: '15:00', description: 'HH:mm format' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime: string;

  @ApiPropertyOptional({ example: '#4A90D9' })
  @IsOptional()
  @IsHexColor()
  colorHex?: string;
}
