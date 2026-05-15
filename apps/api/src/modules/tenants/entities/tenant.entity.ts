/**
 * Tenant entity — central registry of all clinics on the platform.
 * Stored in the `public` schema (schema-qualified to prevent search_path ambiguity).
 * See docs/5/03-database-schema.md §2.1
 */
import { Plan } from '@/common/types/plan.enum';
import { TenantStatus } from '@/common/types/tenant-status.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tenants', schema: 'public' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 63, unique: true })
  slug: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'admin_email', length: 255 })
  adminEmail: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: TenantStatus.PENDING,
  })
  status: TenantStatus;

  @Column({ name: 'schema_name', length: 63, unique: true })
  schemaName: string;

  @Column({ name: 'stripe_customer_id', length: 100, nullable: true })
  stripeCustomerId: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: Plan.BASIC,
  })
  plan: Plan;

  @Column({ name: 'provisioned_at', type: 'timestamptz', nullable: true })
  provisionedAt: Date | null;

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
