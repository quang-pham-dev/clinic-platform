import { CreateVideoSessionDto, SendChatMessageDto } from './dto/video.dto';
import { VideoChatMessage } from './entities/video-chat-message.entity';
import { VideoSession } from './entities/video-session.entity';
import { VideoSessionStateMachine } from './video-session-state-machine';
import { buildPaginationMeta } from '@/common/helpers/pagination.helper';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { Appointment } from '@/modules/bookings/entities/appointment.entity';
import { VideoSessionStatus } from '@clinic-platform/types';
import { AppointmentStatus } from '@clinic-platform/types';
import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';

/** Timeout before a waiting session is marked as missed (5 minutes in ms) */
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  // Forward reference to avoid circular dep: VideoService → SignalingGateway → VideoService
  private signalingGateway?: import('./signaling.gateway').SignalingGateway;

  constructor(
    @InjectRepository(VideoSession)
    private readonly sessionRepo: Repository<VideoSession>,
    @InjectRepository(VideoChatMessage)
    private readonly chatRepo: Repository<VideoChatMessage>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly stateMachine: VideoSessionStateMachine,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('video-queue')
    private readonly videoQueue: Queue,
  ) {}

  /** Called by VideoModule after bootstrap to avoid circular dep */
  setSignalingGateway(
    gw: import('./signaling.gateway').SignalingGateway,
  ): void {
    this.signalingGateway = gw;
  }

  /* ────── Create Session ────── */

  async createSession(
    dto: CreateVideoSessionDto,
    actor: JwtPayload,
  ): Promise<VideoSession> {
    // Only doctors can initiate a session
    if (actor.role !== Role.DOCTOR && actor.role !== Role.ADMIN) {
      throw new ForbiddenException({ code: 'VIDEO_SESSION_DOCTOR_ONLY' });
    }

    // Load the appointment with patient + doctor relations
    const appointment = await this.appointmentRepo.findOne({
      where: { id: dto.appointmentId },
      relations: ['doctor', 'doctor.user', 'patient', 'patient.profile'],
    });
    if (!appointment) {
      throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND' });
    }

    // Only confirmed appointments can start a video session
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictException({
        code: 'VIDEO_APPOINTMENT_NOT_CONFIRMED',
        message: `Appointment must be CONFIRMED to start a video session (current: ${appointment.status})`,
      });
    }

    // Check for existing non-terminal session for this appointment
    const existing = await this.sessionRepo.findOne({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing && !this.stateMachine.isTerminal(existing.status)) {
      throw new ConflictException({
        code: 'VIDEO_SESSION_ALREADY_EXISTS',
        message: 'An active video session already exists for this appointment',
      });
    }

    // Create the session
    const session = this.sessionRepo.create({
      appointmentId: dto.appointmentId,
      doctorUserId: appointment.doctor.userId,
      patientUserId: appointment.patientId,
      status: VideoSessionStatus.WAITING,
    });
    const saved = await this.sessionRepo.save(session);

    // Enqueue 5-minute timeout job
    const timeoutJob = await this.videoQueue.add(
      'session-timeout',
      { sessionId: saved.id },
      { delay: SESSION_TIMEOUT_MS, jobId: `timeout:${saved.id}` },
    );

    await this.sessionRepo.update(saved.id, {
      timeoutJobId: String(timeoutJob.id),
    });

    this.logger.log(
      `Video session created: id=${saved.id}, appointment=${dto.appointmentId}, timeout job=${timeoutJob.id}`,
    );

    // Emit P3 event — NotificationsService will send in-app "call:incoming" to patient
    this.eventEmitter.emit('video.session.created', {
      sessionId: saved.id,
      roomId: saved.roomId,
      appointmentId: dto.appointmentId,
      doctorUserId: saved.doctorUserId,
      patientUserId: saved.patientUserId,
    });

    return this.findSessionById(saved.id);
  }

  /* ────── Join Session ────── */

  async joinSession(
    sessionId: string,
    actor: JwtPayload,
  ): Promise<VideoSession> {
    const session = await this.findSessionById(sessionId);

    // Only the patient or doctor of the session can join
    if (
      actor.sub !== session.doctorUserId &&
      actor.sub !== session.patientUserId &&
      actor.role !== Role.ADMIN
    ) {
      throw new ForbiddenException({ code: 'VIDEO_SESSION_NOT_PARTICIPANT' });
    }

    if (session.status !== VideoSessionStatus.WAITING) {
      throw new ConflictException({
        code: 'VIDEO_SESSION_NOT_WAITING',
        message: `Cannot join — session is already "${session.status}"`,
      });
    }

    // Transition to ACTIVE
    this.stateMachine.validate(session.status, VideoSessionStatus.ACTIVE);

    // Cancel the timeout job
    if (session.timeoutJobId) {
      const job = await this.videoQueue.getJob(session.timeoutJobId);
      await job?.remove();
    }

    await this.sessionRepo.update(sessionId, {
      status: VideoSessionStatus.ACTIVE,
      startedAt: new Date(),
      timeoutJobId: null,
    });

    this.logger.log(
      `Video session ACTIVE: id=${sessionId}, joiner=${actor.sub}`,
    );
    return this.findSessionById(sessionId);
  }

  /* ────── End Session ────── */

  async endSession(
    sessionId: string,
    actor: JwtPayload,
  ): Promise<VideoSession> {
    const session = await this.findSessionById(sessionId);

    this.stateMachine.validate(
      session.status,
      VideoSessionStatus.ENDED,
      actor.role,
    );

    await this.sessionRepo.update(sessionId, {
      status: VideoSessionStatus.ENDED,
      endedAt: new Date(),
    });

    this.logger.log(`Video session ENDED: id=${sessionId}, actor=${actor.sub}`);

    // Notify WS clients in the signaling room
    const fullSession = await this.findSessionById(sessionId);
    this.signalingGateway?.emitSessionEnded(fullSession.roomId);

    this.eventEmitter.emit('video.session.ended', {
      sessionId,
      doctorUserId: session.doctorUserId,
      patientUserId: session.patientUserId,
    });

    return this.findSessionById(sessionId);
  }

  /* ────── Mark as Missed (called by VideoWorker) ────── */

  async markMissed(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) return;

    // Idempotent — only act if still waiting
    if (session.status !== VideoSessionStatus.WAITING) return;

    await this.sessionRepo.update(sessionId, {
      status: VideoSessionStatus.MISSED,
      endedAt: new Date(),
      timeoutJobId: null,
    });

    this.logger.log(`Video session MISSED (timeout): id=${sessionId}`);

    // Notify WS clients in the signaling room
    this.signalingGateway?.emitSessionMissed(session.roomId);

    this.eventEmitter.emit('video.session.missed', {
      sessionId,
      doctorUserId: session.doctorUserId,
      patientUserId: session.patientUserId,
    });
  }

  /* ────── Get ICE Config ────── */

  getIceConfig() {
    // Returns STUN servers; TURN credentials can be added here (Twilio NTS)
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
  }

  /* ────── Chat Messages ────── */

  async sendChatMessage(
    sessionId: string,
    dto: SendChatMessageDto,
    actor: JwtPayload,
  ): Promise<VideoChatMessage> {
    const session = await this.findSessionById(sessionId);

    if (
      actor.sub !== session.doctorUserId &&
      actor.sub !== session.patientUserId
    ) {
      throw new ForbiddenException({ code: 'VIDEO_CHAT_NOT_PARTICIPANT' });
    }

    if (session.status !== VideoSessionStatus.ACTIVE) {
      throw new ConflictException({
        code: 'VIDEO_CHAT_SESSION_NOT_ACTIVE',
        message: 'Can only send chat messages in an active session',
      });
    }

    const msg = this.chatRepo.create({
      sessionId,
      senderId: actor.sub,
      message: dto.message,
    });
    return this.chatRepo.save(msg);
  }

  async getChatMessages(
    sessionId: string,
    actor: JwtPayload,
  ): Promise<VideoChatMessage[]> {
    const session = await this.findSessionById(sessionId);

    if (
      actor.sub !== session.doctorUserId &&
      actor.sub !== session.patientUserId &&
      actor.role !== Role.ADMIN
    ) {
      throw new ForbiddenException({ code: 'VIDEO_CHAT_NOT_PARTICIPANT' });
    }

    return this.chatRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      relations: ['sender', 'sender.profile'],
    });
  }

  /* ────── Query ────── */

  async findAll(
    filters: {
      status?: string;
      doctorUserId?: string;
      patientUserId?: string;
      page?: number;
      limit?: number;
    },
    actor: JwtPayload,
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.sessionRepo
      .createQueryBuilder('vs')
      .leftJoinAndSelect('vs.appointment', 'appt')
      .leftJoinAndSelect('vs.doctor', 'doctor')
      .leftJoinAndSelect('doctor.profile', 'doctorProfile')
      .leftJoinAndSelect('vs.patient', 'patient')
      .leftJoinAndSelect('patient.profile', 'patientProfile')
      .orderBy('vs.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Role-scoped visibility
    if (actor.role === Role.DOCTOR) {
      qb.andWhere('vs.doctorUserId = :uid', { uid: actor.sub });
    } else if (actor.role === Role.PATIENT) {
      qb.andWhere('vs.patientUserId = :uid', { uid: actor.sub });
    }

    if (filters.status) {
      qb.andWhere('vs.status = :status', { status: filters.status });
    }
    if (filters.doctorUserId && actor.role === Role.ADMIN) {
      qb.andWhere('vs.doctorUserId = :did', { did: filters.doctorUserId });
    }
    if (filters.patientUserId && actor.role === Role.ADMIN) {
      qb.andWhere('vs.patientUserId = :pid', { pid: filters.patientUserId });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findByAppointment(
    appointmentId: string,
    actor: JwtPayload,
  ): Promise<VideoSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { appointmentId },
      relations: [
        'appointment',
        'doctor',
        'doctor.profile',
        'patient',
        'patient.profile',
      ],
    });

    if (!session) return null;

    // Visibility check
    if (
      actor.role !== Role.ADMIN &&
      actor.sub !== session.doctorUserId &&
      actor.sub !== session.patientUserId
    ) {
      throw new ForbiddenException({ code: 'VIDEO_SESSION_NOT_PARTICIPANT' });
    }

    return session;
  }

  /* ────── Internal helpers ────── */

  async findSessionById(id: string): Promise<VideoSession> {
    const session = await this.sessionRepo.findOne({
      where: { id },
      relations: [
        'appointment',
        'doctor',
        'doctor.profile',
        'patient',
        'patient.profile',
      ],
    });
    if (!session) {
      throw new NotFoundException({ code: 'VIDEO_SESSION_NOT_FOUND' });
    }
    return session;
  }
}
