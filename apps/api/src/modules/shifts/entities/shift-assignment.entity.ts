import { ShiftAuditLog } from './shift-audit-log.entity';
import { ShiftTemplate } from './shift-template.entity';
import { Department } from '@/modules/departments/entities/department.entity';
import { User } from '@/modules/users/entities/user.entity';
import { AssignmentStatus } from '@clinic-platform/types';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('shift_assignments')
@Index(['departmentId', 'shiftDate'])
@Index(['staffId', 'shiftDate'])
export class ShiftAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'staff_id' })
  staffId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'staff_id' })
  staff: User;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => ShiftTemplate)
  @JoinColumn({ name: 'template_id' })
  template: ShiftTemplate;

  @Column({ name: 'department_id' })
  departmentId: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: string;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.SCHEDULED,
  })
  status: AssignmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;

  @OneToMany(() => ShiftAuditLog, (log) => log.assignment)
  auditLogs: ShiftAuditLog[];
}
