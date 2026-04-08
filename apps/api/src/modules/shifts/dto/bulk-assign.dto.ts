import { CreateAssignmentDto } from './create-assignment.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';

export class BulkAssignDto {
  @ApiProperty({ type: [CreateAssignmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAssignmentDto)
  assignments: CreateAssignmentDto[];
}
