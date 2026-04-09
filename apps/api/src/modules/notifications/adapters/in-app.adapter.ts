import { BroadcastGateway } from '@/modules/broadcasts/broadcast.gateway';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InAppAdapter {
  private readonly logger = new Logger(InAppAdapter.name);

  constructor(private readonly broadcastGateway: BroadcastGateway) {}

  /**
   * Emit a notification to a specific user via WebSocket.
   * Returns true if the user was online and received, false if offline.
   */
  async send(dto: {
    userId: string;
    logId: string;
    eventType: string;
    message: string;
    data: Record<string, unknown>;
  }): Promise<boolean> {
    const userRoom = `room:user:${dto.userId}`;
    const room =
      this.broadcastGateway.server.sockets.adapter.rooms.get(userRoom);
    const isOnline = !!room && room.size > 0;

    if (isOnline) {
      this.broadcastGateway.server.to(userRoom).emit('notification', {
        id: dto.logId,
        eventType: dto.eventType,
        message: dto.message,
        data: dto.data,
        createdAt: new Date().toISOString(),
      });
      this.logger.log(
        `In-app notification sent to online user=${dto.userId} event=${dto.eventType}`,
      );
      return true;
    }

    this.logger.log(
      `User ${dto.userId} offline — notification ${dto.logId} marked as unread`,
    );
    return false;
  }
}
