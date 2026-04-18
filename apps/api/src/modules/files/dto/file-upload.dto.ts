import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FileUploadDto {
  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
