/**
 * UsageSnapshot entity — monthly usage snapshots per tenant.
 * Stored in the `public` schema. Populated by BullMQ cron job.
 * See docs/5/03-database-schema.md §2.5
 */
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'usage_snapshots', schema: 'public' })
@Unique(['tenantId', 'periodStart'])
export class UsageSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: Date;

  @Column({ name: 'bookings_count', default: 0 })
  bookingsCount: number;

  @Column({ name: 'doctors_count', default: 0 })
  doctorsCount: number;

  @Column({ name: 'staff_count', default: 0 })
  staffCount: number;

  @Column({ name: 'active_patients', default: 0 })
  activePatients: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
