import { Doctor } from '@/modules/doctors/entities/doctor.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('time_slots')
export class TimeSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.timeSlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'slot_date', type: 'date' })
  slotDate: Date;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
