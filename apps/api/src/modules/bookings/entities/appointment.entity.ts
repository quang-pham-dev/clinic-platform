import { AppointmentStatus } from '../../../common/types/appointment-status.enum';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { TimeSlot } from '../../slots/entities/time-slot.entity';
import { User } from '../../users/entities/user.entity';
import { BookingAuditLog } from './booking-audit-log.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id' })
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @ManyToOne(() => Doctor)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'slot_id' })
  slotId: string;

  @OneToOne(() => TimeSlot)
  @JoinColumn({ name: 'slot_id' })
  slot: TimeSlot;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'video_session_id', type: 'uuid', nullable: true })
  videoSessionId: string | null;

  @Column({
    name: 'email_reminder_job_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  emailReminderJobId: string | null;

  @Column({
    name: 'sms_reminder_job_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  smsReminderJobId: string | null;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;

  @OneToMany(() => BookingAuditLog, (log) => log.appointment)
  auditLogs: BookingAuditLog[];
}
