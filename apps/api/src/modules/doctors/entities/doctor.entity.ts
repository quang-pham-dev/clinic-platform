import { TimeSlot } from '@/modules/slots/entities/time-slot.entity';
import { User } from '@/modules/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 255 })
  specialty: string;

  @Column({ name: 'license_number', length: 100, nullable: true })
  licenseNumber: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({
    name: 'consultation_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  consultationFee: number;

  @Column({ name: 'is_accepting_patients', default: true })
  isAcceptingPatients: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => TimeSlot, (slot) => slot.doctor)
  timeSlots: TimeSlot[];
}
