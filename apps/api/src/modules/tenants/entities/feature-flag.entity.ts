/**
 * FeatureFlag entity — per-tenant feature overrides.
 * Stored in the `public` schema.
 * See docs/5/03-database-schema.md §2.3
 */
import { Tenant } from './tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'feature_flags', schema: 'public' })
@Unique(['tenantId', 'feature'])
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 100 })
  feature: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ length: 20, default: 'plan' })
  source: string; // 'plan' | 'override'

  @Column({ name: 'overridden_by', nullable: true })
  overriddenBy: string | null; // super_admin user_id

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
