import type { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';

export interface BroadcastPayload {
  id: string;
  message: string;
  targetRoom: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
  sentAt: string;
}

export interface ShiftUpdatedPayload {
  assignmentId: string;
  action: 'created' | 'updated' | 'cancelled';
  shiftDate: string;
  template: { name: string; startTime: string; endTime: string };
  status: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // In production, configure via env
  },
})
export class BroadcastGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Attach Redis pub/sub adapter after the WS server is initialised.
   * This enables horizontal scaling — room membership is shared across processes.
   * Gracefully skips if Redis is unreachable (useful in local dev without Redis).
   */
  async afterInit(server: Server) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      const redisOpts = {
        host,
        port,
        ...(password ? { password } : {}),
        keyPrefix: 'ws:',
        lazyConnect: true,
      };
      const pubClient = new Redis(redisOpts);
      const subClient = pubClient.duplicate();

      await pubClient.connect();
      await subClient.connect();

      server.adapter(createAdapter(pubClient, subClient));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[BroadcastGateway] Redis adapter unavailable, using in-memory: ${msg}`,
      );
    }
  }

  async handleConnection(client: Socket) {
    const token = (client.handshake.auth?.token ??
      client.handshake.headers?.authorization?.replace('Bearer ', '')) as
      | string
      | undefined;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload: JwtPayload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.accessSecret') ?? '',
      });

      // Determine rooms based on role
      const rooms: string[] = ['room:all'];

      switch (payload.role) {
        case Role.ADMIN:
          // Admin sees everything
          rooms.push('room:doctors', 'room:nurses', 'room:receptionists');
          break;
        case Role.DOCTOR:
          rooms.push('room:doctors');
          break;
        case Role.HEAD_NURSE:
        case Role.NURSE:
          rooms.push('room:nurses');
          break;
        case Role.RECEPTIONIST:
          rooms.push('room:receptionists');
          break;
      }

      // Department-scoped room
      if (payload.departmentId) {
        rooms.push(`room:dept:${payload.departmentId}`);
      }

      // Personal room for targeted events (shift updates)
      rooms.push(`room:user:${payload.sub}`);

      // Join all rooms
      await client.join(rooms);

      // Store user info on socket for later use
      client.data.user = payload;
      client.data.rooms = rooms;
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(_client: Socket) {
    // Redis adapter auto-cleans room membership on disconnect
  }

  /**
   * Emit a broadcast message to a target room.
   * Called by BroadcastsService after DB persist.
   */
  emitBroadcast(targetRoom: string, payload: BroadcastPayload) {
    this.server.to(targetRoom).emit('broadcast', payload);
  }

  /**
   * Emit a shift update event to a specific staff user.
   * Called by ShiftsService after status change.
   */
  emitShiftUpdated(staffUserId: string, payload: ShiftUpdatedPayload) {
    this.server.to(`room:user:${staffUserId}`).emit('shift_updated', payload);
  }
}
