import { Appointment } from './appointment.entity';
import { AppointmentStatus } from '@/common/types/appointment-status.enum';
import { Role } from '@/common/types/role.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('booking_audit_logs')
export class BookingAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'appointment_id' })
  appointmentId: string;

  @ManyToOne(() => Appointment, (appointment) => appointment.auditLogs)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ name: 'actor_id' })
  actorId: string;

  @Column({ name: 'actor_role', type: 'enum', enum: Role })
  actorRole: Role;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: AppointmentStatus,
    nullable: true,
  })
  fromStatus: AppointmentStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: AppointmentStatus })
  toStatus: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // No updatedAt or deletedAt — this table is append-only
}
