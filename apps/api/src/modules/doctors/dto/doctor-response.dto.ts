import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Safe public representation of a Doctor.
 * Excludes internal fields; profile is embedded as a plain shape.
 */
@Exclude()
export class DoctorResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  userId: string;

  @Expose()
  @ApiProperty()
  specialty: string;

  @Expose()
  @ApiPropertyOptional()
  licenseNumber?: string;

  @Expose()
  @ApiPropertyOptional()
  bio?: string;

  @Expose()
  @ApiPropertyOptional()
  consultationFee?: number;

  @Expose()
  @ApiProperty()
  isAcceptingPatients: boolean;

  @Expose()
  @ApiPropertyOptional()
  profile?: { fullName: string } | null;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
