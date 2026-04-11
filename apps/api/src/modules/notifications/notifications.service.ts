import { NotificationLog } from './entities/notification-log.entity';
import { TemplateService } from './templates/template.service';
import {
  NotificationChannel,
  NotificationStatus,
} from '@/common/types/notification.enum';
import { NotificationProducer } from '@/modules/queue/producers/notification.producer';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

export interface SendNotificationDto {
  userId: string;
  channel: NotificationChannel;
  eventType: string;
  data: Record<string, unknown>;
  recipientContact?: string;
  referenceId?: string;
  referenceType?: string;
  delay?: number;
}

export interface BookingStatusChangedEvent {
  appointmentId: string;
  patientId: string;
  patientEmail?: string;
  patientPhone?: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  fromStatus: string;
  toStatus: string;
  slot?: {
    slotDate: string;
    startTime: string;
  };
  reason?: string;
}

export interface ShiftStatusChangedEvent {
  assignmentId: string;
  staffId: string;
  staffEmail?: string;
  staffName?: string;
  fromStatus: string | null;
  toStatus: string;
  shiftDate: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly notifLogsRepo: Repository<NotificationLog>,
    private readonly templateService: TemplateService,
    private readonly producer: NotificationProducer,
  ) {}

  /* ──────── Core send method ──────── */

  async send(dto: SendNotificationDto): Promise<void> {
    try {
      // 1. Load and render template
      const rendered = await this.templateService.render(
        dto.eventType,
        dto.channel,
        dto.data,
      );

      // 2. Create notification_logs row (status = 'queued')
      const log = await this.notifLogsRepo.save({
        userId: dto.userId,
        channel: dto.channel,
        eventType: dto.eventType,
        status: NotificationStatus.QUEUED,
        referenceId: dto.referenceId ?? null,
        referenceType: dto.referenceType ?? null,
        subject: rendered.subject,
        bodyPreview: rendered.body.substring(0, 200),
      });

      // 3. Enqueue to appropriate queue
      const jobPayload = {
        logId: log.id,
        userId: dto.userId,
        channel: dto.channel,
        eventType: dto.eventType,
        renderedSubject: rendered.subject,
        renderedBody: rendered.body,
        recipientContact: dto.recipientContact,
        data: dto.data,
      };

      let job;
      switch (dto.channel) {
        case NotificationChannel.EMAIL:
          job = await this.producer.enqueueEmail(jobPayload, {
            delay: dto.delay,
          });
          break;
        case NotificationChannel.SMS:
          job = await this.producer.enqueueSms(jobPayload, {
            delay: dto.delay,
          });
          break;
        case NotificationChannel.IN_APP:
          job = await this.producer.enqueueInApp(jobPayload);
          break;
      }

      if (job) {
        await this.notifLogsRepo.update(log.id, {
          bullJobId: job.id,
        });
      }

      this.logger.log(
        `Notification enqueued: event=${dto.eventType} channel=${dto.channel} user=${dto.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue notification: event=${dto.eventType} channel=${dto.channel} user=${dto.userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /* ──────── Event listeners ──────── */

  @OnEvent('booking.status.changed')
  async handleBookingStatusChanged(
    payload: BookingStatusChangedEvent,
  ): Promise<void> {
    this.logger.log(
      `Booking status changed: ${payload.fromStatus}→${payload.toStatus} appointment=${payload.appointmentId}`,
    );

    const templateData = {
      patientName: payload.patientName ?? 'Patient',
      doctorName: payload.doctorName ?? 'Doctor',
      date: payload.slot?.slotDate ?? '',
      time: payload.slot?.startTime?.substring(0, 5) ?? '',
      reason: payload.reason ?? 'No reason provided',
      referenceId: payload.appointmentId,
      referenceType: 'appointment',
    };

    if (payload.toStatus === 'confirmed') {
      // Email + in-app confirmation to patient
      await this.send({
        userId: payload.patientId,
        channel: NotificationChannel.EMAIL,
        eventType: 'booking.confirmed',
        data: templateData,
        recipientContact: payload.patientEmail,
        referenceId: payload.appointmentId,
        referenceType: 'appointment',
      });

      await this.send({
        userId: payload.patientId,
        channel: NotificationChannel.IN_APP,
        eventType: 'booking.confirmed',
        data: templateData,
        referenceId: payload.appointmentId,
        referenceType: 'appointment',
      });

      // Schedule 24h email reminder
      if (payload.slot) {
        const ms24h = this.msUntilBefore(
          payload.slot.slotDate,
          payload.slot.startTime,
          24 * 60,
        );
        if (ms24h > 0) {
          await this.send({
            userId: payload.patientId,
            channel: NotificationChannel.EMAIL,
            eventType: 'appointment.reminder.24h',
            data: templateData,
            recipientContact: payload.patientEmail,
            referenceId: payload.appointmentId,
            referenceType: 'appointment',
            delay: ms24h,
          });
        }

        // Schedule 2h SMS reminder
        const ms2h = this.msUntilBefore(
          payload.slot.slotDate,
          payload.slot.startTime,
          2 * 60,
        );
        if (ms2h > 0 && payload.patientPhone) {
          await this.send({
            userId: payload.patientId,
            channel: NotificationChannel.SMS,
            eventType: 'appointment.reminder.2h',
            data: templateData,
            recipientContact: payload.patientPhone,
            referenceId: payload.appointmentId,
            referenceType: 'appointment',
            delay: ms2h,
          });
        }
      }
    }

    if (payload.toStatus === 'cancelled') {
      // Email + in-app cancellation to patient
      await this.send({
        userId: payload.patientId,
        channel: NotificationChannel.EMAIL,
        eventType: 'booking.cancelled',
        data: templateData,
        recipientContact: payload.patientEmail,
        referenceId: payload.appointmentId,
        referenceType: 'appointment',
      });

      await this.send({
        userId: payload.patientId,
        channel: NotificationChannel.IN_APP,
        eventType: 'booking.cancelled',
        data: templateData,
        referenceId: payload.appointmentId,
        referenceType: 'appointment',
      });
    }
  }

  @OnEvent('shift.status.changed')
  async handleShiftStatusChanged(
    payload: ShiftStatusChangedEvent,
  ): Promise<void> {
    this.logger.log(
      `Shift status changed: ${payload.fromStatus}→${payload.toStatus} assignment=${payload.assignmentId}`,
    );

    const templateData = {
      staffName: payload.staffName ?? 'Staff',
      date: payload.shiftDate,
      shiftName: payload.shiftName ?? 'Shift',
      startTime: payload.startTime ?? '',
      endTime: payload.endTime ?? '',
      referenceId: payload.assignmentId,
      referenceType: 'shift_assignment',
    };

    if (payload.toStatus === 'scheduled' && payload.fromStatus === null) {
      // New assignment — email + in-app
      await this.send({
        userId: payload.staffId,
        channel: NotificationChannel.EMAIL,
        eventType: 'shift.assigned',
        data: templateData,
        recipientContact: payload.staffEmail,
        referenceId: payload.assignmentId,
        referenceType: 'shift_assignment',
      });

      await this.send({
        userId: payload.staffId,
        channel: NotificationChannel.IN_APP,
        eventType: 'shift.assigned',
        data: templateData,
        referenceId: payload.assignmentId,
        referenceType: 'shift_assignment',
      });
    }
  }

  /* ──────── Video Session event listeners (P3) ──────── */

  @OnEvent('video.session.created')
  async handleVideoSessionCreated(payload: {
    sessionId: string;
    roomId: string;
    appointmentId: string;
    doctorUserId: string;
    patientUserId: string;
  }): Promise<void> {
    this.logger.log(
      `Video session created: session=${payload.sessionId}, notifying patient=${payload.patientUserId}`,
    );

    // In-app "call:incoming" notification to patient
    await this.send({
      userId: payload.patientUserId,
      channel: NotificationChannel.IN_APP,
      eventType: 'video.call.incoming',
      data: {
        sessionId: payload.sessionId,
        roomId: payload.roomId,
        appointmentId: payload.appointmentId,
        referenceId: payload.sessionId,
        referenceType: 'video_session',
      },
      referenceId: payload.sessionId,
      referenceType: 'video_session',
    });
  }

  @OnEvent('video.session.missed')
  async handleVideoSessionMissed(payload: {
    sessionId: string;
    doctorUserId: string;
    patientUserId: string;
  }): Promise<void> {
    this.logger.log(`Video session missed: session=${payload.sessionId}`);

    const templateData = {
      referenceId: payload.sessionId,
      referenceType: 'video_session',
      sessionId: payload.sessionId,
    };

    // Notify both doctor and patient
    await Promise.all([
      this.send({
        userId: payload.doctorUserId,
        channel: NotificationChannel.IN_APP,
        eventType: 'video.session.missed',
        data: templateData,
        referenceId: payload.sessionId,
        referenceType: 'video_session',
      }),
      this.send({
        userId: payload.patientUserId,
        channel: NotificationChannel.IN_APP,
        eventType: 'video.session.missed',
        data: templateData,
        referenceId: payload.sessionId,
        referenceType: 'video_session',
      }),
    ]);
  }

  /* ──────── Query methods ──────── */

  async getMyNotifications(
    userId: string,
    opts: { isRead?: boolean; before?: string; limit?: number },
  ) {
    const limit = Math.min(opts.limit ?? 50, 100);
    const qb = this.notifLogsRepo
      .createQueryBuilder('nl')
      .where('nl.userId = :userId', { userId })
      .andWhere('nl.channel = :channel', {
        channel: NotificationChannel.IN_APP,
      })
      .orderBy('nl.createdAt', 'DESC')
      .take(limit);

    if (opts.isRead !== undefined) {
      qb.andWhere('nl.isRead = :isRead', { isRead: opts.isRead });
    }

    if (opts.before) {
      qb.andWhere('nl.createdAt < :before', {
        before: new Date(opts.before),
      });
    }

    const [data, _total] = await qb.getManyAndCount();

    // Unread count (separate fast query)
    const unreadCount = await this.notifLogsRepo.count({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      },
    });

    return { data, meta: { unreadCount } };
  }

  async markAsRead(
    userId: string,
    ids?: string[],
    all?: boolean,
  ): Promise<number> {
    const now = new Date();

    if (all) {
      const result = await this.notifLogsRepo.update(
        {
          userId,
          channel: NotificationChannel.IN_APP,
          isRead: false,
        },
        { isRead: true, readAt: now, status: NotificationStatus.READ },
      );
      return result.affected ?? 0;
    }

    if (ids && ids.length > 0) {
      const result = await this.notifLogsRepo.update(
        {
          id: In(ids),
          userId,
          channel: NotificationChannel.IN_APP,
        },
        { isRead: true, readAt: now, status: NotificationStatus.READ },
      );
      return result.affected ?? 0;
    }

    return 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifLogsRepo.count({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      },
    });
  }

  /* ──────── Admin methods ──────── */

  async getDeliveryLogs(filters: {
    userId?: string;
    channel?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);

    const qb = this.notifLogsRepo
      .createQueryBuilder('nl')
      .orderBy('nl.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.userId) {
      qb.andWhere('nl.userId = :userId', {
        userId: filters.userId,
      });
    }
    if (filters.channel) {
      qb.andWhere('nl.channel = :channel', {
        channel: filters.channel,
      });
    }
    if (filters.status) {
      qb.andWhere('nl.status = :status', {
        status: filters.status,
      });
    }
    if (filters.from) {
      qb.andWhere('nl.createdAt >= :from', {
        from: new Date(filters.from),
      });
    }
    if (filters.to) {
      qb.andWhere('nl.createdAt <= :to', {
        to: new Date(filters.to),
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit },
    };
  }

  /* ──────── Helpers ──────── */

  private msUntilBefore(
    slotDate: string,
    startTime: string,
    minutesBefore: number,
  ): number {
    const appointmentMs = new Date(`${slotDate}T${startTime}`).getTime();
    const targetMs = appointmentMs - minutesBefore * 60 * 1000;
    return Math.max(0, targetMs - Date.now());
  }
}
