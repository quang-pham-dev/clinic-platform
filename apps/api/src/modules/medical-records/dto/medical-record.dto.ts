import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateMedicalRecordDto {
  @IsUUID()
  appointmentId: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  prescription?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @IsBoolean()
  @IsOptional()
  isVisibleToPatient?: boolean;
}

export class UpdateMedicalRecordDto {
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  prescription?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  followUpDate?: string;

  @IsBoolean()
  @IsOptional()
  isVisibleToPatient?: boolean;
}
