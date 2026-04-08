import { ShiftAssignment } from './shift-assignment.entity';
import { User } from '@/modules/users/entities/user.entity';
import { AssignmentStatus, Role } from '@clinic-platform/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('shift_audit_logs')
export class ShiftAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assignment_id' })
  assignmentId: string;

  @ManyToOne(() => ShiftAssignment, (assignment) => assignment.auditLogs)
  @JoinColumn({ name: 'assignment_id' })
  assignment: ShiftAssignment;

  @Column({ name: 'actor_id' })
  actorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ name: 'actor_role', type: 'enum', enum: Role })
  actorRole: Role;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: AssignmentStatus,
    nullable: true,
  })
  fromStatus: AssignmentStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: AssignmentStatus })
  toStatus: AssignmentStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
