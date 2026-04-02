import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Cardiology Ward', description: 'Department name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Handles cardiovascular patients',
    description: 'Department description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
