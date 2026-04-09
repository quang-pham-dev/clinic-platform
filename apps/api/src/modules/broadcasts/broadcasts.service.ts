import type { BroadcastPayload } from './broadcast.gateway';
import { BroadcastGateway } from './broadcast.gateway';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { BroadcastMessage } from './entities/broadcast-message.entity';
import type { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

@Injectable()
export class BroadcastsService {
  constructor(
    @InjectRepository(BroadcastMessage)
    private readonly broadcastRepo: Repository<BroadcastMessage>,
    private readonly gateway: BroadcastGateway,
  ) {}

  /**
   * Send a broadcast message.
   * 1. Validate room access
   * 2. Persist to DB
   * 3. Emit via WebSocket
   */
  async send(
    dto: CreateBroadcastDto,
    actor: JwtPayload,
  ): Promise<BroadcastMessage> {
    // ── Room access validation ──
    this.validateRoomAccess(dto.targetRoom, actor);

    // ── Persist first (survive gateway crash) ──
    const message = this.broadcastRepo.create({
      senderId: actor.sub,
      senderRole: actor.role,
      targetRoom: dto.targetRoom,
      message: dto.message,
    });

    const saved = await this.broadcastRepo.save(message);

    // ── Reload with sender relation ──
    const withSender = await this.broadcastRepo.findOne({
      where: { id: saved.id },
      relations: ['sender', 'sender.profile'],
    });

    // ── Emit via WS ──
    const payload: BroadcastPayload = {
      id: saved.id,
      message: saved.message,
      targetRoom: saved.targetRoom,
      sender: {
        id: actor.sub,
        fullName:
          (
            withSender?.sender as
              | { profile?: { fullName?: string } }
              | undefined
          )?.profile?.fullName ?? actor.email,
        role: actor.role,
      },
      sentAt: saved.sentAt.toISOString(),
    };

    this.gateway.emitBroadcast(dto.targetRoom, payload);

    return withSender ?? saved;
  }

  /**
   * Retrieve broadcast history for catch-up after reconnect.
   * Filtered by accessible rooms based on actor role.
   */
  async getHistory(
    actor: JwtPayload,
    params: {
      room?: string;
      since?: string;
      limit?: number;
    },
  ) {
    const qb = this.broadcastRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'profile')
      .orderBy('b.sentAt', 'DESC')
      .take(Math.min(params.limit ?? 50, 100));

    // ── Room filter ──
    if (params.room) {
      this.validateRoomAccess(params.room, actor);
      qb.andWhere('b.targetRoom = :room', { room: params.room });
    } else {
      // Filter by accessible rooms
      const accessibleRooms = this.getAccessibleRooms(actor);
      qb.andWhere('b.targetRoom IN (:...rooms)', { rooms: accessibleRooms });
    }

    // ── Since filter ──
    if (params.since) {
      qb.andWhere('b.sentAt > :since', { since: new Date(params.since) });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((msg) => ({
        id: msg.id,
        targetRoom: msg.targetRoom,
        message: msg.message,
        sender: {
          id: msg.senderId,
          role: msg.senderRole,
          fullName:
            (msg.sender as { profile?: { fullName?: string } } | undefined)
              ?.profile?.fullName ?? msg.senderId,
        },
        sentAt: msg.sentAt,
      })),
      meta: { total, limit: params.limit ?? 50 },
    };
  }

  /**
   * Validate that the actor can target the specified room.
   */
  private validateRoomAccess(room: string, actor: JwtPayload): void {
    if (actor.role === Role.ADMIN) return; // Admin can target any room

    if (actor.role === Role.HEAD_NURSE) {
      // Head nurse: room:all OR own department room
      if (room === 'room:all') return;
      if (room === `room:dept:${actor.departmentId}`) return;
      throw new ForbiddenException('BROADCAST_ROOM_FORBIDDEN');
    }

    // All other roles can only read, not send
    // For history, they can read their accessible rooms
    throw new ForbiddenException('BROADCAST_ROOM_FORBIDDEN');
  }

  /**
   * Get the list of rooms accessible to the actor (for history queries).
   */
  private getAccessibleRooms(actor: JwtPayload): string[] {
    const rooms = ['room:all'];

    switch (actor.role) {
      case Role.ADMIN:
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

    if (actor.departmentId) {
      rooms.push(`room:dept:${actor.departmentId}`);
    }

    return rooms;
  }
}
