import type { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { VideoService } from '@/modules/video/video.service';
import { VideoSessionStatus } from '@clinic-platform/types';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';

interface SignalingClient extends Socket {
  data: {
    user?: JwtPayload;
    sessionId?: string;
    roomId?: string;
  };
}

/**
 * SignalingGateway — WebRTC signaling relay for telemedicine video calls.
 *
 * Namespace: /video
 *
 * Client lifecycle:
 *  1. Connect with JWT auth → validate session participant
 *  2. Server joins socket to room:session:{roomId}
 *  3. Exchange SDP offer/answer and ICE candidates
 *  4. Either party can trigger session end
 *
 * Server never processes media — only SDP/ICE/control messages.
 */
@WebSocketGateway({
  namespace: '/video',
  cors: { origin: '*' },
})
export class SignalingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SignalingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly videoService: VideoService,
  ) {}

  async afterInit(server: Server) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      const opts = {
        host,
        port,
        ...(password ? { password } : {}),
        keyPrefix: 'ws:video:',
        lazyConnect: true,
      };
      const pub = new Redis(opts);
      const sub = pub.duplicate();
      await pub.connect();
      await sub.connect();
      server.adapter(createAdapter(pub, sub));
      this.logger.log('SignalingGateway: Redis adapter attached');
    } catch (err) {
      this.logger.warn(
        `SignalingGateway: Redis unavailable, using in-memory: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async handleConnection(client: SignalingClient) {
    const token = (client.handshake.auth?.token ??
      client.handshake.headers?.authorization?.replace('Bearer ', '')) as
      | string
      | undefined;

    const sessionId = client.handshake.query?.sessionId as string | undefined;

    if (!token || !sessionId) {
      client.disconnect();
      return;
    }

    try {
      const payload: JwtPayload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.accessSecret') ?? '',
      });

      // Load and validate session
      const session = await this.videoService.findSessionById(sessionId);

      // Verify the connecting user is a participant
      const isParticipant =
        payload.sub === session.doctorUserId ||
        payload.sub === session.patientUserId ||
        payload.role === Role.ADMIN;

      if (!isParticipant) {
        client.emit('error', { code: 'NOT_PARTICIPANT' });
        client.disconnect();
        return;
      }

      // Terminal sessions cannot be joined
      if (
        session.status === VideoSessionStatus.ENDED ||
        session.status === VideoSessionStatus.MISSED ||
        session.status === VideoSessionStatus.FAILED
      ) {
        client.emit('error', {
          code: 'SESSION_TERMINATED',
          status: session.status,
        });
        client.disconnect();
        return;
      }

      // Store context on socket
      client.data.user = payload;
      client.data.sessionId = sessionId;
      client.data.roomId = session.roomId;

      // Join the signaling room
      const room = `session:${session.roomId}`;
      await client.join(room);

      // Notify other participant that a peer has joined
      client.to(room).emit('peer:joined', {
        userId: payload.sub,
        role: payload.role,
      });

      client.emit('session:ready', {
        roomId: session.roomId,
        status: session.status,
      });

      this.logger.log(
        `SignalingGateway: ${payload.sub} (${payload.role}) joined room ${room}`,
      );
    } catch (err) {
      this.logger.warn(
        `SignalingGateway: connection rejected: ${err instanceof Error ? err.message : String(err)}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: SignalingClient) {
    if (client.data.roomId) {
      const room = `session:${client.data.roomId}`;
      client.to(room).emit('peer:left', {
        userId: client.data.user?.sub,
      });
      this.logger.log(
        `SignalingGateway: ${client.data.user?.sub} disconnected from room ${room}`,
      );
    }
  }

  /* ──────── SDP Signaling ──────── */

  /**
   * Relay an SDP offer from the initiator (doctor) to the remote peer.
   */
  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: SignalingClient,
    @MessageBody() payload: { sdp: RTCSessionDescriptionInit },
  ) {
    if (!client.data.roomId) return;
    client.to(`session:${client.data.roomId}`).emit('offer', {
      sdp: payload.sdp,
      from: client.data.user?.sub,
    });
  }

  /**
   * Relay an SDP answer from the remote peer (patient) back to the initiator.
   */
  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: SignalingClient,
    @MessageBody() payload: { sdp: RTCSessionDescriptionInit },
  ) {
    if (!client.data.roomId) return;
    client.to(`session:${client.data.roomId}`).emit('answer', {
      sdp: payload.sdp,
      from: client.data.user?.sub,
    });
  }

  /**
   * Relay an ICE candidate between peers.
   */
  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: SignalingClient,
    @MessageBody() payload: { candidate: RTCIceCandidateInit },
  ) {
    if (!client.data.roomId) return;
    client.to(`session:${client.data.roomId}`).emit('ice-candidate', {
      candidate: payload.candidate,
      from: client.data.user?.sub,
    });
  }

  /* ──────── In-call chat ──────── */

  /**
   * Relay a chat message within the session room AND persist to DB.
   */
  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: SignalingClient,
    @MessageBody() payload: { message: string },
  ) {
    if (!client.data.sessionId || !client.data.user) return;

    const msg = await this.videoService.sendChatMessage(
      client.data.sessionId,
      { message: payload.message },
      client.data.user,
    );

    // Broadcast to all participants in the room (including sender for confirmation)
    this.server.to(`session:${client.data.roomId}`).emit('chat:message', {
      id: msg.id,
      senderId: msg.senderId,
      message: msg.message,
      createdAt: msg.createdAt,
    });
  }

  /* ──────── Session control ──────── */

  /**
   * Emit to all peers in the room that the session has ended.
   * Called by VideoService after a successful ENDED transition.
   */
  emitSessionEnded(roomId: string) {
    this.server.to(`session:${roomId}`).emit('session:ended');
  }

  /**
   * Emit to all peers that the session was missed (timeout).
   * Called by VideoService after MISSED transition.
   */
  emitSessionMissed(roomId: string) {
    this.server.to(`session:${roomId}`).emit('session:missed');
  }
}
