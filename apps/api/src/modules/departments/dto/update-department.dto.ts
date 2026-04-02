import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateDepartmentDto {
  @ApiProperty({ example: 'Cardiology ICU', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'user-uuid', required: false })
  @IsUUID()
  @IsOptional()
  headNurseId?: string | null;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
