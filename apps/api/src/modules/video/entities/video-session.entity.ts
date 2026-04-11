import { VideoChatMessage } from './video-chat-message.entity';
import { Appointment } from '@/modules/bookings/entities/appointment.entity';
import { User } from '@/modules/users/entities/user.entity';
import { VideoSessionStatus } from '@clinic-platform/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('video_sessions')
export class VideoSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** One appointment can have at most one non-terminal video session */
  @Column({ name: 'appointment_id', unique: true })
  appointmentId: string;

  @OneToOne(() => Appointment)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  /** Shared room identifier used by WebRTC signaling gateway */
  @Column({ name: 'room_id', type: 'uuid', unique: true, generated: 'uuid' })
  roomId: string;

  @Column({ name: 'doctor_user_id' })
  doctorUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'doctor_user_id' })
  doctor: User;

  @Column({ name: 'patient_user_id' })
  patientUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patient_user_id' })
  patient: User;

  @Column({
    type: 'enum',
    enum: VideoSessionStatus,
    default: VideoSessionStatus.WAITING,
  })
  status: VideoSessionStatus;

  /**
   * BullMQ job ID for the 5-minute timeout job.
   * Stored so we can cancel it if the session becomes active.
   */
  @Column({ name: 'timeout_job_id', type: 'varchar', nullable: true })
  timeoutJobId: string | null;

  /** Timestamp when status first moved to ACTIVE */
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  /** Timestamp when session moved to ENDED / MISSED / FAILED */
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => VideoChatMessage, (msg) => msg.session)
  chatMessages: VideoChatMessage[];
}
