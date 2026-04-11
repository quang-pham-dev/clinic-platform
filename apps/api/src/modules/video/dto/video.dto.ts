import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateVideoSessionDto {
  @ApiProperty({ description: 'ID of the confirmed appointment' })
  @IsUUID()
  @IsNotEmpty()
  appointmentId: string;
}

export class SendChatMessageDto {
  @ApiProperty({ description: 'Text message to send in-call' })
  @IsNotEmpty()
  message: string;
}

export class QueryVideoSessionsDto {
  @ApiProperty({ required: false })
  status?: string;

  @ApiProperty({ required: false })
  doctorUserId?: string;

  @ApiProperty({ required: false })
  patientUserId?: string;

  @ApiProperty({ required: false, default: 1 })
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  limit?: number;
}
