import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateBroadcastDto {
  @ApiProperty({
    description:
      'Target WebSocket room (room:all, room:nurses, room:doctors, room:receptionists, room:dept:{uuid})',
    example: 'room:nurses',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^room:(all|nurses|doctors|receptionists|dept:[0-9a-f-]+)$/, {
    message:
      'targetRoom must be one of: room:all, room:nurses, room:doctors, room:receptionists, room:dept:{uuid}',
  })
  targetRoom: string;

  @ApiProperty({
    description: 'Broadcast message content',
    example: 'Emergency drill in 30 minutes. All nursing staff to Station 3.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
