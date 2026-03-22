import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateDoctorDto {
  @ApiPropertyOptional({ example: 'Cardiology' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ example: 'Experienced cardiologist with 15 years' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAcceptingPatients?: boolean;
}
